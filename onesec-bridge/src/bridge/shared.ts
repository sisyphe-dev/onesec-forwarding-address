import {
  Amount,
  Chain,
  Details,
  EvmChain,
  EvmTx,
  Result,
  Step,
  StepStatus,
  Tx,
} from "../types";

export const ICP_CALL_DURATION_MS = 5000;
export const EVM_CALL_DURATION_MS = 5000;

export abstract class BaseStep implements Step {
  protected _status: StepStatus = { Planned: null };

  abstract details(): Details;
  abstract chain(): Chain;
  abstract contract(): string | undefined;
  abstract method(): string | undefined;
  abstract args(): string | undefined;
  abstract run(): Promise<StepStatus>;
  abstract expectedDurationMs(): number;

  status(): StepStatus {
    return this._status;
  }
}

export interface GetEvmTx {
  getEvmTx(): EvmTx | undefined;
}

export class ConfirmBlocksStep extends BaseStep {
  private startTime?: Date;
  constructor(
    private evmChain: EvmChain,
    private blockCount: number,
    private blockTimeMs: number,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Confirm blocks",
      description: `Confirm ${this.blockCount} blocks on ${this.evmChain}`,
    };
  }

  chain(): Chain {
    return this.evmChain;
  }

  contract(): string | undefined {
    return undefined;
  }

  method(): string | undefined {
    return undefined;
  }

  args(): string | undefined {
    return undefined;
  }

  expectedDurationMs(): number {
    return this.blockCount * this.blockTimeMs;
  }

  async run(): Promise<StepStatus> {
    if (this.startTime === undefined) {
      this.startTime = new Date();
      this._status = {
        Pending: {
          summary: "Confirming blocks",
          description: `Confirming ${this.blockCount} blocks on ${this.evmChain}`,
        },
      };
    }

    await sleep(1000);

    const elapsedMs = new Date().getTime() - this.startTime.getTime();

    const blocks = Math.floor(elapsedMs / this.blockTimeMs);

    if (blocks >= this.blockCount) {
      this._status = {
        Done: ok({
          summary: "Confirmed blocks",
          description: `Confirmed ${this.blockCount} blocks on ${this.evmChain}`,
        }),
      };
    } else {
      this._status = {
        Pending: {
          summary: "Confirming blocks",
          description: `Confirming ${blocks}/${this.blockCount} blocks on ${this.evmChain}`,
        },
      };
    }

    return this._status;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper functions for constructing Result::Done
export function ok(
  details: Details,
  transaction?: Tx,
  amount?: Amount,
  link?: string,
): Result {
  return {
    Ok: {
      details,
      transaction,
      amount,
      link,
    },
  };
}

export function err(details: Details): Result {
  return {
    Err: details,
  };
}
