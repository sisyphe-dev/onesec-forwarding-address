import { Contract } from "ethers";
import type { About, StepStatus, Token } from "../../types";
import { BaseStep, err, EVM_CALL_DURATION_MS, ok } from "../shared";

export class ApproveStep extends BaseStep {
  constructor(
    private erc20Contract: Contract,
    private token: Token,
    private evmAmount: bigint,
    private lockerAddress: string,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Approve transaction",
      verbose: `Approve transfer of ${this.token} to OneSec`,
    };
  }

  expectedDurationMs(): number {
    return EVM_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: "Approving transaction",
        description: `Approving transfer of ${this.token} to OneSec`,
      },
    };

    const approveTx = await this.erc20Contract.approve(
      this.lockerAddress,
      this.evmAmount,
    );
    const approveReceipt = await approveTx.wait();

    if (approveReceipt.status !== 1) {
      this._status = {
        Done: err({
          concise: "Failed to approve",
          verbose: `Failed to approve transaction: ${approveReceipt.hash}`,
        }),
      };
    } else {
      this._status = {
        Done: ok({
          summary: "Approved transaction",
          description: `Approved transfer of ${this.token} to OneSec`,
          transaction: { Evm: { hash: approveReceipt.hash } },
        }),
      };
    }

    return this._status;
  }
}
