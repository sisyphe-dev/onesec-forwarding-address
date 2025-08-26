import { Principal } from "@dfinity/principal";
import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import type { Chain, Details, EvmChain, StepStatus } from "../../types";
import { BaseStep, err, ICP_CALL_DURATION_MS, ok, sleep } from "../shared";
import { TransferStep } from "./transfer-step";

export class ValidateReceiptStep extends BaseStep {
  private delayMs: number = 1_000;

  constructor(
    private oneSecActor: OneSec,
    private oneSecId: Principal,
    private evmChain: EvmChain,
    private transferStep: TransferStep,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Validate receipt",
      description: `Wait for OneSec to validate the receipt of ${this.evmChain} transaction`,
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
    const id = this.transferStep.getTransferId();
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
        summary: "Validating receipt",
        description: `Waiting for OneSec to validate the receipt of ${this.evmChain} transaction`,
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
            summary: "Validation failed",
            description: `Validation failed: ${result.Err}`,
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
                summary: "Validated receipt",
                description: `Validated receipt of the ${this.evmChain} transaction`,
              },
              transfer.destination.tx,
            ),
          };
          return this._status;
        } else if ("Failed" in transfer.status) {
          this._status = {
            Done: err({
              summary: "Validation failed",
              description: `Validation failed: ${transfer.status.Failed.error}`,
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
          summary: "Validation failed",
          description: `Validation failed: ${error}`,
        }),
      };
    }

    return this._status;
  }
}
