import { Actor, HttpAgent, type Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { DEFAULT_CONFIG, type Config } from "../config";
import {
  idlFactory as OneSecIDL,
  type _SERVICE as OneSec,
} from "../generated/candid/onesec/onesec.did";
import {
  Amount,
  Chain,
  Deployment,
  Details,
  EvmChain,
  EvmTx,
  IcrcAccount,
  Result,
  Step,
  StepStatus,
  Token,
  TransferFee,
  TransferId,
  Tx,
} from "../types";
import * as fromCandid from "../fromCandid";

export const ICP_CALL_DURATION_MS = 5000;
export const EVM_CALL_DURATION_MS = 5000;

export abstract class BaseStep implements Step {
  protected _status: StepStatus = { Planned: null };

  abstract details(): Details;
  abstract chain(): Chain;
  abstract contract(): string | undefined;
  abstract method(): string | undefined;
  abstract args(): string | undefined;
  abstract run(): Promise<StepStatus>;
  abstract expectedDurationMs(): number;

  status(): StepStatus {
    return this._status;
  }
}

export interface GetEvmTx {
  getEvmTx(): EvmTx | undefined;
}

export interface GetTransferId {
  getTransferId(): TransferId | undefined;
}

export class ConfirmBlocksStep extends BaseStep {
  private startTime?: Date;
  constructor(
    private evmChain: EvmChain,
    private blockCount: number,
    private blockTimeMs: number,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Confirm blocks",
      description: `Confirm ${this.blockCount} blocks on ${this.evmChain}`,
    };
  }

  chain(): Chain {
    return this.evmChain;
  }

  contract(): string | undefined {
    return undefined;
  }

  method(): string | undefined {
    return undefined;
  }

  args(): string | undefined {
    return undefined;
  }

  expectedDurationMs(): number {
    return this.blockCount * this.blockTimeMs;
  }

  async run(): Promise<StepStatus> {
    if (this.startTime === undefined) {
      this.startTime = new Date();
      this._status = {
        Pending: {
          summary: "Confirming blocks",
          description: `Confirming ${this.blockCount} blocks on ${this.evmChain}`,
        },
      };
    }

    await sleep(1000);

    const elapsedMs = new Date().getTime() - this.startTime.getTime();

    const blocks = Math.floor(elapsedMs / this.blockTimeMs);

    if (blocks >= this.blockCount) {
      this._status = {
        Done: ok({
          summary: "Confirmed blocks",
          description: `Confirmed ${this.blockCount} blocks on ${this.evmChain}`,
        }),
      };
    } else {
      this._status = {
        Pending: {
          summary: "Confirming blocks",
          description: `Confirming ${blocks}/${this.blockCount} blocks on ${this.evmChain}`,
        },
      };
    }

    return this._status;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper functions for constructing Result::Done
export function ok(
  details: Details,
  transaction?: Tx,
  amount?: Amount,
  link?: string,
): Result {
  return {
    Ok: {
      details,
      transaction,
      amount,
      link,
    },
  };
}

export function err(details: Details): Result {
  return {
    Err: details,
  };
}

const TAG_ICRC = 0;

// Format of the first array:
// - bytes[0] = tag: ICRC or account identifier.
// - bytes[1..32] = encoded principal.
// Format of the second array:
// - empty if there is no subaccount
// - otherwise, subaccount bytes.
export function encodeIcrcAccount(
  account: IcrcAccount,
): [Uint8Array, Uint8Array?] {
  const principal = encodePrincipal(account.owner);
  if (account.subaccount) {
    return [principal, account.subaccount.slice()];
  }
  return [principal];
}

// Format:
// - bytes[0] = 0 (ICRC account tag)
// - bytes[1] = the length of the principal in bytes.
// - bytes[2..length+2] = the principal itself.
// - bytes[length+2..32] = zeros.
export function encodePrincipal(p: Principal): Uint8Array {
  const principal = p.toUint8Array();
  const array = new Uint8Array(32);
  array[0] = TAG_ICRC;
  array[1] = principal.length;
  array.set(principal, 2);
  return array;
}

const _anonymousAgent: Map<Deployment, Agent> = new Map<Deployment, Agent>();

export async function anonymousAgent(
  deployment: Deployment,
  config: Config = DEFAULT_CONFIG,
): Promise<Agent> {
  let agent = _anonymousAgent.get(deployment);
  if (agent === undefined) {
    agent = HttpAgent.createSync({
      host: url(deployment, config),
    });
    if (deployment === "Local") {
      await agent.fetchRootKey();
    }
    _anonymousAgent.set(deployment, agent);
  }
  return agent;
}

function url(deployment: Deployment, config: Config = DEFAULT_CONFIG): string {
  const host = config.icp.hosts.get(deployment);
  if (!host) {
    throw new Error(`No host configured for deployment: ${deployment}`);
  }
  return host;
}

export async function oneSecWithAgent(
  onesec: Principal,
  agent: Agent,
): Promise<OneSec> {
  return await Actor.createActor(OneSecIDL, {
    agent,
    canisterId: onesec.toText(),
  });
}

export async function anonymousOneSec(
  deployment: Deployment,
  config?: Config,
): Promise<OneSec> {
  const agent = await anonymousAgent(deployment, config);
  const onesec = Principal.fromText(
    defaultOneSecCanisterId(deployment, config),
  );
  return await oneSecWithAgent(onesec, agent);
}

function defaultOneSecCanisterId(
  deployment: Deployment,
  config: Config = DEFAULT_CONFIG,
): string {
  const canisterId = config.icp.onesec.get(deployment);
  if (!canisterId) {
    throw new Error(
      `No OneSec canister configured for deployment: ${deployment}`,
    );
  }
  return canisterId;
}

export async function fetchTransferFees(onesec: OneSec): Promise<TransferFee[]> {
  const response = await onesec.get_transfer_fees();
  return fromCandid.transferFees(response);
}

export function lookupTransferFee(fees: TransferFee[], token: Token, sourceChain: Chain, destinationChain: Chain): TransferFee | undefined {
  for (const fee of fees) {
    if (fee.token === token && fee.sourceChain === sourceChain && fee.destinationChain === destinationChain) {
      return fee;
    }
  }
  return undefined;
}