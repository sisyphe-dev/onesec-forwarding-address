import { Principal } from "@dfinity/principal";
import { Signer } from "ethers";
import { BridgingPlan } from "../..";
import { DEFAULT_CONFIG, type Config } from "../../config";
import { erc20, locker, operatingMode } from "../../evm";
import { anonymousAgent, oneSecWithAgent } from "../../icp";
import type {
  Deployment,
  EvmChain,
  IcrcAccount,
  Step,
  Token,
} from "../../types";
import { ConfirmBlocksStep } from "../shared";
import { ApproveStep } from "./approve-step";
import { BurnStep } from "./burn-step";
import { LockStep } from "./lock-step";
import { ValidateReceiptStep } from "./validate-receipt-step";
import { WaitForIcpTx } from "./wait-for-icp-tx";

// EVM to ICP Bridge Builder
export class EvmToIcpBridgeBuilder {
  private deployment: Deployment = "Mainnet";
  private evmAddress?: string;
  private evmAmount?: bigint;
  private icpAccount?: IcrcAccount;
  private config?: Config;

  constructor(
    private signer: Signer,
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

  async build(): Promise<BridgingPlan> {
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
      this.config?.icp.oneSecCanisters.get(this.deployment) ??
        "5okwm-giaaa-aaaar-qbn6a-cai",
    );
    const agent = await anonymousAgent(this.deployment, config);
    const oneSecActor = await oneSecWithAgent(oneSecId, agent);

    let steps: Step[];

    switch (mode) {
      case "locker": {
        const [lockerContract, lockerAddress] = locker(
          this.signer,
          this.evmChain,
          this.token,
          config,
        );
        const [erc20Contract, erc20Address] = erc20(
          this.signer,
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
          this.signer,
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
}
