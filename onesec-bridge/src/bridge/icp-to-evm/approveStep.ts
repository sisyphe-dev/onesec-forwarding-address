import { Principal } from "@dfinity/principal";
import {
  ApproveError,
  type _SERVICE as IcrcLedger,
} from "../../generated/candid/icrc_ledger/icrc_ledger.did";
import type {
  About,
  EvmChain,
  IcrcAccount,
  StepStatus,
  Token,
} from "../../types";
import { BaseStep } from "../baseStep";
import { format, formatTx } from "../../utils";
import { ICP_CALL_DURATION_MS } from "../shared";

export class ApproveStep extends BaseStep {
  constructor(
    private ledgerActor: IcrcLedger,
    private token: Token,
    private icpAccount: IcrcAccount,
    private evmChain: EvmChain,
    private evmAddress: string,
    private amount: bigint,
    private decimals: number,
    private ledgerId: Principal,
    private oneSecId: Principal,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Approve transfer on ICP`,
      verbose: `Approve transfer of ${format(this.amount, this.decimals)} ${this.token} to OneSec on ICP for bridging to ${this.evmAddress} on ${this.evmChain}`,
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
      verbose: `calling icrc2_approve of ${this.token} ledger`,
    };

    const approvalResult = await this.ledgerActor.icrc2_approve({
      amount: this.amount,
      spender: { owner: this.oneSecId, subaccount: [] },
      fee: [],
      memo: [],
      from_subaccount: this.icpAccount.subaccount
        ? [this.icpAccount.subaccount]
        : [],
      created_at_time: [],
      expected_allowance: [],
      expires_at: [],
    });

    if ("Err" in approvalResult) {
      this._status = {
        state: "failed",
        concise: "failed to approve",
        verbose: `failed to approve: ${formatError(approvalResult.Err)}`,
      };
    } else {
      const icpTx = {
        Icp: {
          blockIndex: approvalResult.Ok,
          ledger: this.ledgerId,
        },
      };
      this._status = {
        state: "succeeded",
        concise: "done",
        verbose: `icrc2_approve succeeded: ${formatTx(icpTx)}`,
        transaction: icpTx,
      };
    }

    return this._status;
  }
}

function formatError(err: ApproveError): string {
  const str = JSON.stringify(err, (_, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
  return str;
}
