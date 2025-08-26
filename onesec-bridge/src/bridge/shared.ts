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
  Result,
  Step,
  StepStatus,
  Token,
  TransferId,
  Tx,
} from "../types";

export const ICP_CALL_DURATION_MS = 5000;
export const EVM_CALL_DURATION_MS = 5000;

export abstract class BaseStep implements Step {
  protected _status: StepStatus = { Planned: null };

  abstract about(): About;
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

  about(): About {
    return {
      concise: "Confirm blocks",
      verbose: `Confirm ${this.blockCount} blocks on ${this.evmChain}`,
    };
  }

  expectedDurationMs(): number {
    return this.blockCount * this.blockTimeMs;
  }

  async run(): Promise<StepStatus> {
    if (this.startTime === undefined) {
      this.startTime = new Date();
      this._status = {
        Pending: {
          concise: "Confirming blocks",
          verbose: `Confirming ${this.blockCount} blocks on ${this.evmChain}`,
        },
      };
    }

    await sleep(1000);

    const elapsedMs = new Date().getTime() - this.startTime.getTime();

    const blocks = Math.floor(elapsedMs / this.blockTimeMs);

    if (blocks >= this.blockCount) {
      this._status = {
        Done: ok({
          concise: "Confirmed blocks",
          verbose: `Confirmed ${this.blockCount} blocks on ${this.evmChain}`,
        }),
      };
    } else {
      this._status = {
        Pending: {
          concise: "Confirming blocks",
          verbose: `Confirming ${blocks}/${this.blockCount} blocks on ${this.evmChain}`,
        },
      };
    }

    return this._status;
  }
}

export class CheckFeesAndLimitsStep extends BaseStep {
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
      concise: "Check fees and limits",
      verbose: "Check fees and limits",
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        concise: "Fetching fees and limits",
        verbose: "Fetching fees and limits",
      },
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
        Done: err({
          concise: "Bridging not supported",
          verbose: `Bridging of ${this.token} from ${this.sourceChain} to ${this.destinationChain} is not supported`,
        }),
      };
      return this._status;
    }

    if (this.amount !== undefined && this.amount < fee.minAmount) {
      this._status = {
        Done: err({
          concise: "Amount is too low",
          verbose: `Amount of tokens is too low: ${this.amount} < ${fee.minAmount}`,
        }),
      };
      return this._status;
    }

    if (this.amount !== undefined && this.amount > fee.maxAmount) {
      this._status = {
        Done: err({
          concise: "Amount is too high",
          verbose: `Amount of tokens is too high: ${this.amount} > ${fee.maxAmount}`,
        }),
      };
      return this._status;
    }

    if (
      this.amount !== undefined &&
      fee.available !== undefined &&
      this.amount > fee.available
    ) {
      this._status = {
        Done: err({
          concise: "Insufficient balance on destination chain",
          verbose: `There are only ${fee.available} tokens on ${this.destinationChain}`,
        }),
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
        Done: err({
          concise: "Bridging not supported",
          verbose: `Bridging of ${this.token} from ${this.sourceChain} to ${this.destinationChain} is not supported`,
        }),
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
        Done: ok({
          concise: "Checked fees and limits",
          verbose: "Checked fees and limits",
          expectedFee: new ExpectedFeeImpl(
            expectedTransferFee,
            expectedProtocolFeeInPercent,
            this.decimals,
          ),
        }),
      };
    } else {
      this._status = {
        Done: ok({
          concise: "Checked fees and limits",
          verbose: "Checked fees and limits",
        }),
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
  ) {}

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

// Helper functions for constructing Result::Done
export function ok(params: {
  concise: string;
  verbose: string;
  transaction?: Tx;
  amount?: Amount;
  link?: string;
  expectedFee?: ExpectedFee;
}): Result {
  return {
    Ok: {
      about: {
        concise: params.concise,
        verbose: params.verbose,
      },
      transaction: params.transaction,
      amount: params.amount,
      link: params.link,
      expectedFee: params.expectedFee,
    },
  };
}

export function err(params: {
  concise: string;
  verbose: string;
  transaction?: Tx;
  link?: string;
}): Result {
  return {
    Err: {
      about: {
        concise: params.concise,
        verbose: params.verbose,
      },
      transaction: params.transaction,
      link: params.link,
    },
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

export function format(amount: bigint, decimals: number): string {
  const tokens = bigintToNumberScaled(amount, decimals);
  const str = tokens.toFixed(6);
  let end = str.length;
  while (end > 2 && str[end - 1] === "0") {
    --end;
  }
  return str.slice(0, end);
}
