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
  EVM_CALL_DURATION_MS,
  format,
  formatIcpAccount,
  GetEvmTx,
} from "../shared";

export class BurnStep extends BaseStep implements GetEvmTx {
  private data1: Uint8Array;
  private data2: Uint8Array | undefined;

  constructor(
    private minterContract: Contract,
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
      state: "running",
      concise: "preparing transaction",
      verbose: "preparing transaction",
    };

    const burnTx = this.data2
      ? await this.minterContract.burn2(this.evmAmount, this.data1, this.data2)
      : await this.minterContract.burn1(this.evmAmount, this.data1);
    const receipt = await burnTx.wait();

    if (receipt.status === 1) {
      this._status = {
        state: "succeeded",
        concise: `executed transaction: ${receipt.hash}`,
        verbose: `executed transaction: ${receipt.hash}`,
        transaction: { Evm: { hash: receipt.hash } },
      };
    } else {
      this._status = {
        state: "failed",
        concise: `transaction reverted: ${receipt.hash}`,
        verbose: `transaction reverted: ${receipt.hash}`,
      };
    }

    return this._status;
  }

  getEvmTx(): EvmTx | undefined {
    const tx = this._status.transaction;
    if (tx && "Evm" in tx) {
      return tx.Evm;
    }
    return undefined;
  }
}
