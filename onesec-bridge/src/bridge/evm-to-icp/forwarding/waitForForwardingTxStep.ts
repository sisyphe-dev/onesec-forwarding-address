import type {
  About,
  EvmChain,
  EvmTx,
  IcrcAccount,
  OneSecForwarding,
  StepStatus,
  Token,
  TransferId,
} from "../../../types";
import {
  BaseStep,
  err,
  exponentialBackoff,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../../shared";
import { ComputeForwardingAddressStep } from "./computeForwardingAddressStep";

export class WaitForForwardingTxStep extends BaseStep {
  private transferId?: TransferId;
  private forwardingTx?: EvmTx;

  constructor(
    private onesec: OneSecForwarding,
    private token: Token,
    private icpAccount: IcrcAccount,
    private evmChain: EvmChain,
    private computeForwardingAddressStep: ComputeForwardingAddressStep,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Wait for forwarding transaction",
      verbose: `Wait for OneSec to detect ${this.token} payment to the forwarding address and move tokens to the bridge on ${this.evmChain}`,
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
        concise: "Waiting for forwarding transaction",
        verbose:
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
          concise: "Missing forwarding address",
          verbose: "Compute forwarding address step must run before this step",
        }),
      };
      return this._status;
    }

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

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
          concise: "Forwarded tokens to bridge",
          verbose: "Forwarded tokens to bridge",
        }),
      };
      return this._status;
    }

    if (status) {
      if ("Forwarded" in status) {
        this.forwardingTx = status.Forwarded;
        this._status = {
          Done: ok({
            concise: "Forwarded tokens to bridge",
            verbose: "Forwarded tokens to bridge",
          }),
        };
      } else if ("CheckingBalance" in status) {
        this._status = {
          Pending: {
            concise: "Checking balance of the forwarding address",
            verbose: "OneSec is checking the balance of the forwarding address",
          },
        };
      } else if ("Forwarding" in status) {
        this._status = {
          Pending: {
            concise: "Submitting forwarding transaction",
            verbose:
              "OneSec is moving tokens from the forwarding address to the bridge",
          },
        };
      } else if ("LowBalance" in status) {
        if (status.LowBalance.balance) {
          this._status = {
            Done: err({
              concise: "Balance is too low",
              verbose: `Balance of the forwarding address is too low: ${status.LowBalance.balance}, required at least ${status.LowBalance.minAmount}`,
            }),
          };
        } else {
          this._status = {
            Pending: {
              concise: "Checking balance of the forwarding address",
              verbose:
                "OneSec is checking the balance of the forwarding address",
            },
          };
        }
      }
    }

    return this._status;
  }
}
