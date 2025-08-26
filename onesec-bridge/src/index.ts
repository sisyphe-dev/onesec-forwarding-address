import { OneSecForwardingImpl } from "./forwarding";
import type { Deployment, OneSecForwarding, Result, Step } from "./types";

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
  Amount,
  Details,
  OneSecForwarding,
  Result,
  Step,
  StepStatus,
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
  private _result?: Result;
  private currentStepIndex: number = 0;

  constructor(private _steps: Step[]) {}

  steps(): Step[] {
    return this._steps;
  }

  result(): Result | undefined {
    return this._result;
  }

  lastStep(): Step | undefined {
    if (this.currentStepIndex === 0) {
      return undefined;
    }
    return this._steps[this.currentStepIndex - 1];
  }

  skipDone() {
    while (
      this.currentStepIndex < this._steps.length &&
      "Done" in this._steps[this.currentStepIndex]
    ) {
      this.currentStepIndex += 1;
    }
  }

  nextStep(): Step | undefined {
    this.skipDone();

    const lastStep = this.lastStep();
    if (lastStep) {
      const lastStatus = lastStep.status();
      if ("Done" in lastStatus) {
        if ("Err" in lastStatus.Done) {
          return undefined;
        }
      }
    }

    return this._steps[this.currentStepIndex];
  }

  async runAllSteps(): Promise<Result> {
    let nextStep = this.nextStep();
    while (nextStep) {
      nextStep.run();
      nextStep = this.nextStep();
    }

    const lastStep = this.lastStep();
    if (lastStep) {
      const lastStatus = lastStep.status();
      if ("Done" in lastStatus) {
        this._result = lastStatus.Done;
      }
    }

    return this._result!;
  }

  expectedDurationMs(): number {
    return this._steps.reduce(
      (total, step) => total + step.expectedDurationMs(),
      0,
    );
  }
}
