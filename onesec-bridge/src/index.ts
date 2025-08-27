import { OneSecForwardingImpl } from "./forwarding";
import type { Deployment, OneSecForwarding, Step, StepStatus } from "./types";

export { EvmToIcpBridgeBuilder, IcpToEvmBridgeBuilder } from "./bridge";
export {
  DEFAULT_CONFIG,
  getTokenConfig,
  getTokenDecimals,
  getTokenErc20Address,
  getTokenLedgerCanister,
  getTokenLockerAddress,
} from "./config";
export type { Config, IcpConfig, TokenConfig } from "./config";
export type {
  About,
  Amount,
  OneSecForwarding,
  Step,
  StepStatus as StepStatus,
} from "./types";

/**
 * Constructs an instance of `OneSecForwarding` for bridging tokens from EVM
 * chains to ICP using forwarding addresses.
 *
 * A forwarding address is an EVM address that is derived from an ICP address.
 * Tokens transferred to the forwarding address on EVM are bridged to the
 * corresponding ICP address on ICP.
 *
 * @param setup - the deployment environment (defaults to Mainnet)
 * @param addresses - optional canister IDs for custom deployments
 */
export function oneSecForwarding(setup?: Deployment): OneSecForwarding {
  return new OneSecForwardingImpl(setup ?? "Mainnet");
}

export class BridgingPlan {
  private currentStepIndex: number = 0;

  constructor(private _steps: Step[]) { }

  steps(): Step[] {
    return this._steps;
  }

  lastStep(): Step | undefined {
    if (this.currentStepIndex === 0) {
      return undefined;
    }
    return this._steps[this.currentStepIndex - 1];
  }


  nextStep(): Step | undefined {
    this.skipDone();

    const lastStep = this.lastStep();
    if (lastStep) {
      const state = lastStep.status().state;
      switch (state) {
        case "failed":
        case "refunded": {
          // There is no next step if the last step has failed or triggered a refund.
          return undefined;
        }
        case "succeeded":
        case "planned":
        case "running": {
          // Nothing to do;
          break;
        }
      }
    }

    return this._steps[this.currentStepIndex];
  }

  async runAllSteps(): Promise<StepStatus> {
    let nextStep = this.nextStep();
    while (nextStep) {
      await nextStep.run();
      nextStep = this.nextStep();
    }
    return this.lastStep()!.status();
  }

  expectedDurationMs(): number {
    return this._steps.reduce(
      (total, step) => total + step.expectedDurationMs(),
      0,
    );
  }

  private skipDone() {
    while (this.currentStepIndex < this._steps.length) {
      const state = this._steps[this.currentStepIndex].status().state;
      switch (state) {
        case "succeeded":
        case "failed":
        case "refunded": {
          // Skip this step and continue. 
          break;
        }
        case "planned":
        case "running": {
          // Stop here.
          return;
        }
      }
      this.currentStepIndex += 1;
    }
  }
}
