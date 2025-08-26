import { Contract } from "ethers";
import type { About, EvmTx, IcrcAccount, StepStatus, Token } from "../../types";
import {
  BaseStep,
  encodeIcrcAccount,
  err,
  EVM_CALL_DURATION_MS,
  format,
  GetEvmTx,
  ok,
} from "../shared";

export class BurnStep extends BaseStep implements GetEvmTx {
  private data1: Uint8Array;
  private data2: Uint8Array | undefined;

  constructor(
    private minterContract: Contract,
    private token: Token,
    private evmAmount: bigint,
    private icpAccount: IcrcAccount,
    private decimals: number,
  ) {
    super();
    const [data1, data2] = encodeIcrcAccount(this.icpAccount);
    this.data1 = data1;
    this.data2 = data2;
  }

  about(): About {
    return {
      concise: `Burn ${this.token}`,
      verbose: `Burn ${format(this.evmAmount, this.decimals)} ${this.token} tokens and send them to ${this.icpAccount.owner.toText()} on ICP`,
    };
  }

  expectedDurationMs(): number {
    return EVM_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        concise: `Transferring ${this.token}`,
        verbose: `Transferring ${this.token} to OneSec`,
      },
    };

    const burnTx = this.data2
      ? await this.minterContract.burn2(this.evmAmount, this.data1, this.data2)
      : await this.minterContract.burn1(this.evmAmount, this.data1);
    const burnReceipt = await burnTx.wait();

    if (burnReceipt.status !== 1) {
      this._status = {
        Done: err({
          concise: `Failed to transfer ${this.token}`,
          verbose: `Failed to transfer ${this.token} to OneSec: transaction ${burnReceipt.hash} failed`,
        }),
      };
      return this._status;
    }

    this._status = {
      Done: ok({
        concise: `Transferred ${this.token}`,
        verbose: `Transferred ${this.token} to OneSec`,
        transaction: { Evm: { hash: burnReceipt.hash } },
      }),
    };
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
