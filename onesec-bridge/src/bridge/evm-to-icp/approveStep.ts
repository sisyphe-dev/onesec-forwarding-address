import { Contract } from "ethers";
import type { About, EvmChain, StepStatus, Token } from "../../types";
import { BaseStep, err, EVM_CALL_DURATION_MS, format, ok } from "../shared";

export class ApproveStep extends BaseStep {
  constructor(
    private erc20Contract: Contract,
    private token: Token,
    private evmChain: EvmChain,
    private evmAmount: bigint,
    private lockerAddress: string,
    private decimals: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Approve transaction`,
      verbose: `Approve a transaction to transfer ${format(this.evmAmount, this.decimals)} ${this.token} to OneSec contract ${this.lockerAddress} on ${this.evmChain}`,
    };
  }

  expectedDurationMs(): number {
    return EVM_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        concise: `Approving transaction`,
        verbose: `Submitting a transaction to approve the transfer`,
      },
    };

    const approveTx = await this.erc20Contract.approve(
      this.lockerAddress,
      this.evmAmount,
    );

    const approveReceipt = await approveTx.wait();

    if (approveReceipt.status === 1) {
      this._status = {
        Done: ok({
          concise: `Approved transaction`,
          verbose: `Successfully executed a transaction to approve the transfer: ${approveReceipt.hash}`,
          transaction: { Evm: { hash: approveReceipt.hash } },
        }),
      };
    } else {
      this._status = {
        Done: err({
          concise: "Failed to approve",
          verbose: `Transaction to approve the transfer has been reverted: ${approveReceipt.hash}`,
          transaction: approveReceipt.hash,
        }),
      };
    }

    return this._status;
  }
}
