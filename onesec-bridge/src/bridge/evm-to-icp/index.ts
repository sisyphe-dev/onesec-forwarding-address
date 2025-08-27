import { Principal } from "@dfinity/principal";
import { Contract, Signer } from "ethers";
import { BridgingPlan, oneSecForwarding } from "../..";
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
import type {
  Deployment,
  EvmChain,
  IcrcAccount,
  Step,
  Token,
} from "../../types";
import {
  anonymousAgent,
  CheckFeesAndLimitsStep,
  ConfirmBlocksStep,
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

// EVM to ICP Bridge Builder
export class EvmToIcpBridgeBuilder {
  private deployment: Deployment = "Mainnet";
  private evmAddress?: string;
  private evmAmount?: bigint;
  private icpAccount?: IcrcAccount;
  private config?: Config;

  constructor(
    private evmChain: EvmChain,
    private token: Token,
  ) { }

  target(deployment: Deployment): EvmToIcpBridgeBuilder {
    this.deployment = deployment;
    return this;
  }

  sender(evmAddress: string): EvmToIcpBridgeBuilder {
    this.evmAddress = evmAddress;
    return this;
  }

  amountInUnits(amount: bigint): EvmToIcpBridgeBuilder {
    this.evmAmount = amount;
    return this;
  }

  receiver(icpAccount: IcrcAccount): EvmToIcpBridgeBuilder {
    this.icpAccount = icpAccount;
    return this;
  }

  withConfig(config: Config): EvmToIcpBridgeBuilder {
    this.config = config;
    return this;
  }

  async build(signer: Signer): Promise<BridgingPlan> {
    if (!this.evmAddress) {
      throw new Error("EVM address is required");
    }
    if (!this.evmAmount) {
      throw new Error("EVM amount is required");
    }
    if (!this.icpAccount) {
      throw new Error("ICP account is required");
    }

    const config = this.config || DEFAULT_CONFIG;

    const mode = getTokenEvmMode(config, this.token);
    const decimals = getTokenDecimals(config, this.token);

    const oneSecId = Principal.fromText(
      config.icp.onesec.get(this.deployment)!,
    );
    const agent = await anonymousAgent(this.deployment, config);
    const oneSecActor = await oneSecWithAgent(oneSecId, agent);

    const checkFeesAndLimitsStep = new CheckFeesAndLimitsStep(
      oneSecActor,
      this.token,
      this.evmChain,
      "ICP",
      decimals,
      false,
      this.evmAmount,
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
          this.evmAmount,
          decimals,
          lockerAddress,
        );
        const lockStep = new LockStep(
          lockerContract,
          this.token,
          this.evmChain,
          this.icpAccount,
          this.evmAmount,
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
          this.evmAmount,
          this.evmAddress,
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
          this.evmAmount,
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
          this.evmAmount,
          this.evmAddress,
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

  async forward(): Promise<BridgingPlan> {
    if (!this.evmAddress) {
      throw new Error("EVM address is required");
    }
    if (!this.evmAmount) {
      throw new Error("EVM amount is required");
    }
    if (!this.icpAccount) {
      throw new Error("ICP account is required");
    }

    const config = this.config || DEFAULT_CONFIG;
    const decimals = getTokenDecimals(config, this.token);

    const onesec = oneSecForwarding(this.deployment);
    const oneSecId = Principal.fromText(
      this.config?.icp.onesec.get(this.deployment)!,
    );
    const agent = await anonymousAgent(this.deployment, config);
    const oneSecActor = await oneSecWithAgent(oneSecId, agent);

    const checkFeesAndLimitsStep = new CheckFeesAndLimitsStep(
      oneSecActor,
      this.token,
      this.evmChain,
      "ICP",
      decimals,
      true,
      this.evmAmount,
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
