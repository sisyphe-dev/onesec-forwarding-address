import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { Details, EvmChain, StepStatus } from "../../types";
import { BaseStep, err, ICP_CALL_DURATION_MS, ok, sleep } from "../shared";
import { TransferStep } from "./transferStep";

export class ValidateReceiptStep extends BaseStep {
  private delayMs: number = 1_000;

  constructor(
    private oneSecActor: OneSec,
    private evmChain: EvmChain,
    private transferStep: TransferStep,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Validate receipt",
      description: `Wait for OneSec to validate the receipt of ${this.evmChain} transaction`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: "Validating receipt",
        description: `Waiting for OneSec to validate the receipt of ${this.evmChain} transaction`,
      },
    };

    const transferId = this.transferStep.getTransferId();

    if (transferId === undefined) {
      throw Error("Missing transfer step");
    }

    const maxDelayMs = 10_000;
    await sleep(this.delayMs);
    this.delayMs = Math.min(maxDelayMs, this.delayMs * 1.2); // Exponential backoff

    const result = await this.oneSecActor.get_transfer(transferId);

    if ("Err" in result) {
      this._status = {
        Done: err({
          summary: "Validation failed",
          description: `Validation failed: ${result.Err}`,
        }),
      };
      return this._status;
    }

    const transfer = fromCandid.transfer(result.Ok);

    if (transfer.status) {
      if ("Succeeded" in transfer.status) {
        this._status = {
          Done: ok({
            summary: "Validated receipt",
            description: `Validated receipt of the ${this.evmChain} transaction`,
            transaction: transfer.destination.tx,
          }),
        };
      } else if ("Failed" in transfer.status) {
        this._status = {
          Done: err({
            summary: "Validation failed",
            description: `Validation failed: ${transfer.status.Failed.error}`,
          }),
        };
      } else if ("Refunded" in transfer.status) {
        this._status = {
          Done: ok({
            summary: "Refunded tokens",
            description: "Refunded tokens due to a bridging issue",
            transaction: transfer.source.tx,
          }),
        };
      } else if ("PendingRefund" in transfer.status) {
        this._status = {
          Pending: {
            summary: "Refunding tokens",
            description: "Refunding tokens due to a bridging issue",
          },
        };
      }
    }

    return this._status;
  }
}
