import { BaseStep } from "./bridge";
import { OneSecForwardingImpl } from "./forwarding";
import type { Deployment, OneSecForwarding, Step, StepStatus } from "./types";

export { EvmToIcpBridgeBuilder, IcpToEvmBridgeBuilder } from "./bridge";
export { DEFAULT_CONFIG } from "./config";
export type { Config, IcpConfig, TokenConfig } from "./config";
export type { About, Amount, OneSecForwarding, Step, StepStatus as StepStatus, } from "./types";


/**
 * Constructs an instance of `OneSecForwarding` for bridging tokens from EVM
 * chains to ICP using forwarding addresses.
 *
 * A forwarding address is an EVM address that is derived from an ICP address.
 * Tokens transferred to the forwarding address on EVM are bridged to the
 * corresponding ICP address on ICP.
 *
 * @deprecated Use `EvmToIcpBridgeBuilder.forward()` instead for better step-by-step
 * execution, progress tracking, and error handling.
 *
 * @example
 * ```typescript
 * // Instead of:
 * // const forwarding = oneSecForwarding();
 * // const address = await forwarding.addressFor(receiver);
 *
 * // Use:
 * const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
 *   .receiver(icpPrincipal)
 *   .amountInUnits(1_500_000n)
 *   .forward();
 *
 * // Print plan overview
 * console.log("Plan steps:");
 * plan.steps().forEach((step, index) => {
 *   console.log(`  ${index + 1}. ${step.about().verbose}`);
 * });
 *
 * // Execute step by step with progress tracking
 * let nextStep;
 * while (nextStep = plan.nextStepToRun()) {
 *   const status = nextStep.status();
 *   if (status.state === "planned") {
 *     console.log(nextStep.about().verbose);
 *   }
 *   try {
 *     const result = await nextStep.run();
 *     console.log(`  - ${result.verbose}`);
 *     if (result.forwardingAddress) {
 *       console.log(`Please send USDC to ${result.forwardingAddress}`);
 *     }
 *   } catch (error) {
 *     console.error("Step execution failed:", error);
 *     break;
 *   }
 * }
 *
 * // Get final results after completion
 * const finalStep = plan.latestStep();
 * if (finalStep) {
 *   const status = finalStep.status();
 *   if (status.state === "succeeded") {
 *     console.log("Forwarding completed successfully!");
 *     if (status.amount) {
 *       console.log(`Received: ${status.amount.inTokens} USDC`);
 *     }
 *     if (status.transaction) {
 *       console.log(`ICP Transaction: ${JSON.stringify(status.transaction)}`);
 *     }
 *   }
 * }
 * ```
 *
 * @param setup - the deployment environment (defaults to Mainnet)
 * @param addresses - optional canister IDs for custom deployments
 */
export function oneSecForwarding(setup?: Deployment): OneSecForwarding {
  return new OneSecForwardingImpl(setup ?? "Mainnet");
}

/**
 * Orchestrates the execution of a multi-step token bridging process.
 *
 * A BridgingPlan contains an ordered sequence of steps that must be executed
 * to complete a token bridge operation. Steps can be run individually with
 * `nextStepToRun().run()` or all at once with `runAllSteps()`.
 *
 * The plan tracks execution state and handles step dependencies, ensuring
 * steps are executed in the correct order and failed steps halt progression.
 *
 * @example
 * ```typescript
 * const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
 *   .receiver(icpPrincipal)
 *   .amountInUnits(1_500_000n)
 *   .build(evmSigner);
 *
 * // Print plan overview
 * console.log("Plan steps:");
 * plan.steps().forEach((step, index) => {
 *   console.log(`  ${index + 1}. ${step.about().verbose}`);
 * });
 *
 * // Execute step-by-step with progress tracking
 * let nextStep;
 * while (nextStep = plan.nextStepToRun()) {
 *   const status = nextStep.status();
 *   if (status.state === "planned") {
 *     console.log(nextStep.about().verbose);
 *   }
 *   try {
 *     const result = await nextStep.run();
 *     console.log(`  - ${result.verbose}`);
 *   } catch (error) {
 *     console.error("Step execution failed:", error);
 *     break;
 *   }
 * }
 *
 * // Get final results after completion
 * const finalStep = plan.latestStep();
 * if (finalStep) {
 *   const status = finalStep.status();
 *   if (status.state === "succeeded") {
 *     console.log("Bridging completed successfully!");
 *     if (status.amount) {
 *       console.log(`Received: ${status.amount.inTokens} USDC`);
 *     }
 *     if (status.transaction) {
 *       console.log(`Transaction: ${JSON.stringify(status.transaction)}`);
 *     }
 *   }
 * }
 *
 * // Or execute all steps at once
 * try {
 *   const finalResult = await plan.runAllSteps();
 *   console.log("Bridging completed:", finalResult.state);
 *   if (finalResult.state === "succeeded") {
 *     if (finalResult.amount) {
 *       console.log(`Received: ${finalResult.amount.inTokens} USDC`);
 *     }
 *     if (finalResult.transaction) {
 *       console.log(`Transaction: ${JSON.stringify(finalResult.transaction)}`);
 *     }
 *   }
 * } catch (error) {
 *   console.error("Bridging failed:", error);
 * }
 * ```
 */
export class BridgingPlan {
  private currentStepIndex: number = 0;

  constructor(private _steps: Step[]) {
    for (let i = 0; i < _steps.length; i++) {
      (_steps[i] as BaseStep).initialize(this, i);
    }
  }

  /**
   * Get all steps in this bridging plan.
   * @returns Array of steps in execution order
   */
  steps(): Step[] {
    return this._steps;
  }

  /**
   * Get the most recently executed step.
   * @returns The latest executed step, or undefined if no steps have been executed
   */
  latestStep(): Step | undefined {
    this.skipDone();

    if (this.currentStepIndex === 0) {
      return undefined;
    }
    return this._steps[this.currentStepIndex - 1];
  }

  /**
   * Get the next step to execute.
   *
   * Automatically skips completed steps and stops at failed steps.
   * Returns undefined when all steps are complete or a step has failed.
   *
   * @returns Next step to execute, or undefined if plan is complete/failed
   */
  nextStepToRun(): Step | undefined {
    this.skipDone();

    const latestStep = this.latestStep();
    if (latestStep) {
      const state = latestStep.status().state;
      switch (state) {
        case "failed":
        case "refunded": {
          // There is no next step if the previous step has failed or triggered a refund.
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

  /**
   * Execute all remaining steps in sequence.
   *
   * Runs each step until completion or failure. If a step fails,
   * execution stops and the error status is returned.
   *
   * @returns Final step status (success or failure)
   * @throws Error if a step encounters an unexpected error during execution
   */
  async runAllSteps(): Promise<StepStatus> {
    let nextStep = this.nextStepToRun();
    while (nextStep) {
      await nextStep.run();
      nextStep = this.nextStepToRun();
    }
    return this.latestStep()!.status();
  }

  /**
   * Calculate the total expected duration for all steps.
   * @returns Total expected duration in milliseconds
   */
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
