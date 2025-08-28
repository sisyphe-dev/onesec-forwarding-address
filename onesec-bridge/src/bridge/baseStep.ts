import { BridgingPlan } from "..";
import type { About, EvmTx, Step, StepStatus, TransferId } from "../types";

/**
 * Abstract base class for all bridging steps.
 *
 * Provides common functionality for step index management and status tracking.
 * All concrete step implementations should extend this class.
 */
export abstract class BaseStep implements Step {
  protected _plan?: BridgingPlan;
  protected _index?: number;
  protected _status: StepStatus = {
    state: "planned",
    concise: "Planned to run",
    verbose: "Planned to run",
  };

  abstract about(): About;
  abstract run(): Promise<StepStatus>;
  abstract expectedDurationMs(): number;

  status(): StepStatus {
    return this._status;
  }

  index(): number {
    return this._index!;
  }

  initialize(plan: BridgingPlan, index: number) {
    if (this._plan !== undefined) {
      throw Error("plan has already been set");
    }
    if (this._index !== undefined) {
      throw Error("index has already been set");
    }
    this._plan = plan;
    this._index = index;
  }

  canRun(): boolean {
    switch (this._status.state) {
      case "planned": {
        return this === this._plan?.nextStepToRun();
      }
      case "running": {
        return true;
      }
      case "failed": {
        // Allow retrying on error.
        return true;
      }
      case "refunded": {
        return false;
      }
      case "succeeded": {
        return false;
      }
    }
  }
}

/**
 * Interface for steps that can provide EVM transaction details.
 */
export interface GetEvmTx {
  getEvmTx(): EvmTx | undefined;
}

/**
 * Interface for steps that can provide transfer ID details.
 */
export interface GetTransferId {
  getTransferId(): TransferId | undefined;
}
