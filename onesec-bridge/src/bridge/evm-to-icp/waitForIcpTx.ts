import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { About, IcrcAccount, StepStatus, Token } from "../../types";
import {
  amountFromUnits,
  BaseStep,
  exponentialBackoff,
  format,
  formatIcpAccount,
  GetTransferId,
  ICP_CALL_DURATION_MS,
  sleep,
} from "../shared";

export class WaitForIcpTx extends BaseStep {
  constructor(
    private oneSecActor: OneSec,
    private token: Token,
    private icpAccount: IcrcAccount,
    private decimals: number,
    private getTransferId: GetTransferId,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Wait for transfer on ICP",
      verbose: `Wait for OneSec to transfer ${this.token} to ${formatIcpAccount(this.icpAccount)} on ICP`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    const transferId = this.getTransferId.getTransferId();

    if (transferId === undefined) {
      throw Error(
        "Missing transfer id. Please run the receipt validation step before running this step.",
      );
    }

    this._status = {
      state: "running",
      concise: "running",
      verbose: `calling get_transfer of OneSec to query the state of transfer ${transferId}`,
    };

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const result = await this.oneSecActor.get_transfer(transferId);

    if ("Err" in result) {
      this._status = {
        state: "failed",
        concise: "transfer failed",
        verbose: `transfer failed: ${result.Err}`,
      };
      return this._status;
    }

    const transfer = fromCandid.transfer(result.Ok);

    if (transfer.status) {
      if ("Succeeded" in transfer.status) {
        this._status = {
          state: "succeeded",
          concise: "done",
          verbose: `transferred ${format(transfer.destination.amount, this.decimals)} ${this.token} to ${formatIcpAccount(this.icpAccount)} on ICP`,
          transaction: transfer.destination.tx,
          amount: amountFromUnits(transfer.destination.amount, this.decimals),
        };
      } else if ("Failed" in transfer.status) {
        this._status = {
          state: "failed",
          concise: "transfer failed",
          verbose: `transfer failed: ${transfer.status.Failed.error}`,
        };
      } else if (
        "Refunded" in transfer.status ||
        "PendingRefund" in transfer.status
      ) {
        throw Error(`Unexpected transfer status: ${transfer.status}`);
      }
    }

    return this._status;
  }
}
