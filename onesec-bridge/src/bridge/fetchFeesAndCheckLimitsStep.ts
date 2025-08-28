import * as fromCandid from "../fromCandid";
import type { _SERVICE as OneSec } from "../generated/candid/onesec/onesec.did";
import type {
  About,
  Amount,
  Chain,
  ExpectedFee,
  StepStatus,
  Token,
} from "../types";
import { amountFromUnits, format, numberToBigintScaled } from "../utils";
import { BaseStep } from "./baseStep";
import { ICP_CALL_DURATION_MS } from "./shared";

/**
 * Implementation of the ExpectedFee interface for fee calculations.
 */
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

/**
 * Step that fetches transfer fees and validates bridging limits.
 *
 * This step queries the OneSec canister to get current fees and availability,
 * then validates that the requested bridging operation is within supported limits.
 */
export class FetchFeesAndCheckLimitsStep extends BaseStep {
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
    if (!this.canRun()) {
      return this._status;
    }

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
