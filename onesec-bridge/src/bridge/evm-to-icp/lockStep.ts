import { Contract } from "ethers";
import type {
  Details,
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
  ) {
    super();
    const [data1, data2] = encodeIcrcAccount(this.icpAccount);
    this.data1 = data1;
    this.data2 = data2;
  }

  details(): Details {
    return {
      summary: `Transfer ${this.token}`,
      description: `Transfer ${this.token} to OneSec`,
    };
  }

  expectedDurationMs(): number {
    return EVM_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: `Transferring ${this.token}`,
        description: `Transferring ${this.token} to OneSec`,
      },
    };

    const lockTx = this.data2
      ? await this.lockerContract.lock2(
        this.evmAmount,
        this.data1,
        this.data2,
      )
      : await this.lockerContract.lock1(this.evmAmount, this.data1);
    const lockReceipt = await lockTx.wait();

    if (lockReceipt.status !== 1) {
      this._status = {
        Done: err({
          summary: `Failed to transfer ${this.token}`,
          description: `Failed to transfer ${this.token} to OneSec: transaction ${lockReceipt.hash} failed`,
        }),
      };
      return this._status;
    }

    this._status = {
      Done: ok({
        summary: `Transferred ${this.token}`,
        description: `Transferred ${this.token} to OneSec`,
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
