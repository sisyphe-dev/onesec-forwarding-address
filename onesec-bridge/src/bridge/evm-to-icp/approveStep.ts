import { Contract } from "ethers";
import type { About, EvmChain, IcrcAccount, StepStatus, Token } from "../../types";
import { BaseStep, err, EVM_CALL_DURATION_MS, format, formatIcpAccount, ok } from "../shared";

export class ApproveStep extends BaseStep {
  constructor(
    private erc20Contract: Contract,
    private token: Token,
    private evmChain: EvmChain,
    private evmAmount: bigint,
    private icpAccount: IcrcAccount,
    private lockerAddress: string,
    private decimals: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Approve transfer`,
      verbose: `Approve transfer of ${format(this.evmAmount, this.decimals)} ${this.token} to OneSec on ${this.evmChain} for bridging to ${formatIcpAccount(this.icpAccount)} on ICP`,
    };
  }

  expectedDurationMs(): number {
    return EVM_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        concise: `Approving transfer`,
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
          concise: `Approved transfer`,
          verbose: `Successfully executed a transaction to approve transfer of ${format(this.evmAmount, this.decimals)} ${this.token} to OneSec on ${this.evmChain} for bridging to ${formatIcpAccount(this.icpAccount)} on ICP: ${approveReceipt.hash}`,
          transaction: { Evm: { hash: approveReceipt.hash } },
        }),
      };
    } else {
      this._status = {
        Done: err({
          concise: "Failed to approve transfer",
          verbose: `Transaction to approve the transfer has been reverted: ${approveReceipt.hash}`,
          transaction: approveReceipt.hash,
        }),
      };
    }

    return this._status;
  }
}
