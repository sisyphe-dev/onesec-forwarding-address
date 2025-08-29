import { Actor, HttpAgent, type Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { DEFAULT_CONFIG, type Config } from "../config";
import {
  idlFactory as OneSecIDL,
  type _SERVICE as OneSec,
} from "../generated/candid/onesec/onesec.did";
import type { Deployment } from "../types";

export const EVM_CALL_DURATION_MS = 5000;
export const ICP_CALL_DURATION_MS = 5000;

const _anonymousAgent: Map<Deployment, Agent> = new Map<Deployment, Agent>();

export async function anonymousAgent(
  deployment: Deployment,
  config: Config = DEFAULT_CONFIG,
): Promise<Agent> {
  let agent = _anonymousAgent.get(deployment);
  if (agent === undefined) {
    console.log(url(deployment, config));
    agent = await HttpAgent.create({
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
