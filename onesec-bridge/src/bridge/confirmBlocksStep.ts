import type { About, EvmChain, StepStatus } from "../types";
import { sleep } from "../utils";
import { BaseStep } from "./baseStep";

/**
 * Step that waits for a specified number of blocks to be confirmed on an EVM chain.
 *
 * This step simulates block confirmation by waiting for a calculated time period
 * based on the expected block time and number of confirmations required.
 */
export class ConfirmBlocksStep extends BaseStep {
  private startTime?: Date;

  constructor(
    private evmChain: EvmChain,
    private blockCount: number,
    private blockTimeMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Confirm blocks on ${this.evmChain}`,
      verbose: `Wait for ${this.blockCount} blocks on ${this.evmChain} until the transaction becomes confirmed`,
    };
  }

  expectedDurationMs(): number {
    return this.blockCount * this.blockTimeMs;
  }

  async run(): Promise<StepStatus> {
    if (!this.canRun()) {
      return this._status;
    }

    if (this._status.state === "planned") {
      this.startTime = new Date();
      this._status = {
        state: "running",
        concise: `confirmed 0 out of ${this.blockCount} blocks`,
        verbose: `confirmed 0 out of ${this.blockCount} blocks`,
      };
    }
    await sleep(1000);
    const elapsedMs = new Date().getTime() - this.startTime!.getTime();
    const blocks = Math.floor(elapsedMs / this.blockTimeMs);
    if (blocks >= this.blockCount) {
      this._status = {
        state: "succeeded",
        concise: `confirmed ${this.blockCount} blocks`,
        verbose: `confirmed ${this.blockCount} blocks`,
      };
    } else {
      this._status = {
        state: "running",
        concise: `confirmed ${blocks} out of ${this.blockCount} blocks`,
        verbose: `confirmed ${blocks} out of ${this.blockCount} blocks`,
      };
    }
    return this._status;
  }
}
