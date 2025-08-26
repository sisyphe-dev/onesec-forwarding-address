import * as fromCandid from "../../fromCandid";
import {
  TraceEvent,
  type _SERVICE as OneSec,
} from "../../generated/candid/onesec/onesec.did";
import type { Details, EvmChain, StepStatus } from "../../types";
import { BaseStep, err, ICP_CALL_DURATION_MS, ok, sleep } from "../shared";
import { TransferStep } from "./transferStep";

type TxStatus = "unknown" | "signed" | "sent" | "executed";

export class WaitForTxStep extends BaseStep {
  private delayMs: number = 1_000;
  private txStatus: TxStatus = "unknown";

  constructor(
    private oneSecActor: OneSec,
    private evmChain: EvmChain,
    private transferStep: TransferStep,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Wait for transaction",
      description: `Wait for OneSec to submit a transaction on ${this.evmChain}`,
    };
  }

  expectedDurationMs(): number {
    // At least three calls are needed:
    // - sign transaction
    // - send transaction
    // - get transfer
    return 3 * ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: "Waiting for transaction",
        description: `Waiting for OneSec to submit a transaction on ${this.evmChain}`,
      },
    };

    const transferId = this.transferStep.getTransferId();

    if (transferId === undefined) {
      this._status = {
        Done: err({
          summary: "Missing the transfer step",
          description:
            "The transfer step must succeed before running this step",
        }),
      };
      return this._status;
    }

    try {
      const maxDelayMs = 10_000;
      await sleep(this.delayMs);
      this.delayMs = Math.min(maxDelayMs, this.delayMs * 1.2); // Exponential backoff

      const result = await this.oneSecActor.get_transfer(transferId);

      if ("Err" in result) {
        this._status = {
          Done: err({
            summary: "Transaction failed",
            description: `Transaction failed: ${result.Err}`,
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
              description: `Executed transaction on ${this.evmChain}`,
              transaction: transfer.destination.tx,
            }),
          };
          return this._status;
        } else if ("Failed" in transfer.status) {
          this._status = {
            Done: err({
              summary: "Transaction failed",
              description: `Transaction failed: ${transfer.status.Failed.error}`,
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
        } else if ("PendingDestinationTx" in transfer.status) {
          for (let entry of result.Ok.trace.entries) {
            if (this.evmChain in entry.chain) {
              if (entry.result[0] && "Ok" in entry.result[0]) {
                const event = entry.event[0];
                if (event === undefined) {
                  continue;
                }
                const ts = traceEventToTxStatus(event);
                if (order(this.txStatus) < order(ts)) {
                  this.txStatus = ts;
                  this._status = {
                    Pending: txStatusDetails(ts, this.evmChain),
                  };
                }
              }
            }
          }
        }
      }
    } catch (error) {
      this._status = {
        Done: err({
          summary: "Transaction failed",
          description: `Transaction failed: ${error}`,
        }),
      };
    }

    return this._status;
  }
}

function order(ts: TxStatus) {
  switch (ts) {
    case "unknown":
      return 0;
    case "signed":
      return 1;
    case "sent":
      return 2;
    case "executed":
      return 3;
  }
}

function traceEventToTxStatus(event: TraceEvent): TxStatus {
  switch (true) {
    case "SignTx" in event:
      return "signed";
    case "SendTx" in event:
      return "sent";
    case "ConfirmTx" in event:
      return "executed";
    case "PendingConfirmTx" in event:
      return "executed";
    case "FetchTx" in event:
      return "unknown";
  }
  return "unknown";
}

function txStatusDetails(ts: TxStatus, evmChain: EvmChain): Details {
  switch (ts) {
    case "unknown":
      return {
        summary: "Waiting for transaction",
        description: `Waiting for OneSec to submit a transaction on ${evmChain}`,
      };
    case "signed":
      return {
        summary: "Signing transaction",
        description: `Signing transaction on ${evmChain}`,
      };
    case "sent":
      return {
        summary: "Sending transaction",
        description: `Sending transaction on ${evmChain}`,
      };
    case "executed":
      return {
        summary: "Executed transaction",
        description: `Executed transaction on ${evmChain}`,
      };
  }
}
