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
  exponentialBackoff,
  format,
  ICP_CALL_DURATION_MS,
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
      state: "running",
      concise: "querying",
      verbose: "calling get_forwarding_status of OneSec",
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
      transferId !== undefined &&
      (lastTransferId === undefined || transferId > lastTransferId)
    ) {
      this.transferId = transferId;
      this._status = {
        state: "succeeded",
        concise: "executed forwarding transaction",
        verbose: "executed forwarding transaction",
      };
      return this._status;
    }

    if (status) {
      if ("Forwarded" in status) {
        this.forwardingTx = status.Forwarded;
        this._status = {
          state: "succeeded",
          concise: "executed forwarding transaction",
          verbose: "executed forwarding transaction",
        };
      } else if ("CheckingBalance" in status) {
        this._status = {
          state: "running",
          concise: "checking balance",
          verbose: `checking balance of forwarding address ${forwardingAddress}`,
        };
      } else if ("Forwarding" in status) {
        this._status = {
          state: "running",
          concise: "submitting forwarding transaction",
          verbose: "submitting forwarding transaction",
        };
      } else if ("LowBalance" in status) {
        if (status.LowBalance.balance) {
          this._status = {
            state: "failed",
            concise: "balance is too low",
            verbose: `balance of forwarding address ${forwardingAddress} is too low: ${format(status.LowBalance.balance, this.decimals)} ${this.token}. Please ask the user to send at least ${format(status.LowBalance.minAmount, this.decimals)} ${this.token}`,
          };
        } else {
          this._status = {
            state: "running",
            concise: "checking balance",
            verbose: `checking balance of forwarding address ${forwardingAddress}`,
          };
        }
      }
    }

    return this._status;
  }
}
