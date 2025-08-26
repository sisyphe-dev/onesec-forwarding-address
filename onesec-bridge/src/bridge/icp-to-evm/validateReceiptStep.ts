import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { About, EvmChain, StepStatus } from "../../types";
import {
  BaseStep,
  err,
  exponentialBackoff,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../shared";
import { TransferStep } from "./transferStep";

export class ValidateReceiptStep extends BaseStep {
  constructor(
    private oneSecActor: OneSec,
    private evmChain: EvmChain,
    private transferStep: TransferStep,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Validate receipt",
      verbose: `Wait for OneSec to validate the receipt of ${this.evmChain} transaction`,
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

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const result = await this.oneSecActor.get_transfer(transferId);

    if ("Err" in result) {
      this._status = {
        Done: err({
          concise: "Validation failed",
          verbose: `Validation failed: ${result.Err}`,
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
            concise: "Validation failed",
            verbose: `Validation failed: ${transfer.status.Failed.error}`,
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
