import { Actor, Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { BridgingPlan } from "../..";
import {
  Config,
  DEFAULT_CONFIG,
  getIcpPollDelayMs,
  getTokenDecimals,
  getTokenLedgerCanister,
} from "../../config";
import {
  idlFactory as IcrcLedgerIDL,
  type _SERVICE as IcrcLedger,
} from "../../generated/candid/icrc_ledger/icrc_ledger.did";
import { Deployment, EvmChain, IcrcAccount, Token } from "../../types";
import {
  ConfirmBlocksStep,
  FetchFeesAndCheckLimits,
  oneSecWithAgent,
} from "../shared";
import { ApproveStep } from "./approveStep";
import { TransferStep } from "./transferStep";
import { ValidateReceiptStep } from "./validateReceiptStep";
import { WaitForTxStep } from "./waitForTxStep";

/**
 * Builder for creating ICP to EVM token bridging plans.
 *
 * Transfers tokens from ICP ledgers to EVM networks. Requires an authenticated
 * agent to interact with ICP canisters on behalf of the user.
 *
 * @example
 * ```typescript
 * const agent = HttpAgent.createSync({
 *   identity: icpIdentity,
 *   host: "https://ic0.app"
 * });
 *
 * const plan = await new IcpToEvmBridgeBuilder(agent, "Base", "USDC")
 *   .sender(icpPrincipal)
 *   .receiver("0x742d35Cc6575C4B9bE904C1e13D21c4C624A9960")
 *   .amountInUnits(1_500_000n) // 1.5 USDC
 *   .build();
 * ```
 */
export class IcpToEvmBridgeBuilder {
  private deployment: Deployment = "Mainnet";
  private amount?: bigint;
  private icpAccount?: IcrcAccount;
  private evmAddress?: string;
  private config?: Config;

  /**
   * @param agent Authenticated ICP agent to interact with canisters
   * @param evmChain Target EVM chain (e.g., "Base", "Arbitrum", "Ethereum")
   * @param token Token to bridge (e.g., "USDC", "ICP")
   */
  constructor(
    private agent: Agent,
    private evmChain: EvmChain,
    private token: Token,
  ) {}

  /**
   * Set target deployment network.
   * @param deployment Target network ("Mainnet", "Testnet", or "Local")
   */
  target(deployment: Deployment): IcpToEvmBridgeBuilder {
    this.deployment = deployment;
    return this;
  }

  /**
   * Set sender ICP account.
   * @param principal ICP principal sending the tokens
   * @param subaccount Optional 32-byte subaccount
   */
  sender(principal: Principal, subaccount?: Uint8Array): IcpToEvmBridgeBuilder {
    this.icpAccount = { owner: principal, subaccount };
    return this;
  }

  /**
   * Set EVM recipient address.
   * @param address EVM address receiving the tokens
   */
  receiver(address: string): IcpToEvmBridgeBuilder {
    this.evmAddress = address;
    return this;
  }

  /**
   * @deprecated Use amountInUnits() instead
   */
  amountInTokens(amount: number): IcpToEvmBridgeBuilder {
    //this._amount = convert;
    return this;
  }

  /**
   * Set amount to bridge in token's smallest units.
   * @param amount Amount in base units (e.g., 1_500_000n for 1.5 USDC)
   */
  amountInUnits(amount: bigint): IcpToEvmBridgeBuilder {
    this.amount = amount;
    return this;
  }

  /**
   * Use custom configuration instead of defaults.
   * @param config Custom bridge configuration
   */
  withConfig(config: Config): IcpToEvmBridgeBuilder {
    this.config = config;
    return this;
  }

  /**
   * Build an ICP to EVM bridging plan.
   *
   * Creates a multi-step plan including: fee validation, ICP token approval/transfer,
   * EVM transaction signing/submission, block confirmation, and receipt validation.
   *
   * @returns Executable bridging plan
   * @throws Error if required parameters (sender, receiver, amount) are missing
   */
  async build(): Promise<BridgingPlan> {
    if (!this.icpAccount) {
      throw new Error("Sender ICP account is required");
    }
    if (!this.evmAddress) {
      throw new Error("Receiver EVM address is required");
    }
    if (!this.amount) {
      throw new Error("Transfer amount is required");
    }

    const config = this.config || DEFAULT_CONFIG;
    const decimals = getTokenDecimals(config, this.token);

    const oneSecId = Principal.fromText(
      config.icp.onesec.get(this.deployment)!,
    );
    const oneSecActor = await oneSecWithAgent(oneSecId, this.agent);

    const ledgerId = Principal.fromText(
      getTokenLedgerCanister(config, this.token, this.deployment)!,
    );

    const ledgerActor = await icrcLedgerWithAgent(
      this.token,
      this.agent,
      this.deployment,
      config,
    );

    const checkFeesAndLimitsStep = new FetchFeesAndCheckLimits(
      oneSecActor,
      this.token,
      "ICP",
      this.evmChain,
      decimals,
      false,
      this.amount,
    );

    const approveStep = new ApproveStep(
      ledgerActor,
      this.token,
      this.icpAccount,
      this.evmChain,
      this.evmAddress,
      this.amount,
      decimals,
      ledgerId,
      oneSecId,
    );

    const transferStep = new TransferStep(
      oneSecActor,
      this.token,
      this.icpAccount,
      this.evmChain,
      this.evmAddress,
      this.amount,
      decimals,
      ledgerId,
    );

    const waitForTxStep = new WaitForTxStep(
      oneSecActor,
      this.token,
      this.icpAccount,
      this.evmChain,
      this.evmAddress,
      decimals,
      transferStep,
      getIcpPollDelayMs(config, this.deployment),
    );
    const evmConfig = config.evm.get(this.evmChain)!;
    const confirmBlocksStep = new ConfirmBlocksStep(
      this.evmChain,
      evmConfig.confirmBlocks,
      evmConfig.blockTimeMs.get(this.deployment)!,
    );
    const validateReceiptStep = new ValidateReceiptStep(
      oneSecActor,
      this.token,
      this.evmChain,
      this.evmAddress,
      decimals,
      transferStep,
      getIcpPollDelayMs(config, this.deployment),
    );

    return new BridgingPlan([
      checkFeesAndLimitsStep,
      approveStep,
      transferStep,
      waitForTxStep,
      confirmBlocksStep,
      validateReceiptStep,
    ]);
  }
}

async function icrcLedgerWithAgent(
  token: Token,
  agent: Agent,
  deployment: Deployment,
  config: Config = DEFAULT_CONFIG,
): Promise<IcrcLedger> {
  return await Actor.createActor(IcrcLedgerIDL, {
    agent,
    canisterId: getTokenLedgerCanister(config, token, deployment)!,
  });
}
