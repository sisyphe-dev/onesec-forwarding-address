import { Contract } from "ethers";
import type {
  About,
  EvmChain,
  EvmTx,
  IcrcAccount,
  StepStatus,
  Token,
} from "../../types";
import {
  BaseStep,
  encodeIcrcAccount,
  err,
  EVM_CALL_DURATION_MS,
  format,
  formatIcpAccount,
  GetEvmTx,
  ok,
} from "../shared";

export class LockStep extends BaseStep implements GetEvmTx {
  private data1: Uint8Array;
  private data2: Uint8Array | undefined;

  constructor(
    private lockerContract: Contract,
    private token: Token,
    private evmChain: EvmChain,
    private icpAccount: IcrcAccount,
    private evmAmount: bigint,
    private decimals: number,
  ) {
    super();
    const [data1, data2] = encodeIcrcAccount(this.icpAccount);
    this.data1 = data1;
    this.data2 = data2;
  }

  about(): About {
    return {
      concise: `Submit transaction on ${this.evmChain}`,
      verbose: `Submit transaction to send ${format(this.evmAmount, this.decimals)} ${this.token} to OneSec on ${this.evmChain} for bridging to ${formatIcpAccount(this.icpAccount)} on ICP`,
    };
  }

  expectedDurationMs(): number {
    return EVM_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        concise: `Submitting transaction on ${this.evmChain}`,
        verbose: `Submitting transaction to send ${format(this.evmAmount, this.decimals)} ${this.token} to OneSec on ${this.evmChain} for bridging to ${formatIcpAccount(this.icpAccount)} on ICP`,
      },
    };

    const lockTx = this.data2
      ? await this.lockerContract.lock2(this.evmAmount, this.data1, this.data2)
      : await this.lockerContract.lock1(this.evmAmount, this.data1);
    const lockReceipt = await lockTx.wait();

    if (lockReceipt.status === 1) {
      this._status = {
        Done: ok({
          concise: `Executed transaction on ${this.evmChain}`,
          verbose: `Executed transaction to send ${format(this.evmAmount, this.decimals)} ${this.token} to OneSec on ${this.evmChain} for bridging to ${formatIcpAccount(this.icpAccount)} on ICP: transaction hash ${lockReceipt.hash}`,
          transaction: { Evm: { hash: lockReceipt.hash } },
        }),
      };
    } else {
      this._status = {
        Done: err({
          concise: `Transaction failed on ${this.evmChain}`,
          verbose: `Transaction to send ${format(this.evmAmount, this.decimals)} ${this.token} to OneSec on ${this.evmChain} for bridging to ${formatIcpAccount(this.icpAccount)} on ICP has been reverted: ${lockReceipt.hash}`,
        }),
      };
    }
    return this._status;
  }

  getEvmTx(): EvmTx | undefined {
    if (
      "Done" in this._status &&
      "Ok" in this._status.Done &&
      this._status.Done.Ok.transaction
    ) {
      const tx = this._status.Done.Ok.transaction;
      if ("Evm" in tx) {
        return tx.Evm;
      }
    }
    return undefined;
  }
}
