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
} from "../../types";
import {
  amountFromUnits,
  BaseStep,
  err,
  exponentialBackoff,
  format,
  formatIcpAccount,
  formatTx,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../shared";
import { TransferStep } from "./transferStep";

type TxStatus = "unknown" | "signed" | "sent" | "executed";

export class WaitForTxStep extends BaseStep {
  private txStatus: TxStatus = "unknown";

  constructor(
    private oneSecActor: OneSec,
    private token: Token,
    private icpAccount: IcrcAccount,
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
      concise: `Wait for transaction on ${this.evmChain}`,
      verbose: `Wait for OneSec to sign and submit a transaction to send ${this.token} to ${this.evmAddress} on ${this.evmChain}`,
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
    const transferId = this.transferStep.getTransferId();

    if (transferId === undefined) {
      throw Error(
        "Missing transfer id. Please run the transfer step before running this step.",
      );
    }

    if ("Planned" in this._status) {
      this._status = {
        Pending: {
          concise: `Waiting for transaction on ${this.evmChain}`,
          verbose: `Waiting for OneSec to sign and submit a transaction to send ${this.token} to ${this.evmAddress} on ${this.evmChain}`,
        },
      };
    }

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const result = await this.oneSecActor.get_transfer(transferId);

    if ("Err" in result) {
      throw Error(`Failed to request the status of transfer ${transferId}`);
    }

    const transfer = fromCandid.transfer(result.Ok);

    if (transfer.status) {
      if ("Succeeded" in transfer.status) {
        this._status = {
          Done: ok({
            concise: `Executed transaction on ${this.evmChain}`,
            verbose: `OneSec executed a transaction to send ${format(transfer.destination.amount, this.decimals)} ${this.token} to ${this.evmAddress} on ${this.evmChain}: ${formatTx(transfer.destination.tx)}`,
            transaction: transfer.destination.tx,
            amount: amountFromUnits(transfer.destination.amount, this.decimals),
          }),
        };
      } else if ("Failed" in transfer.status) {
        this._status = {
          Done: err({
            concise: `Transaction failed on ${this.evmChain}`,
            verbose: `OneSec failed to send ${this.token} to ${this.evmAddress} on ${this.evmChain}: ${transfer.status.Failed.error}`,
          }),
        };
      } else if ("Refunded" in transfer.status) {
        this._status = {
          Done: ok({
            concise: "Refunded tokens on ICP",
            verbose: `OneSec refunded ${this.token} to ${formatIcpAccount(this.icpAccount)} on ICP due to insufficient tokens on ${this.evmChain}: ${formatTx(transfer.source.tx)}`,
            transaction: transfer.source.tx,
          }),
        };
      } else if ("PendingRefund" in transfer.status) {
        this._status = {
          Pending: {
            concise: "Refunding tokens on ICP",
            verbose: `OneSec is refunding ${this.token} to ${formatIcpAccount(this.icpAccount)} on ICP due to insufficient tokens on ${this.evmChain}: ${formatTx(transfer.source.tx)}`,
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
                const details = txStatusDetails(
                  ts,
                  this.token,
                  this.evmChain,
                  this.evmAddress,
                  transfer.destination.amount,
                  this.decimals,
                );
                if (details) {
                  this._status = {
                    Pending: details,
                  };
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

function txStatusDetails(
  ts: TxStatus,
  token: Token,
  evmChain: EvmChain,
  evmAddress: string,
  evmAmount: bigint,
  decimals: number,
): About | undefined {
  switch (ts) {
    case "unknown":
      return undefined;
    case "signed":
      return {
        concise: `Signing transaction for ${evmChain}`,
        verbose: `OneSec is signing a transaction to transfer ${format(evmAmount, decimals)} ${token} to ${evmAddress} on ${evmChain}`,
      };
    case "sent":
      return {
        concise: `Sending transaction to ${evmChain}`,
        verbose: `OneSec is sending a transaction to transfer ${format(evmAmount, decimals)} ${token} to ${evmAddress} on ${evmChain}`,
      };
    case "executed":
      return undefined;
  }
}
