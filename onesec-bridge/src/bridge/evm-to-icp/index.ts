import { Principal } from "@dfinity/principal";
import { Contract, Signer } from "ethers";
import { BridgingPlan, oneSecForwarding } from "../..";
import { DEFAULT_CONFIG, type Config, getTokenConfig, getTokenErc20Address, getTokenLockerAddress } from "../../config";
import type {
  Deployment,
  EvmChain,
  IcrcAccount,
  Step,
  Token,
} from "../../types";
import { anonymousAgent, ConfirmBlocksStep, oneSecWithAgent } from "../shared";
import { ApproveStep } from "./approve-step";
import { BurnStep } from "./burn-step";
import { ComputeForwardingAddressStep } from "./forwarding/computeForwardingAddressStep";
import { NotifyPaymentToForwardingAddressStep } from "./forwarding/notifyPaymentToForwardingAddressStep";
import { ValidateForwardingReceiptStep } from "./forwarding/validateForwardingReceiptStep";
import { WaitForForwardingTxStep } from "./forwarding/waitForForwardingTxStep";
import { LockStep } from "./lock-step";
import { ValidateReceiptStep } from "./validate-receipt-step";
import { WaitForIcpTx } from "./wait-for-icp-tx";

type OperatingMode = "minter" | "locker";

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
  ) {}

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

    const mode = operatingMode(this.evmChain, this.token, config);

    const oneSecId = Principal.fromText(
      this.config?.icp.oneSecCanisters.get(this.deployment)!,
    );
    const agent = await anonymousAgent(this.deployment, config);
    const oneSecActor = await oneSecWithAgent(oneSecId, agent);

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
          erc20Address,
          this.token,
          this.evmChain,
          this.evmAmount,
          lockerAddress,
        );
        const lockStep = new LockStep(
          lockerContract,
          lockerAddress,
          this.token,
          this.evmChain,
          this.evmAmount,
          this.icpAccount,
        );
        const confirmBlocksStep = new ConfirmBlocksStep(this.evmChain, 10, 10);
        const validateReceiptStep = new ValidateReceiptStep(
          oneSecActor,
          oneSecId,
          this.token,
          this.evmChain,
          this.evmAddress,
          this.evmAmount,
          this.icpAccount,
          lockStep,
        );
        const waitForIcpTxStep = new WaitForIcpTx(
          oneSecActor,
          oneSecId,
          this.evmChain,
          validateReceiptStep,
        );
        steps = [
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
          minterAddress,
          this.token,
          this.evmChain,
          this.evmAmount,
          this.icpAccount,
        );
        const confirmBlocksStep = new ConfirmBlocksStep(this.evmChain, 10, 10);
        const validateReceiptStep = new ValidateReceiptStep(
          oneSecActor,
          oneSecId,
          this.token,
          this.evmChain,
          this.evmAddress,
          this.evmAmount,
          this.icpAccount,
          burnStep,
        );
        const waitForIcpTxStep = new WaitForIcpTx(
          oneSecActor,
          oneSecId,
          this.evmChain,
          validateReceiptStep,
        );
        steps = [
          burnStep,
          confirmBlocksStep,
          validateReceiptStep,
          waitForIcpTxStep,
        ];
        break;
      }
    }

    return new BridgingPlan(
      steps,
      {
        inTokens: 0,
        inUnits: 0n,
      },
      {
        inTokens: 0,
        inUnits: 0n,
      },
    );
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

    const mode = operatingMode(this.evmChain, this.token, config);

    const onesec = oneSecForwarding(this.deployment);

    const computeForwardingAddressStep = new ComputeForwardingAddressStep(
      onesec,
      this.token,
      this.icpAccount,
      this.evmChain,
    );

    const notifyPaymentToForwardingAddressStep =
      new NotifyPaymentToForwardingAddressStep(
        onesec,
        this.token,
        this.icpAccount,
        this.evmChain,
        computeForwardingAddressStep,
      );

    const waitForForwardingTxStep = new WaitForForwardingTxStep(
      onesec,
      this.token,
      this.icpAccount,
      this.evmChain,
      computeForwardingAddressStep,
    );

    const confirmBlocksStep = new ConfirmBlocksStep(this.evmChain, 10, 10);

    const validateForwardingReceiptStep = new ValidateForwardingReceiptStep(
      onesec,
      this.token,
      this.icpAccount,
      this.evmChain,
      computeForwardingAddressStep,
    );

    const oneSecId = Principal.fromText(
      this.config?.icp.oneSecCanisters.get(this.deployment)!,
    );
    const agent = await anonymousAgent(this.deployment, config);
    const oneSecActor = await oneSecWithAgent(oneSecId, agent);

    const waitForIcpTxStep = new WaitForIcpTx(
      oneSecActor,
      oneSecId,
      this.evmChain,
      validateForwardingReceiptStep,
    );

    return new BridgingPlan(
      [
        computeForwardingAddressStep,
        notifyPaymentToForwardingAddressStep,
        waitForForwardingTxStep,
        confirmBlocksStep,
        validateForwardingReceiptStep,
        waitForIcpTxStep,
      ],
      {
        inTokens: 0,
        inUnits: 0n,
      },
      {
        inTokens: 0,
        inUnits: 0n,
      },
    );
  }
}

function operatingMode(
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
): OperatingMode {
  const tokenConfig = getTokenConfig(token);
  if (!tokenConfig) {
    throw Error(`no token config for ${token}`);
  }
  return tokenConfig.evmMode;
}

function erc20(
  signer: Signer,
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
  deployment: Deployment = "Mainnet",
): [Contract, string] {
  const tokenConfig = getTokenConfig(token);
  const erc20Address = getTokenErc20Address(token, deployment, chain);
  if (!tokenConfig || !erc20Address) {
    throw Error(`no ERC20 address config for ${chain} and ${token} on ${deployment}`);
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
  const lockerAddress = getTokenLockerAddress(token, deployment, chain);
  if (!lockerAddress) {
    throw Error(`no EVM locker config for ${chain} and ${token} on ${deployment}`);
  }
  return [
    new Contract(lockerAddress, config.abi.locker, signer),
    lockerAddress,
  ];
}
