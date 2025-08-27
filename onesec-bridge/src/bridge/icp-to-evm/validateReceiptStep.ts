import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { About, EvmChain, StepStatus, Token } from "../../types";
import {
  amountFromUnits,
  BaseStep,
  err,
  exponentialBackoff,
  format,
  formatTx,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../shared";
import { TransferStep } from "./transferStep";

export class ValidateReceiptStep extends BaseStep {
  constructor(
    private oneSecActor: OneSec,
    private token: Token,
    private evmChain: EvmChain,
    private evmAddress: string,
    private decimals: number,
    private transferStep: TransferStep,
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
    const transferId = this.transferStep.getTransferId();

    if (transferId === undefined) {
      throw Error(
        "Missing transfer id. Please run the transfer step before running this step.",
      );
    }

    this._status = {
      Pending: {
        concise: "Validating transaction receipt",
        verbose: "Waiting for OneSec to validate the receipt of the transaction",
      },
    };

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const result = await this.oneSecActor.get_transfer(transferId);

    if ("Err" in result) {
      this._status = {
        Done: err({
          concise: "Failed to validate transaction receipt",
          verbose: `OneSec failed to validate the receipt of the transaction: ${result.Err}`,
        }),
      };
      return this._status;
    }

    const transfer = fromCandid.transfer(result.Ok);

    if (transfer.status) {
      if ("Succeeded" in transfer.status) {
        this._status = {
          Done: ok({
            concise: "Validated transaction receipt",
            verbose: `OneSec validated the receipt of transaction ${formatTx(transfer.destination.tx)}: ${format(transfer.destination.amount, this.decimals)} ${this.token} have been sent to ${this.evmAddress} on ${this.evmChain}`,
            transaction: transfer.destination.tx,
            amount: amountFromUnits(transfer.destination.amount, this.decimals),
          }),
        };
      } else if ("Failed" in transfer.status) {
        this._status = {
          Done: err({
            concise: "Failed to validate transaction receipt",
            verbose: `OneSec failed to validate the receipt of the transaction: ${transfer.status.Failed.error}`,
          }),
        };
      } else if (
        "Refunded" in transfer.status ||
        "PendingRefund" in transfer.status
      ) {
        throw Error(
          `Unexpected transfer status of ${transferId}: ${transfer.status}`,
        );
      }
    }

    return this._status;
  }
}
