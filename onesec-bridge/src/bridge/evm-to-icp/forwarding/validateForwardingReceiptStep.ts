import type {
  About,
  EvmChain,
  IcrcAccount,
  OneSecForwarding,
  StepStatus,
  Token,
  TransferId,
} from "../../../types";
import {
  BaseStep,
  err,
  exponentialBackoff,
  GetTransferId,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../../shared";
import { ComputeForwardingAddressStep } from "./computeForwardingAddressStep";

export class ValidateForwardingReceiptStep
  extends BaseStep
  implements GetTransferId
{
  private transferId?: TransferId;

  constructor(
    private onesec: OneSecForwarding,
    private token: Token,
    private icpAccount: IcrcAccount,
    private evmChain: EvmChain,
    private computeForwardingAddressStep: ComputeForwardingAddressStep,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Validate receipt",
      verbose: `Wait for OneSec to validate the receipt of the ${this.evmChain} transaction`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  getTransferId(): TransferId | undefined {
    return this.transferId;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: "Validating receipt",
        description: `Waiting for OneSec to validate the receipt of the ${this.evmChain} transaction`,
      },
    };

    const forwardingAddress =
      this.computeForwardingAddressStep.getForwardingAddress();
    const lastTransferId =
      this.computeForwardingAddressStep.getLastTransferId();

    if (forwardingAddress === undefined) {
      this._status = {
        Done: err({
          concise: "Missing forwarding address",
          verbose: "Compute forwarding address step must run before this step",
        }),
      };
      return this._status;
    }

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const response = await this.onesec.getForwardingStatus(
      this.token,
      this.evmChain,
      forwardingAddress,
      this.icpAccount,
    );

    const transferId = response.done;

    if (
      lastTransferId === undefined ||
      (transferId && transferId > lastTransferId)
    ) {
      this.transferId = transferId;
      this._status = {
        Done: ok({
          summary: "Validated receipt",
          description: `Validated receipt of the ${this.evmChain} transaction`,
        }),
      };
      return this._status;
    }

    return this._status;
  }
}
