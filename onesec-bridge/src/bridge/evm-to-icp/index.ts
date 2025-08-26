import { Principal } from "@dfinity/principal";
import { Contract, Signer } from "ethers";
import { BridgingPlan, oneSecForwarding } from "../..";
import { DEFAULT_CONFIG, type Config } from "../../config";
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
import { LockStep } from "./lock-step";
import { ValidateReceiptStep } from "./validate-receipt-step";
import { WaitForIcpTx } from "./wait-for-icp-tx";
import { ComputeForwardingAddressStep } from "./forwarding/computeForwardingAddressStep";
import { NotifyPaymentToForwardingAddressStep } from "./forwarding/notifyPaymentToForwardingAddressStep";
import { WaitForForwardingTxStep } from "./forwarding/waitForForwardingTxStep";
import { ValidateForwardingReceiptStep } from "./forwarding/validateForwardingReceiptStep";

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

    const mode = operatingMode(this.evmChain, this.token, config);

    const oneSecId = Principal.fromText(this.config?.icp.oneSecCanisters.get(this.deployment)!);
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
        );
        const [erc20Contract, erc20Address] = erc20(
          signer,
          this.evmChain,
          this.token,
          config,
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

    const computeForwardingAddressStep = new ComputeForwardingAddressStep(onesec, this.token, this.icpAccount, this.evmChain);

    const notifyPaymentToForwardingAddressStep = new NotifyPaymentToForwardingAddressStep(onesec, this.token, this.icpAccount, this.evmChain, computeForwardingAddressStep);

    const waitForForwardingTxStep = new WaitForForwardingTxStep(onesec, this.token, this.icpAccount, this.evmChain, computeForwardingAddressStep);

    const confirmBlocksStep = new ConfirmBlocksStep(this.evmChain, 10, 10);

    const validateForwardingReceiptStep = new ValidateForwardingReceiptStep(onesec, this.token, this.icpAccount, this.evmChain, computeForwardingAddressStep);

    const oneSecId = Principal.fromText(this.config?.icp.oneSecCanisters.get(this.deployment)!);
    const agent = await anonymousAgent(this.deployment, config);
    const oneSecActor = await oneSecWithAgent(oneSecId, agent);

    const waitForIcpTxStep = new WaitForIcpTx(
      oneSecActor,
      oneSecId,
      this.evmChain,
      validateForwardingReceiptStep,
    );

    return new BridgingPlan(
      [computeForwardingAddressStep, notifyPaymentToForwardingAddressStep, waitForForwardingTxStep, confirmBlocksStep, validateForwardingReceiptStep, waitForIcpTxStep],
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
  const mode = config.evm.get(chain)?.tokens.get(token)?.mode;
  if (!mode) {
    throw Error(`no EVM config for ${chain} and ${token}`);
  }
  return mode;
}

function erc20(
  signer: Signer,
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
): [Contract, string] {
  const tokenConfig = config.evm.get(chain)?.tokens.get(token);
  if (!tokenConfig) {
    throw Error(`no EVM config for ${chain} and ${token}`);
  }
  const abi =
    tokenConfig.mode === "minter"
      ? config.abi.erc20_and_minter
      : config.abi.erc20;
  return [new Contract(tokenConfig.erc20, abi, signer), tokenConfig.erc20];
}

function locker(
  signer: Signer,
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
): [Contract, string] {
  const tokenConfig = config.evm.get(chain)?.tokens.get(token);
  if (!tokenConfig || !tokenConfig.locker) {
    throw Error(`no EVM locker config for ${chain} and ${token}`);
  }
  return [
    new Contract(tokenConfig.locker, config.abi.locker, signer),
    tokenConfig.locker,
  ];
}
