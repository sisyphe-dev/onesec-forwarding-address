import { Actor, HttpAgent, type Agent } from "@dfinity/agent";

import {
  idlFactory as OneSecIDL,
  type _SERVICE as OneSec,
} from "./generated/candid/onesec/onesec.did";
import { type Deployment } from "./types";
export { type _SERVICE as OneSec } from "./generated/candid/onesec/onesec.did";

export async function anonymousOneSec(deployment: Deployment): Promise<OneSec> {
  return await Actor.createActor(OneSecIDL, {
    agent: await anonymousAgent(deployment),
    canisterId: oneSecCanisterId(deployment),
  });
}

const _anonymousAgent: Map<Deployment, Agent> = new Map<Deployment, Agent>();

export async function anonymousAgent(deployment: Deployment): Promise<Agent> {
  let agent = _anonymousAgent.get(deployment);
  if (agent === undefined) {
    agent = HttpAgent.createSync({
      host: url(deployment),
    });
    if (deployment === "Local") {
      await agent.fetchRootKey();
    }
    _anonymousAgent.set(deployment, agent);
  }
  return agent;
}

function url(deployment: Deployment): string {
  switch (deployment) {
    case "Mainnet":
    case "Testnet":
      return "https://ic0.app";
    case "Local":
      return "http://127.0.0.1:8080";
  }
}

function oneSecCanisterId(deployment: Deployment): string {
  switch (deployment) {
    case "Mainnet":
    case "Local":
      return "5okwm-giaaa-aaaar-qbn6a-cai";
    case "Testnet":
      return "zvjow-lyaaa-aaaar-qap7q-cai";
  }
}
