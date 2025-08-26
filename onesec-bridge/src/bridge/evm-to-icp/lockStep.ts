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

export class LockStep extends BaseStep implements GetEvmTx {
  private data1: Uint8Array;
  private data2: Uint8Array | undefined;

  constructor(
    private lockerContract: Contract,
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
      concise: `Lock ${this.token}`,
      verbose: `Lock ${format(this.evmAmount, this.decimals)} ${this.token} tokens in OneSec locker contract and send them to ${this.icpAccount.owner.toText()} on ICP`,
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

    const lockTx = this.data2
      ? await this.lockerContract.lock2(this.evmAmount, this.data1, this.data2)
      : await this.lockerContract.lock1(this.evmAmount, this.data1);
    const lockReceipt = await lockTx.wait();

    if (lockReceipt.status !== 1) {
      this._status = {
        Done: err({
          concise: `Failed to transfer ${this.token}`,
          verbose: `Failed to transfer ${this.token} to OneSec: transaction ${lockReceipt.hash} failed`,
        }),
      };
      return this._status;
    }

    this._status = {
      Done: ok({
        concise: `Transferred ${this.token}`,
        verbose: `Transferred ${this.token} to OneSec`,
        transaction: { Evm: { hash: lockReceipt.hash } },
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
