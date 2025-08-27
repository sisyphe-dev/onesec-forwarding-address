import { Actor, HttpAgent, type Agent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { DEFAULT_CONFIG, type Config } from "../config";
import * as fromCandid from "../fromCandid";
import {
  idlFactory as OneSecIDL,
  type _SERVICE as OneSec,
} from "../generated/candid/onesec/onesec.did";
import {
  About,
  Amount,
  Chain,
  Deployment,
  EvmChain,
  EvmTx,
  ExpectedFee,
  IcrcAccount,
  StepStatus,
  Step,
  Token,
  TransferId,
  Tx,
} from "../types";

export const ICP_CALL_DURATION_MS = 5000;
export const EVM_CALL_DURATION_MS = 5000;

export abstract class BaseStep implements Step {
  protected _index?: number;
  protected _status: StepStatus = {
    state: "planned",
    concise: "Planned to run",
    verbose: "Planned to run",
  };

  abstract about(): About;
  abstract run(): Promise<StepStatus>;
  abstract expectedDurationMs(): number;

  status(): StepStatus {
    return this._status;
  }

  index(): number {
    return this._index!;
  }

  setIndex(index: number) {
    if (this._index !== undefined) {
      throw Error("index has already been set");
    }
    this._index = index;
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

  about(): About {
    return {
      concise: `Confirm blocks on ${this.evmChain}`,
      verbose: `Wait for ${this.blockCount} blocks on ${this.evmChain} until the transaction becomes confirmed`,
    };
  }

  expectedDurationMs(): number {
    return this.blockCount * this.blockTimeMs;
  }

  async run(): Promise<StepStatus> {
    if (this._status.state === "planned") {
      this.startTime = new Date();
      this._status = {
        state: "running",
        concise: `confirmed 0 out of ${this.blockCount} blocks`,
        verbose: `confirmed 0 out of ${this.blockCount} blocks`,
      };
    }
    await sleep(1000);
    const elapsedMs = new Date().getTime() - this.startTime!.getTime();
    const blocks = Math.floor(elapsedMs / this.blockTimeMs);
    if (blocks >= this.blockCount) {
      this._status = {
        state: "succeeded",
        concise: `confirmed ${this.blockCount} blocks`,
        verbose: `confirmed ${this.blockCount} blocks`,
      };
    } else {
      this._status = {
        state: "running",
        concise: `confirmed ${blocks} out of ${this.blockCount} blocks`,
        verbose: `confirmed ${blocks} out of ${this.blockCount} blocks`,
      };
    }
    return this._status;
  }
}

export class FetchFeesAndCheckLimits extends BaseStep {
  constructor(
    private onesec: OneSec,
    private token: Token,
    private sourceChain: Chain,
    private destinationChain: Chain,
    private decimals: number,
    private isForwarding: boolean,
    private amount?: bigint,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Fetch fees and check limits",
      verbose: `Fetch fees and check limits for ${this.token} from ${this.sourceChain} to ${this.destinationChain}`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      state: "running",
      concise: "running",
      verbose: "running",
    };

    const response = await this.onesec.get_transfer_fees();
    const fees = fromCandid.transferFees(response);
    const src = this.sourceChain;
    const dst = this.destinationChain;
    const fee = fees.find(
      (x) =>
        x.token === this.token &&
        x.sourceChain === src &&
        x.destinationChain == dst,
    );

    if (fee === undefined) {
      this._status = {
        state: "failed",
        concise: "bridging not supported",
        verbose: `bridging of ${this.token} from ${this.sourceChain} to ${this.destinationChain} is not supported`,
      };
      return this._status;
    }

    if (this.amount !== undefined && this.amount < fee.minAmount) {
      this._status = {
        state: "failed",
        concise: "amount is too low",
        verbose: `amount of tokens is too low: ${this.amount} < ${fee.minAmount}`,
      };
      return this._status;
    }

    if (this.amount !== undefined && this.amount > fee.maxAmount) {
      this._status = {
        state: "failed",
        concise: "amount is too high",
        verbose: `amount of tokens is too high: ${this.amount} > ${fee.maxAmount}`,
      };
      return this._status;
    }

    if (
      this.amount !== undefined &&
      fee.available !== undefined &&
      this.amount > fee.available
    ) {
      this._status = {
        state: "failed",
        concise: "insufficient balance on destination chain",
        verbose: `there are only ${fee.available} tokens on ${this.destinationChain}`,
      };
      return this._status;
    }

    const forwardingFee = fees.find(
      (x) =>
        x.token === this.token &&
        x.destinationChain === src &&
        x.sourceChain == dst,
    );

    if (forwardingFee === undefined) {
      this._status = {
        state: "failed",
        concise: "bridging not supported",
        verbose: `bridging of ${this.token} from ${this.sourceChain} to ${this.destinationChain} is not supported`,
      };
      return this._status;
    }

    const expectedTransferFeeInUnits = this.isForwarding
      ? forwardingFee.latestTransferFee
      : fee.latestTransferFee;
    const expectedProtocolFeeInPercent = fee.protocolFeeInPercent;

    const expectedTransferFee = amountFromUnits(
      expectedTransferFeeInUnits,
      this.decimals,
    );

    if (this.amount !== undefined) {
      this._status = {
        state: "succeeded",
        concise: "done",
        verbose: `expected fees: transfer=${format(expectedTransferFee.inUnits, this.decimals)}, protocol=${expectedProtocolFeeInPercent * 100}%`,
        expectedFee: new ExpectedFeeImpl(
          expectedTransferFee,
          expectedProtocolFeeInPercent,
          this.decimals,
        ),
      };
    } else {
      this._status = {
        state: "succeeded",
        concise: "done",
        verbose: `expected fees: transfer=${format(expectedTransferFee.inUnits, this.decimals)}, protocol=${expectedProtocolFeeInPercent * 100}%`,
      };
    }
    return this._status;
  }
}

class ExpectedFeeImpl implements ExpectedFee {
  constructor(
    private _transferFee: Amount,
    private _protocolFeeInPercent: number,
    private decimals: number,
  ) { }

  transferFee(): Amount {
    return this._transferFee;
  }

  protocolFee(amount: Amount): Amount {
    const expectedProtocolFeeInUnits = numberToBigintScaled(
      amount.inTokens * this._protocolFeeInPercent,
      this.decimals,
    );
    return amountFromUnits(expectedProtocolFeeInUnits, this.decimals);
  }

  protocolFeeInPercent(): number {
    return this._protocolFeeInPercent * 100;
  }

  totalFee(amount: Amount): Amount {
    const a = this.transferFee();
    const b = this.protocolFee(amount);
    return {
      inTokens: a.inTokens + b.inTokens,
      inUnits: a.inUnits + b.inUnits,
    };
  }
}

export function numberToBigintScaled(value: number, decimals: number): bigint {
  const [integerPart, fractionalPart = ""] = value.toFixed(decimals).split(".");

  const paddedFractionalPart = fractionalPart
    .padEnd(decimals, "0")
    .slice(0, decimals);

  const combined = `${integerPart}${paddedFractionalPart}`;
  return BigInt(combined);
}

export function bigintToNumberScaled(value: bigint, decimals: number): number {
  const str = value.toString();
  const len = str.length;
  if (decimals === 0) {
    return Number(str);
  }
  if (decimals >= len) {
    return Number("0." + str.padStart(decimals, "0"));
  }
  const diff = len - decimals;
  return Number(str.slice(0, diff) + "." + str.slice(diff));
}

export function amountFromUnits(units: bigint, decimals: number): Amount {
  return {
    inUnits: units,
    inTokens: bigintToNumberScaled(units, decimals),
  };
}

export function amountFromTokens(tokens: number, decimals: number): Amount {
  return {
    inUnits: numberToBigintScaled(tokens, decimals),
    inTokens: tokens,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function exponentialBackoff(
  currentDelayMs: number,
  maxDelayMs: number = 10_000,
): number {
  return Math.min(maxDelayMs, Math.max(currentDelayMs, 10) * 1.2);
}

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
  const TAG_ICRC = 0;
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

export function format(amount: bigint, decimals: number): string {
  const tokens = bigintToNumberScaled(amount, decimals);
  const str = tokens.toFixed(6);
  let end = str.length;
  while (end > 2 && str[end - 1] === "0" && str[end - 2] != '.') {
    --end;
  }
  return str.slice(0, end);
}

export function formatIcpAccount(account: IcrcAccount): string {
  if (account.subaccount && !account.subaccount.every((x) => x === 0)) {
    const subaccount = [...account.subaccount]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return `${account.owner.toText} / ${subaccount}`;
  }
  return account.owner.toText();
}

export function formatTx(tx?: Tx): string {
  if (tx === undefined) {
    return "";
  }
  if ("Icp" in tx) {
    return `${tx.Icp.ledger.toText()} / ${tx.Icp.blockIndex}`;
  } else if ("Evm" in tx) {
    return tx.Evm.hash;
  } else {
    return "";
  }
}
