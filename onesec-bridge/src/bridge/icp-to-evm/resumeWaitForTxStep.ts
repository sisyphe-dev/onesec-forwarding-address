import * as fromCandid from "../../fromCandid";
import {
  TraceEvent,
  type _SERVICE as OneSec,
} from "../../generated/candid/onesec/onesec.did";
import type {
  About,
  EvmChain,
  IcrcAccount,
  StepStatus,
  Token,
  TransferId,
} from "../../types";
import {
  exponentialBackoff,
  formatIcpAccount,
  formatTx,
  sleep,
} from "../../utils";
import { BaseStep } from "../baseStep";
import { ICP_CALL_DURATION_MS } from "../shared";

type TxStatus = "unknown" | "signed" | "sent" | "executed";

/**
 * Variant of {@link WaitForTxStep} that accepts a {@link TransferId} directly,
 * enabling resumption of a bridging flow without re-running earlier steps.
 */
export class ResumeWaitForTxStep extends BaseStep {
  private txStatus: TxStatus = "unknown";

  constructor(
    private oneSecActor: OneSec,
    private token: Token,
    private icpAccount: IcrcAccount | undefined,
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
      concise: `Wait for transaction on ${this.evmChain}`,
      verbose: `Wait for OneSec to sign and submit a transaction to send ${this.token} to ${this.evmAddress} on ${this.evmChain}`,
    };
  }

  expectedDurationMs(): number {
    return 3 * ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    if (!this.canRun()) {
      return this._status;
    }

    if (this._status.state === "planned") {
      this._status = {
        state: "running",
        concise: "running",
        verbose: "calling get_transfer of OneSec to query transfer status",
      };
    }

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const result = await this.oneSecActor.get_transfer(this.transferId);

    if ("Err" in result) {
      throw Error(
        `Failed to request the status of transfer ${this.transferId.id}: ${result.Err}`,
      );
    }

    const transfer = fromCandid.transfer(result.Ok);

    if (transfer.status) {
      if ("Succeeded" in transfer.status) {
        this._status = {
          state: "succeeded",
          concise: "done",
          verbose: "executed transaction",
        };
      } else if ("Failed" in transfer.status) {
        this._status = {
          state: "failed",
          concise: "transaction failed",
          verbose: `transaction failed: ${transfer.status.Failed.error}`,
        };
      } else if ("Refunded" in transfer.status) {
        const accountStr = this.icpAccount
          ? formatIcpAccount(this.icpAccount)
          : "sender";
        this._status = {
          state: "refunded",
          concise: "refunded tokens on ICP",
          verbose: `refunded ${this.token} to ${accountStr} on ICP due to insufficient tokens on ${this.evmChain}: ${formatTx(transfer.source.tx)}`,
          transaction: transfer.source.tx,
        };
      } else if ("PendingRefund" in transfer.status) {
        const accountStr = this.icpAccount
          ? formatIcpAccount(this.icpAccount)
          : "sender";
        this._status = {
          state: "running",
          concise: "refunding tokens on ICP",
          verbose: `refunding ${this.token} to ${accountStr} on ICP due to insufficient tokens on ${this.evmChain}: ${formatTx(transfer.source.tx)}`,
        };
      } else if ("PendingDestinationTx" in transfer.status) {
        for (let entry of result.Ok.trace.entries) {
          if (entry.chain[0] && this.evmChain in entry.chain[0]) {
            if (entry.result[0] && "Ok" in entry.result[0]) {
              const event = entry.event[0];
              if (event === undefined) {
                continue;
              }
              const ts = traceEventToTxStatus(event);
              if (order(this.txStatus) < order(ts)) {
                this.txStatus = ts;
                const status = txStatus(ts);
                if (status) {
                  this._status = status;
                }
              }
            }
          }
        }
      }
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

function txStatus(ts: TxStatus): StepStatus | undefined {
  switch (ts) {
    case "unknown":
      return undefined;
    case "signed":
      return {
        state: "running",
        concise: `signed transaction`,
        verbose: `signed transaction`,
      };
    case "sent":
      return {
        state: "running",
        concise: `sent transaction`,
        verbose: `sent transaction`,
      };
    case "executed":
      return {
        state: "succeeded",
        concise: `executed transaction`,
        verbose: `executed transaction`,
      };
  }
}
