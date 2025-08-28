import { Contract } from "ethers";
import type {
  About,
  EvmChain,
  IcrcAccount,
  StepStatus,
  Token,
} from "../../types";
import { format, formatIcpAccount } from "../../utils";
import { BaseStep } from "../baseStep";
import { EVM_CALL_DURATION_MS } from "../shared";

export class ApproveStep extends BaseStep {
  constructor(
    private erc20Contract: Contract,
    private token: Token,
    private evmChain: EvmChain,
    private icpAccount: IcrcAccount,
    private evmAmount: bigint,
    private decimals: number,
    private lockerAddress: string,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Approve transaction on ${this.evmChain}`,
      verbose: `Approve transaction to send ${format(this.evmAmount, this.decimals)} ${this.token} to OneSec on ${this.evmChain} for bridging to ${formatIcpAccount(this.icpAccount)} on ICP`,
    };
  }

  expectedDurationMs(): number {
    return EVM_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    if (!this.canRun()) {
      return this._status;
    }

    this._status = {
      state: "running",
      concise: "preparing transaction",
      verbose: "preparing transaction",
    };

    const approveTx = await this.erc20Contract.approve(
      this.lockerAddress,
      this.evmAmount,
    );

    const receipt = await approveTx.wait();

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
        transaction: { Evm: { hash: receipt.hash } },
      };
    }

    return this._status;
  }
}
