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
  exponentialBackoff,
  GetTransferId,
  ICP_CALL_DURATION_MS,
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
      concise: "Validate transaction receipt",
      verbose: `Wait for OneSec to validate transaction receipt`,
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
      throw Error(
        "Missing forwarding address. Please compute the forwarding address before running this step.",
      );
    }

    this._status = {
      state: "running",
      concise: "querying",
      verbose: "calling get_forwarding_status of OneSec",
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
      transferId !== undefined &&
      (lastTransferId === undefined || transferId > lastTransferId)
    ) {
      this.transferId = transferId;
      this._status = {
        state: "succeeded",
        concise: "done",
        verbose: `validated transaction receipt and assigned transfer-id ${this.transferId.id}`,
      };
      return this._status;
    }

    return this._status;
  }
}
