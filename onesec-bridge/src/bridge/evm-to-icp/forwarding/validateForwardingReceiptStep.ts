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
  formatIcpAccount,
  GetTransferId,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../../shared";
import { ComputeForwardingAddressStep } from "./computeForwardingAddressStep";

export class ValidateForwardingReceiptStep
  extends BaseStep
  implements GetTransferId {
  private transferId?: TransferId;

  constructor(
    private onesec: OneSecForwarding,
    private token: Token,
    private evmChain: EvmChain,
    private icpAccount: IcrcAccount,
    private computeForwardingAddressStep: ComputeForwardingAddressStep,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Validate forwarding transaction receipt",
      verbose: `Wait for OneSec to validate the receipt of the forwarding transaction on ${this.evmChain} and initiate transfer to ${formatIcpAccount(this.icpAccount)} on ICP`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  getTransferId(): TransferId | undefined {
    return this.transferId;
  }

  async run(): Promise<StepStatus> {
    const forwardingAddress =
      this.computeForwardingAddressStep.getForwardingAddress();
    const lastTransferId =
      this.computeForwardingAddressStep.getLastTransferId();

    if (forwardingAddress === undefined) {
      throw Error("Missing forwarding address. Please compute the forwarding address before running this step.");
    }

    this._status = {
      Pending: {
        concise: "Validating forwarding transaction receipt",
        verbose: `Waiting for OneSec to validate the receipt of the forwarding transaction on ${this.evmChain} and initiate transfer to ${formatIcpAccount(this.icpAccount)} on ICP`,
      },
    };

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
          concise: "Validated forwarding transaction receipt",
          verbose: `OneSec validated the receipt of the forwarding transaction on ${this.evmChain} and initiated transfer to ${formatIcpAccount(this.icpAccount)} on ICP: ${transferId}`,
        }),
      };
      return this._status;
    }

    return this._status;
  }
}
