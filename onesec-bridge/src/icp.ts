import { Actor, HttpAgent, type Agent } from "@dfinity/agent";

import {
  idlFactory as OneSecIDL,
  type _SERVICE as OneSec,
} from "./generated/candid/onesec/onesec.did";

import { Principal } from "@dfinity/principal";
import { DEFAULT_CONFIG, type Config } from "./config";
import {
  idlFactory as IcrcLedgerIDL,
  type _SERVICE as IcrcLedger,
} from "./generated/candid/icrc_ledger/icrc_ledger.did";
import { Addresses, IcrcAccount, type Deployment, type Token } from "./types";
export { type _SERVICE as IcrcLedger } from "./generated/candid/icrc_ledger/icrc_ledger.did";
export { type _SERVICE as OneSec } from "./generated/candid/onesec/onesec.did";

export async function anonymousOneSec(
  deployment: Deployment,
  addresses?: Addresses,
  config?: Config,
): Promise<OneSec> {
  const agent = await anonymousAgent(deployment, config);
  return await oneSecWithAgent(deployment, agent, addresses, config);
}

export async function oneSecWithAgent(
  deployment: Deployment,
  agent: Agent,
  addresses?: Addresses,
  config?: Config,
): Promise<OneSec> {
  return await Actor.createActor(OneSecIDL, {
    agent,
    canisterId: oneSecCanisterId(deployment, addresses, config),
  });
}

export async function anonymousIcrcLedger(
  token: Token,
  deployment: Deployment,
  addresses?: Addresses,
  config?: Config,
): Promise<IcrcLedger> {
  const agent = await anonymousAgent(deployment, config);
  return await icrcLedgerWithAgent(token, agent, addresses, config);
}

export async function icrcLedgerWithAgent(
  token: Token,
  agent: Agent,
  addresses?: Addresses,
  config?: Config,
): Promise<IcrcLedger> {
  return await Actor.createActor(IcrcLedgerIDL, {
    agent,
    canisterId: icrcLedgerCanisterId(token, addresses, config),
  });
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

function defaultOneSecCanisterId(
  deployment: Deployment,
  config: Config = DEFAULT_CONFIG,
): string {
  const canisterId = config.icp.oneSecCanisters.get(deployment);
  if (!canisterId) {
    throw new Error(
      `No OneSec canister configured for deployment: ${deployment}`,
    );
  }
  return canisterId;
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

function icrcLedgerCanisterId(
  token: Token,
  addresses?: Addresses,
  config: Config = DEFAULT_CONFIG,
): string {
  return (
    addresses?.ledgers?.get(token) ?? defaultIcrcLedgerCanisterId(token, config)
  );
}

function oneSecCanisterId(
  deployment: Deployment,
  addresses?: Addresses,
  config: Config = DEFAULT_CONFIG,
): string {
  return addresses?.oneSec ?? defaultOneSecCanisterId(deployment, config);
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
