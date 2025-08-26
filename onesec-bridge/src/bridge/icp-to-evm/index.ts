import { Actor, Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { BridgingPlan } from "../..";
import { Config, DEFAULT_CONFIG } from "../../config";
import {
  idlFactory as IcrcLedgerIDL,
  type _SERVICE as IcrcLedger,
} from "../../generated/candid/icrc_ledger/icrc_ledger.did";
import { Deployment, EvmChain, IcrcAccount, Token } from "../../types";
import { ConfirmBlocksStep, oneSecWithAgent } from "../shared";
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

    const oneSecId = Principal.fromText(
      this.config?.icp.oneSecCanisters.get(this.deployment) ??
        "5okwm-giaaa-aaaar-qbn6a-cai",
    );
    const oneSecActor = await oneSecWithAgent(oneSecId, this.agent);

    const ledgerId = Principal.fromText(
      this.config?.icp.ledgerCanisters.get(this.token) ??
        "mxzaz-hqaaa-aaaar-qaada-cai",
    );
    const ledgerActor = await icrcLedgerWithAgent(
      this.token,
      this.agent,
      config,
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
    const confirmBlocksStep = new ConfirmBlocksStep(this.evmChain, 10, 10);
    const validateReceiptStep = new ValidateReceiptStep(
      oneSecActor,
      oneSecId,
      this.evmChain,
      transferStep,
    );

    return new BridgingPlan(
      [
        approveStep,
        transferStep,
        waitForTxStep,
        confirmBlocksStep,
        validateReceiptStep,
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

async function icrcLedgerWithAgent(
  token: Token,
  agent: Agent,
  config?: Config,
): Promise<IcrcLedger> {
  return await Actor.createActor(IcrcLedgerIDL, {
    agent,
    canisterId: defaultIcrcLedgerCanisterId(token, config),
  });
}

function defaultIcrcLedgerCanisterId(
  token: Token,
  config: Config = DEFAULT_CONFIG,
): string {
  const canisterId = config.icp.ledgerCanisters.get(token);
  if (!canisterId) {
    throw new Error(`No ICRC ledger canister configured for token: ${token}`);
  }
  return canisterId;
}
