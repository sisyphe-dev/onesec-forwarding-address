import { Principal } from "@dfinity/principal";
import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { Chain, Details, EvmChain, StepStatus } from "../../types";
import {
  BaseStep,
  err,
  GetTransferId,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../shared";

export class WaitForIcpTx extends BaseStep {
  private delayMs: number = 1_000;

  constructor(
    private oneSecActor: OneSec,
    private oneSecId: Principal,
    private evmChain: EvmChain,
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

  chain(): Chain {
    return this.evmChain;
  }

  contract(): string {
    return this.oneSecId.toText();
  }

  method(): string {
    return "get_transfer";
  }

  args(): string | undefined {
    const id = this.getTransferId.getTransferId();
    return id == undefined
      ? undefined
      : JSON.stringify({ id: id.id.toString() });
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
      this._status = {
        Done: err({
          summary: "Missing the receipt validation step",
          description:
            "The receipt validation step must succeed before running this step",
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
            description: `Ledger transaction failed: ${result.Err}`,
          }),
        };
        return this._status;
      }

      const transfer = fromCandid.transfer(result.Ok);

      if (transfer.status) {
        if ("Succeeded" in transfer.status) {
          this._status = {
            Done: ok(
              {
                summary: "Executed transaction",
                description: "Executed ledger transaction",
              },
              transfer.destination.tx,
            ),
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
            Done: ok(
              {
                summary: "Refunded tokens",
                description: "Refunded tokens due to a bridging issue",
              },
              transfer.source.tx,
            ),
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
    } catch (error) {
      this._status = {
        Done: err({
          summary: "Transaction failed",
          description: `Ledger transaction failed: ${error}`,
        }),
      };
    }

    return this._status;
  }
}
