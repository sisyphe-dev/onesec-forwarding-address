import { Principal } from "@dfinity/principal";
import { Contract, Signer } from "ethers";
import { BridgingPlan } from "../..";
import {
  DEFAULT_CONFIG,
  getIcpPollDelayMs,
  getTokenConfig,
  getTokenDecimals,
  getTokenErc20Address,
  getTokenEvmMode,
  getTokenLockerAddress,
  type Config,
} from "../../config";
import { OneSecForwardingImpl } from "../../forwarding";
import type {
  Deployment,
  EvmChain,
  IcrcAccount,
  Step,
  Token,
} from "../../types";
import {
  anonymousAgent,
  ConfirmBlocksStep,
  FetchFeesAndCheckLimits,
  numberToBigintScaled,
  oneSecWithAgent,
} from "../shared";
import { ApproveStep } from "./approveStep";
import { BurnStep } from "./burnStep";
import { ComputeForwardingAddressStep } from "./forwarding/computeForwardingAddressStep";
import { NotifyForwardingPaymentStep } from "./forwarding/notifyForwardingPaymentStep";
import { ValidateForwardingReceiptStep } from "./forwarding/validateForwardingReceiptStep";
import { WaitForForwardingTxStep } from "./forwarding/waitForForwardingTxStep";
import { LockStep } from "./lockStep";
import { ValidateReceiptStep } from "./validateReceiptStep";
import { WaitForIcpTx } from "./waitForIcpTx";

/**
 * Builder for creating EVM to ICP token bridging plans.
 *
 * Supports two bridging modes:
 * - Direct bridging via `build()` - requires user to connect wallet and sign transactions
 * - Forwarding via `forward()` - user sends tokens to a generated forwarding address
 *
 * @example
 * ```typescript
 * // Direct bridging
 * const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
 *   .receiver(icpPrincipal)
 *   .amountInUnits(1_500_000n) // 1.5 USDC
 *   .build(evmSigner);
 *
 * // Forwarding (no signer needed)
 * const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
 *   .receiver(icpPrincipal)
 *   .amountInUnits(1_500_000n)
 *   .forward();
 * ```
 */
export class EvmToIcpBridgeBuilder {
  private deployment: Deployment = "Mainnet";
  private evmAddress?: string;
  private evmAmountInUnits?: bigint;
  private evmAmountInTokens?: number;
  private icpAccount?: IcrcAccount;
  private config?: Config;

  /**
   * @param evmChain Source EVM chain (e.g., "Base", "Arbitrum", "Ethereum")
   * @param token Token to bridge (e.g., "USDC", "ICP")
   */
  constructor(
    private evmChain: EvmChain,
    private token: Token,
  ) { }

  /**
   * Set target deployment network.
   * @param deployment Target network ("Mainnet", "Testnet", or "Local")
   */
  target(deployment: Deployment): EvmToIcpBridgeBuilder {
    this.deployment = deployment;
    return this;
  }

  /**
   * Set sender EVM address. Optional for direct bridging (inferred from signer).
   * @param evmAddress EVM address sending the tokens
   */
  sender(evmAddress: string): EvmToIcpBridgeBuilder {
    this.evmAddress = evmAddress;
    return this;
  }

  /**
   * Set amount to bridge in token's smallest units.
   * @param amount Amount in base units (e.g., 1_500_000n for 1.5 USDC)
   */
  amountInUnits(amount: bigint): EvmToIcpBridgeBuilder {
    this.evmAmountInUnits = amount;
    return this;
  }

  /**
   * Set amount to bridge in human-readable token units.
   * @param amount Amount in token units (e.g., 1.5 for 1.5 USDC)
   */
  amountInTokens(amount: number): EvmToIcpBridgeBuilder {
    this.evmAmountInTokens = amount;
    return this;
  }

  /**
   * Set ICP recipient account.
   * @param principal ICP principal receiving the tokens
   * @param subaccount Optional 32-byte subaccount
   */
  receiver(
    principal: Principal,
    subaccount?: Uint8Array,
  ): EvmToIcpBridgeBuilder {
    this.icpAccount = { owner: principal, subaccount };
    return this;
  }

  /**
   * Use custom configuration instead of defaults.
   * @param config Custom bridge configuration
   */
  withConfig(config: Config): EvmToIcpBridgeBuilder {
    this.config = config;
    return this;
  }

  /**
   * Build a direct bridging plan that requires wallet interaction.
   *
   * Creates a multi-step plan including: fee validation, EVM transaction approval/submission,
   * block confirmation, receipt validation, and ICP transfer completion.
   *
   * @param signer Ethereum signer to approve and submit transactions
   * @returns Executable bridging plan
   * @throws Error if required parameters (amount, receiver) are missing
   */
  async build(signer: Signer): Promise<BridgingPlan> {
    if (
      this.evmAmountInUnits === undefined &&
      this.evmAmountInTokens === undefined
    ) {
      throw new Error("Provide amount of tokens to bridge");
    }

    const config = this.config || DEFAULT_CONFIG;
    const decimals = getTokenDecimals(config, this.token);

    if (
      this.evmAmountInUnits !== undefined &&
      this.evmAmountInTokens !== undefined
    ) {
      if (
        numberToBigintScaled(this.evmAmountInTokens, decimals) !=
        this.evmAmountInUnits
      ) {
        throw new Error(
          "Provide either amount of tokens to bridge in units or token, but not both",
        );
      }
    }

    if (!this.icpAccount) {
      throw new Error("ICP account is required");
    }

    const signerAddress = await signer.getAddress();

    if (this.evmAddress && this.evmAddress != signerAddress) {
      throw new Error(
        `The provided EVM address ${this.evmAddress} doesn't match the signer's address ${signerAddress}`,
      );
    }

    const evmAddress = signerAddress;

    const mode = getTokenEvmMode(config, this.token);

    const amount =
      this.evmAmountInUnits !== undefined
        ? this.evmAmountInUnits
        : numberToBigintScaled(this.evmAmountInTokens!, decimals);

    const oneSecId = Principal.fromText(
      config.icp.onesec.get(this.deployment)!,
    );
    const agent = await anonymousAgent(this.deployment, config);
    const oneSecActor = await oneSecWithAgent(oneSecId, agent);

    const checkFeesAndLimitsStep = new FetchFeesAndCheckLimits(
      oneSecActor,
      this.token,
      this.evmChain,
      "ICP",
      decimals,
      false,
      amount,
    );

    let steps: Step[];
    switch (mode) {
      case "locker": {
        const [lockerContract, lockerAddress] = locker(
          signer,
          this.evmChain,
          this.token,
          config,
          this.deployment,
        );
        const [erc20Contract, erc20Address] = erc20(
          signer,
          this.evmChain,
          this.token,
          config,
          this.deployment,
        );
        const approveStep = new ApproveStep(
          erc20Contract,
          this.token,
          this.evmChain,
          this.icpAccount,
          amount,
          decimals,
          lockerAddress,
        );
        const lockStep = new LockStep(
          lockerContract,
          this.token,
          this.evmChain,
          this.icpAccount,
          amount,
          decimals,
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
          this.icpAccount,
          amount,
          evmAddress,
          lockStep,
          getIcpPollDelayMs(config, this.deployment),
        );
        const waitForIcpTxStep = new WaitForIcpTx(
          oneSecActor,
          this.token,
          this.icpAccount,
          decimals,
          validateReceiptStep,
          getIcpPollDelayMs(config, this.deployment),
        );
        steps = [
          checkFeesAndLimitsStep,
          approveStep,
          lockStep,
          confirmBlocksStep,
          validateReceiptStep,
          waitForIcpTxStep,
        ];
        break;
      }
      case "minter": {
        const [minterContract, minterAddress] = erc20(
          signer,
          this.evmChain,
          this.token,
          config,
          this.deployment,
        );
        const burnStep = new BurnStep(
          minterContract,
          this.token,
          this.evmChain,
          this.icpAccount,
          amount,
          decimals,
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
          this.icpAccount,
          amount,
          evmAddress,
          burnStep,
          getIcpPollDelayMs(config, this.deployment),
        );
        const waitForIcpTxStep = new WaitForIcpTx(
          oneSecActor,
          this.token,
          this.icpAccount,
          decimals,
          validateReceiptStep,
          getIcpPollDelayMs(config, this.deployment),
        );
        steps = [
          checkFeesAndLimitsStep,
          burnStep,
          confirmBlocksStep,
          validateReceiptStep,
          waitForIcpTxStep,
        ];
        break;
      }
    }

    return new BridgingPlan(steps);
  }

  /**
   * Build a forwarding-based bridging plan that doesn't require wallet connection.
   *
   * Creates a plan that generates a unique forwarding address where users can send tokens.
   * The plan includes: fee validation, address generation, payment notification, transaction
   * detection, block confirmation, receipt validation, and ICP transfer completion.
   *
   * @returns Executable bridging plan that provides a forwarding address
   * @throws Error if required parameters (amount, receiver) are missing
   */
  async forward(): Promise<BridgingPlan> {
    if (!this.icpAccount) {
      throw new Error("ICP account is required");
    }

    const config = this.config || DEFAULT_CONFIG;
    const decimals = getTokenDecimals(config, this.token);

    if (
      this.evmAmountInUnits !== undefined &&
      this.evmAmountInTokens !== undefined
    ) {
      if (
        numberToBigintScaled(this.evmAmountInTokens, decimals) !=
        this.evmAmountInUnits
      ) {
        throw new Error(
          "Provide either amount of tokens to bridge in units or token, but not both",
        );
      }
    }

    const amount =
      this.evmAmountInUnits !== undefined
        ? this.evmAmountInUnits
        : this.amountInTokens !== undefined
          ? numberToBigintScaled(this.evmAmountInTokens!, decimals)
          : undefined;

    const onesec = new OneSecForwardingImpl(this.deployment ?? "Mainnet");
    const oneSecId = Principal.fromText(
      config?.icp.onesec.get(this.deployment)!,
    );
    const agent = await anonymousAgent(this.deployment, config);
    const oneSecActor = await oneSecWithAgent(oneSecId, agent);

    const checkFeesAndLimitsStep = new FetchFeesAndCheckLimits(
      oneSecActor,
      this.token,
      this.evmChain,
      "ICP",
      decimals,
      true,
      amount,
    );

    const computeForwardingAddressStep = new ComputeForwardingAddressStep(
      onesec,
      this.token,
      this.evmChain,
      this.icpAccount,
    );

    const notifyForwardingPaymentStep = new NotifyForwardingPaymentStep(
      onesec,
      this.token,
      this.evmChain,
      this.icpAccount,
      computeForwardingAddressStep,
    );

    const waitForForwardingTxStep = new WaitForForwardingTxStep(
      onesec,
      this.token,
      this.evmChain,
      this.icpAccount,
      decimals,
      computeForwardingAddressStep,
      getIcpPollDelayMs(config, this.deployment),
    );

    const evmConfig = config.evm.get(this.evmChain)!;
    const confirmBlocksStep = new ConfirmBlocksStep(
      this.evmChain,
      evmConfig.confirmBlocks,
      evmConfig.blockTimeMs.get(this.deployment)!,
    );

    const validateForwardingReceiptStep = new ValidateForwardingReceiptStep(
      onesec,
      this.token,
      this.evmChain,
      this.icpAccount,
      computeForwardingAddressStep,
      getIcpPollDelayMs(config, this.deployment),
    );

    const waitForIcpTxStep = new WaitForIcpTx(
      oneSecActor,
      this.token,
      this.icpAccount,
      decimals,
      validateForwardingReceiptStep,
      getIcpPollDelayMs(config, this.deployment),
    );

    return new BridgingPlan([
      checkFeesAndLimitsStep,
      computeForwardingAddressStep,
      notifyForwardingPaymentStep,
      waitForForwardingTxStep,
      confirmBlocksStep,
      validateForwardingReceiptStep,
      waitForIcpTxStep,
    ]);
  }
}

function erc20(
  signer: Signer,
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
  deployment: Deployment = "Mainnet",
): [Contract, string] {
  const tokenConfig = getTokenConfig(config, token);
  const erc20Address = getTokenErc20Address(config, token, deployment, chain);
  if (!tokenConfig || !erc20Address) {
    throw Error(
      `no ERC20 address config for ${chain} and ${token} on ${deployment}`,
    );
  }
  const abi =
    tokenConfig.evmMode === "minter"
      ? config.abi.erc20_and_minter
      : config.abi.erc20;
  return [new Contract(erc20Address, abi, signer), erc20Address];
}

function locker(
  signer: Signer,
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
  deployment: Deployment = "Mainnet",
): [Contract, string] {
  const lockerAddress = getTokenLockerAddress(config, token, deployment, chain);
  if (!lockerAddress) {
    throw Error(
      `no EVM locker config for ${chain} and ${token} on ${deployment}`,
    );
  }
  return [
    new Contract(lockerAddress, config.abi.locker, signer),
    lockerAddress,
  ];
}
