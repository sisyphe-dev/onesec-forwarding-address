import { Actor, Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { BridgingPlan } from "../..";
import {
  Config,
  DEFAULT_CONFIG,
  getTokenDecimals,
  getTokenLedgerCanister,
} from "../../config";
import {
  idlFactory as IcrcLedgerIDL,
  type _SERVICE as IcrcLedger,
} from "../../generated/candid/icrc_ledger/icrc_ledger.did";
import { Deployment, EvmChain, IcrcAccount, Token } from "../../types";
import {
  CheckFeesAndLimitsStep,
  ConfirmBlocksStep,
  oneSecWithAgent,
} from "../shared";
import { ApproveStep } from "./approve-step";
import { TransferStep } from "./transfer-step";
import { ValidateReceiptStep } from "./validate-receipt-step";
import { WaitForTxStep } from "./wait-for-tx-step";

// ICP to EVM Bridge Builder
export class IcpToEvmBridgeBuilder {
  private deployment: Deployment = "Mainnet";
  private amount?: bigint;
  private icpAccount?: IcrcAccount;
  private evmAddress?: string;
  private config?: Config;

  constructor(
    private agent: Agent,
    private evmChain: EvmChain,
    private token: Token,
  ) {}

  target(deployment: Deployment): IcpToEvmBridgeBuilder {
    this.deployment = deployment;
    return this;
  }

  sender(principal: Principal, subaccount?: Uint8Array): IcpToEvmBridgeBuilder {
    this.icpAccount = { owner: principal, subaccount };
    return this;
  }

  receiver(address: string): IcpToEvmBridgeBuilder {
    this.evmAddress = address;
    return this;
  }

  amountInTokens(amount: number): IcpToEvmBridgeBuilder {
    //this._amount = convert;
    return this;
  }

  amountInUnits(amount: bigint): IcpToEvmBridgeBuilder {
    this.amount = amount;
    return this;
  }

  withConfig(config: Config): IcpToEvmBridgeBuilder {
    this.config = config;
    return this;
  }

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

    const checkFeesAndLimitsStep = new CheckFeesAndLimitsStep(
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
      ledgerId,
      this.icpAccount,
      this.token,
      this.amount,
      oneSecId,
    );

    const transferStep = new TransferStep(
      oneSecActor,
      oneSecId,
      this.token,
      this.icpAccount,
      this.amount,
      this.evmChain,
      this.evmAddress,
    );

    const waitForTxStep = new WaitForTxStep(
      oneSecActor,
      oneSecId,
      this.evmChain,
      transferStep,
    );
    const evmConfig = config.evm.get(this.evmChain)!;
    const confirmBlocksStep = new ConfirmBlocksStep(
      this.evmChain,
      evmConfig.confirmBlocks,
      evmConfig.blockTimeMs.get(this.deployment)!,
    );
    const validateReceiptStep = new ValidateReceiptStep(
      oneSecActor,
      oneSecId,
      this.evmChain,
      transferStep,
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
