import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { About, EvmChain, StepStatus, Token, TransferId } from "../../types";
import {
  amountFromUnits,
  exponentialBackoff,
  format,
  formatTx,
  sleep,
} from "../../utils";
import { BaseStep } from "../baseStep";
import { ICP_CALL_DURATION_MS } from "../shared";

/**
 * Variant of {@link ValidateReceiptStep} that accepts a {@link TransferId}
 * directly, enabling resumption of a bridging flow without re-running earlier
 * steps.
 */
export class ResumeValidateReceiptStep extends BaseStep {
  constructor(
    private oneSecActor: OneSec,
    private token: Token,
    private evmChain: EvmChain,
    private evmAddress: string,
    private decimals: number,
    private transferId: TransferId,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Validate transaction receipt",
      verbose: "Wait for OneSec to validate the receipt of the transaction",
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    if (!this.canRun()) {
      return this._status;
    }

    this._status = {
      state: "running",
      concise: "waiting",
      verbose: "waiting",
    };

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const result = await this.oneSecActor.get_transfer(this.transferId);

    if ("Err" in result) {
      this._status = {
        state: "failed",
        concise: "failed to validate transaction receipt",
        verbose: `failed to validate transaction receipt: ${result.Err}`,
      };
      return this._status;
    }

    const transfer = fromCandid.transfer(result.Ok);

    if (transfer.status) {
      if ("Succeeded" in transfer.status) {
        this._status = {
          state: "succeeded",
          concise: "done",
          verbose: `validated that transaction ${formatTx(transfer.destination.tx)} has sent ${format(transfer.destination.amount, this.decimals)} ${this.token} to ${this.evmAddress} on ${this.evmChain}`,
          transaction: transfer.destination.tx,
          amount: amountFromUnits(transfer.destination.amount, this.decimals),
        };
      } else if ("Failed" in transfer.status) {
        this._status = {
          state: "failed",
          concise: "failed to validate transaction receipt",
          verbose: `failed to validate transaction receipt: ${transfer.status.Failed.error}`,
        };
      } else if (
        "Refunded" in transfer.status ||
        "PendingRefund" in transfer.status
      ) {
        throw Error(
          `Unexpected transfer status of ${this.transferId.id}: ${JSON.stringify(transfer.status)}`,
        );
      }
    }

    return this._status;
  }
}
