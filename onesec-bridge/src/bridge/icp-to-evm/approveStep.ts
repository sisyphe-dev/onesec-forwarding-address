import { Principal } from "@dfinity/principal";
import { type _SERVICE as IcrcLedger } from "../../generated/candid/icrc_ledger/icrc_ledger.did";
import type { About, IcrcAccount, StepStatus, Token } from "../../types";
import { BaseStep, err, ICP_CALL_DURATION_MS, ok } from "../shared";

export class ApproveStep extends BaseStep {
  constructor(
    private ledgerActor: IcrcLedger,
    private ledgerId: Principal,
    private account: IcrcAccount,
    private token: Token,
    private amount: bigint,
    private oneSecId: Principal,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Approve transaction",
      verbose: `Approve transfer of ${this.token} to OneSec`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        concise: "Approving transaction",
        verbose: `Approving transfer of ${this.token} to OneSec`,
      },
    };

    const approvalResult = await this.ledgerActor.icrc2_approve({
      amount: this.amount,
      spender: { owner: this.oneSecId, subaccount: [] },
      fee: [],
      memo: [],
      from_subaccount: this.account.subaccount ? [this.account.subaccount] : [],
      created_at_time: [],
      expected_allowance: [],
      expires_at: [],
    });

    if ("Err" in approvalResult) {
      this._status = {
        Done: err({
          concise: "Failed to approve",
          verbose: `Failed to approve transfer of ${this.token} to OneSec: ${JSON.stringify(approvalResult.Err)}`,
        }),
      };
    } else {
      this._status = {
        Done: ok({
          concise: "Approved transaction",
          verbose: `Approved transfer of ${this.token} to OneSec`,
          transaction: {
            Icp: {
              blockIndex: approvalResult.Ok,
              ledger: this.ledgerId,
            },
          },
        }),
      };
    }

    return this._status;
  }
}
