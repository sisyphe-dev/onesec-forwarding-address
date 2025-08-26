import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { About, StepStatus } from "../../types";
import {
  BaseStep,
  err,
  exponentialBackoff,
  GetTransferId,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../shared";

export class WaitForIcpTx extends BaseStep {
  constructor(
    private oneSecActor: OneSec,
    private getTransferId: GetTransferId,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Wait for ledger transaction",
      verbose: "Wait for OneSec to call the ledger",
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        concise: "Waiting for ledger transaction",
        verbose: "Waiting for OneSec to call the ledger",
      },
    };

    const transferId = this.getTransferId.getTransferId();

    if (transferId === undefined) {
      throw Error("Missing receipt validation step");
    }

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const result = await this.oneSecActor.get_transfer(transferId);

    if ("Err" in result) {
      this._status = {
        Done: err({
          concise: "Transaction failed",
          verbose: `Ledger transaction failed: ${result.Err}`,
        }),
      };
      return this._status;
    }

    const transfer = fromCandid.transfer(result.Ok);

    if (transfer.status) {
      if ("Succeeded" in transfer.status) {
        this._status = {
          Done: ok({
            concise: "Executed transaction",
            verbose: "Executed ledger transaction",
            transaction: transfer.destination.tx,
          }),
        };
        return this._status;
      } else if ("Failed" in transfer.status) {
        this._status = {
          Done: err({
            concise: "Transaction failed",
            verbose: `Ledger transaction failed: ${transfer.status.Failed.error}`,
          }),
        };
        return this._status;
      } else if ("Refunded" in transfer.status) {
        this._status = {
          Done: ok({
            concise: "Refunded tokens",
            verbose: "Refunded tokens due to a bridging issue",
            transaction: transfer.source.tx,
          }),
        };
        return this._status;
      } else if ("PendingRefund" in transfer.status) {
        this._status = {
          Pending: {
            concise: "Refunding tokens",
            verbose: "Refunding tokens due to a bridging issue",
          },
        };
      }
    }

    return this._status;
  }
}
