import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { Details, StepStatus } from "../../types";
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
  private delayMs: number = 1_000;

  constructor(
    private oneSecActor: OneSec,
    private getTransferId: GetTransferId,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Wait for ledger transaction",
      description: "Wait for OneSec to call the ledger",
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: "Waiting for ledger transaction",
        description: "Waiting for OneSec to call the ledger",
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
          summary: "Transaction failed",
          description: `Ledger transaction failed: ${result.Err}`,
        }),
      };
      return this._status;
    }

    const transfer = fromCandid.transfer(result.Ok);

    if (transfer.status) {
      if ("Succeeded" in transfer.status) {
        this._status = {
          Done: ok({
            summary: "Executed transaction",
            description: "Executed ledger transaction",
            transaction: transfer.destination.tx,
          }),
        };
        return this._status;
      } else if ("Failed" in transfer.status) {
        this._status = {
          Done: err({
            summary: "Transaction failed",
            description: `Ledger transaction failed: ${transfer.status.Failed.error}`,
          }),
        };
        return this._status;
      } else if ("Refunded" in transfer.status) {
        this._status = {
          Done: ok({
            summary: "Refunded tokens",
            description: "Refunded tokens due to a bridging issue",
            transaction: transfer.source.tx,
          }),
        };
        return this._status;
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
