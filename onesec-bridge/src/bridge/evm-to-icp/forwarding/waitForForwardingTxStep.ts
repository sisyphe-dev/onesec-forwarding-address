import type {
  Chain,
  Details,
  EvmChain,
  EvmTx,
  IcrcAccount,
  OneSecForwarding,
  StepStatus,
  Token,
  TransferId,
} from "../../../types";
import { BaseStep, err, ICP_CALL_DURATION_MS, ok, sleep } from "../../shared";
import { ComputeForwardingAddressStep } from "./computeForwardingAddressStep";

export class WaitForForwardingTxStep extends BaseStep {
  private transferId?: TransferId;
  private forwardingTx?: EvmTx;
  private delayMs: number = 1_000;

  constructor(
    private onesec: OneSecForwarding,
    private token: Token,
    private icpAccount: IcrcAccount,
    private evmChain: EvmChain,
    private computeForwardingAddressStep: ComputeForwardingAddressStep,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Wait for forwarding transaction",
      description:
        "Wait for transaction that moves tokens from the forwarding address to the bridge",
    };
  }


  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  getTransferId(): TransferId | undefined {
    return this.transferId;
  }

  getForwardingTx(): EvmTx | undefined {
    return this.forwardingTx;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: "Waiting for forwarding transaction",
        description:
          "Waiting for transaction that moves tokens from the forwarding address to the bridge",
      },
    };

    const forwardingAddress =
      this.computeForwardingAddressStep.getForwardingAddress();
    const lastTransferId =
      this.computeForwardingAddressStep.getLastTransferId();

    if (forwardingAddress === undefined) {
      this._status = {
        Done: err({
          summary: "Missing forwarding address",
          description:
            "Compute forwarding address step must run before this step",
        }),
      };
      return this._status;
    }

    try {
      const maxDelayMs = 10_000;
      await sleep(this.delayMs);
      this.delayMs = Math.min(maxDelayMs, this.delayMs * 1.2); // Exponential backoff

      const response = await this.onesec.getForwardingStatus(
        this.token,
        this.evmChain,
        forwardingAddress,
        this.icpAccount,
      );

      const transferId = response.done;
      const status = response.status;

      if (
        lastTransferId === undefined ||
        (transferId && transferId > lastTransferId)
      ) {
        this.transferId = transferId;
        this._status = {
          Done: ok({
            summary: "Forwarded tokens to bridge",
            description: "Forwarded tokens to bridge",
          }),
        };
        return this._status;
      }

      if (status) {
        if ("Forwarded" in status) {
          this.forwardingTx = status.Forwarded;
          this._status = {
            Done: ok({
              summary: "Forwarded tokens to bridge",
              description: "Forwarded tokens to bridge",
            }),
          };
        } else if ("CheckingBalance" in status) {
          this._status = {
            Pending: {
              summary: "Checking balance of the forwarding address",
              description:
                "OneSec is checking the balance of the forwarding address",
            },
          };
        } else if ("Forwarding" in status) {
          this._status = {
            Pending: {
              summary: "Submitting forwarding transaction",
              description:
                "OneSec is moving tokens from the forwarding address to the bridge",
            },
          };
        } else if ("LowBalance" in status) {
          if (status.LowBalance.balance) {
            this._status = {
              Done: err({
                summary: "Balance is too low",
                description: `Balance of the forwarding address is too low: ${status.LowBalance.balance}, required at least ${status.LowBalance.minAmount}`,
              }),
            };
          } else {
            this._status = {
              Pending: {
                summary: "Checking balance of the forwarding address",
                description:
                  "OneSec is checking the balance of the forwarding address",
              },
            };
          }
        }
      }
    } catch (error) {
      this._status = {
        Pending: {
          summary: `Failed to forward`,
          description: `Failed to forward: ${error}`,
        },
      };
    }

    return this._status;
  }
}
