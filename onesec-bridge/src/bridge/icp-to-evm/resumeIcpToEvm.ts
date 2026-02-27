import type { Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { BridgingPlan } from "../..";
import {
  Config,
  DEFAULT_CONFIG,
  getIcpPollDelayMs,
  getTokenDecimals,
} from "../../config";
import * as fromCandid from "../../fromCandid";
import type {
  Deployment,
  EvmChain,
  IcrcAccount,
  Token,
  TransferId,
} from "../../types";
import { ConfirmBlocksStep } from "../confirmBlocksStep";
import { oneSecWithAgent } from "../shared";
import { ResumeValidateReceiptStep } from "./resumeValidateReceiptStep";
import { ResumeWaitForTxStep } from "./resumeWaitForTxStep";

/**
 * Resume an ICP-to-EVM bridging flow from a known transfer ID.
 *
 * Use this when the original {@link BridgingPlan} was lost (crash, page
 * refresh, app restart) after the `transfer_icp_to_evm` call succeeded.
 * Given just the transfer ID, this function queries the canister to validate
 * the transfer exists, extracts the destination address, and builds a partial
 * plan covering the remaining steps: waiting for the EVM transaction, block
 * confirmations, and receipt validation.
 *
 * The returned plan works exactly like a normal {@link BridgingPlan}: call
 * `nextStepToRun()` / `run()` in a loop, or `runAllSteps()`.
 *
 * @param agent Authenticated ICP agent
 * @param transferId The transfer ID returned by the original `transfer_icp_to_evm` call
 * @param evmChain Target EVM chain (e.g., "Base", "Arbitrum", "Ethereum")
 * @param token Token being bridged (e.g., "USDC", "ICP")
 * @param options Optional deployment and config overrides
 * @returns A partial bridging plan that resumes from the wait-for-tx step
 * @throws Error if the transfer ID does not exist or the transfer record
 *   is missing the EVM destination address
 *
 * @example
 * ```typescript
 * // Caller saved the transfer ID from a previous session
 * const transferId = { id: 42n };
 *
 * const plan = await resumeIcpToEvm(agent, transferId, "Base", "USDC");
 *
 * let step;
 * while (step = plan.nextStepToRun()) {
 *   const result = await step.run();
 *   console.log(result.verbose);
 * }
 * ```
 */
export async function resumeIcpToEvm(
  agent: Agent,
  transferId: TransferId,
  evmChain: EvmChain,
  token: Token,
  options?: {
    deployment?: Deployment;
    config?: Config;
  },
): Promise<BridgingPlan> {
  const deployment = options?.deployment ?? "Mainnet";
  const config = options?.config ?? DEFAULT_CONFIG;
  const decimals = getTokenDecimals(config, token);
  const oneSecId = Principal.fromText(config.icp.onesec.get(deployment)!);
  const oneSecActor = await oneSecWithAgent(oneSecId, agent);
  const evmConfig = config.evm.get(evmChain)!;

  const result = await oneSecActor.get_transfer(transferId);
  if ("Err" in result) {
    throw new Error(
      `Transfer ${transferId.id} not found: ${result.Err}`,
    );
  }

  const transfer = fromCandid.transfer(result.Ok);

  const evmAddress =
    transfer.destination.account && "Evm" in transfer.destination.account
      ? transfer.destination.account.Evm.address
      : undefined;

  if (!evmAddress) {
    throw new Error(
      "Could not determine EVM destination address from transfer",
    );
  }

  let icpAccount: IcrcAccount | undefined;
  if (
    transfer.source.account &&
    "Icp" in transfer.source.account &&
    "ICRC" in transfer.source.account.Icp
  ) {
    icpAccount = transfer.source.account.Icp.ICRC;
  }

  const pollDelayMs = getIcpPollDelayMs(config, deployment);

  const waitForTxStep = new ResumeWaitForTxStep(
    oneSecActor,
    token,
    icpAccount,
    evmChain,
    evmAddress,
    decimals,
    transferId,
    pollDelayMs,
  );

  const confirmBlocksStep = new ConfirmBlocksStep(
    evmChain,
    evmConfig.confirmBlocks,
    evmConfig.blockTimeMs.get(deployment)!,
  );

  const validateReceiptStep = new ResumeValidateReceiptStep(
    oneSecActor,
    token,
    evmChain,
    evmAddress,
    decimals,
    transferId,
    pollDelayMs,
  );

  return new BridgingPlan([
    waitForTxStep,
    confirmBlocksStep,
    validateReceiptStep,
  ]);
}
