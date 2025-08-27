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
  format,
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
    private evmChain: EvmChain,
    private icpAccount: IcrcAccount,
    private decimals: number,
    private computeForwardingAddressStep: ComputeForwardingAddressStep,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Wait for forwarding transaction on ${this.evmChain}`,
      verbose: `Wait for OneSec to detect the ${this.token} payment and submit a forwarding transaction on ${this.evmChain}`,
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
    const forwardingAddress =
      this.computeForwardingAddressStep.getForwardingAddress();
    const lastTransferId =
      this.computeForwardingAddressStep.getLastTransferId();

    if (forwardingAddress === undefined) {
      throw Error(
        "Missing forwarding address. Please compute the forwarding address before running this step.",
      );
    }

    this._status = {
      Pending: {
        concise: `Waiting for forwarding transaction on ${this.evmChain}`,
        verbose: `Waiting for OneSec to detect the ${this.token} payment and submit a forwarding transaction on ${this.evmChain}`,
      },
    };

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
          concise: `Submitted forwarding transaction on ${this.evmChain}`,
          verbose: `OneSec submitted a forwarding transaction on ${this.evmChain}`,
        }),
      };
      return this._status;
    }

    if (status) {
      if ("Forwarded" in status) {
        this.forwardingTx = status.Forwarded;
        this._status = {
          Done: ok({
            concise: `Submitted forwarding transaction on ${this.evmChain}`,
            verbose: `OneSec submitted a forwarding transaction on ${this.evmChain}`,
          }),
        };
      } else if ("CheckingBalance" in status) {
        this._status = {
          Pending: {
            concise: "Checking balance",
            verbose: `OneSec is checking the balance of the forwarding address ${forwardingAddress} on ${this.evmChain}`,
          },
        };
      } else if ("Forwarding" in status) {
        this._status = {
          Pending: {
            concise: `Submitting forwarding transaction on ${this.evmChain}`,
            verbose: `OneSec is signing and submitting a forwarding transaction on ${this.evmChain}`,
          },
        };
      } else if ("LowBalance" in status) {
        if (status.LowBalance.balance) {
          this._status = {
            Done: err({
              concise: "Balance is too low",
              verbose: `The balance of the forwarding address ${forwardingAddress} is too low: ${format(status.LowBalance.balance, this.decimals)} ${this.token}. Please ask the user to send at least ${format(status.LowBalance.minAmount, this.decimals)} ${this.token}`,
            }),
          };
        } else {
          this._status = {
            Pending: {
              concise: "Checking balance",
              verbose: `OneSec is checking the balance of the forwarding address ${forwardingAddress} on ${this.evmChain}`,
            },
          };
        }
      }
    }

    return this._status;
  }
}
