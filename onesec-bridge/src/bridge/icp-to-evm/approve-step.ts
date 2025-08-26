import { Principal } from "@dfinity/principal";
import { type _SERVICE as IcrcLedger } from "../../generated/candid/icrc_ledger/icrc_ledger.did";
import type {
  Chain,
  Details,
  IcrcAccount,
  StepStatus,
  Token,
} from "../../types";
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

  details(): Details {
    return {
      summary: "Approve transaction",
      description: `Approve transfer of ${this.token} to OneSec`,
    };
  }

  chain(): Chain {
    return "ICP";
  }

  contract(): string | undefined {
    return this.ledgerId.toText();
  }

  method(): string | undefined {
    return "icrc2_approve";
  }

  args(): string | undefined {
    return JSON.stringify({
      amount: this.amount.toString(),
      spender: this.oneSecId.toText(),
    });
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: "Approving transaction",
        description: `Approving transfer of ${this.token} to OneSec`,
      },
    };

    try {
      const approvalResult = await this.ledgerActor.icrc2_approve({
        amount: this.amount,
        spender: { owner: this.oneSecId, subaccount: [] },
        fee: [],
        memo: [],
        from_subaccount: this.account.subaccount
          ? [this.account.subaccount]
          : [],
        created_at_time: [],
        expected_allowance: [],
        expires_at: [],
      });

      if ("Err" in approvalResult) {
        this._status = {
          Done: err({
            summary: "Failed to approve",
            description: `Failed to approve transfer of ${this.token} to OneSec: ${JSON.stringify(approvalResult.Err)}`,
          }),
        };
      } else {
        this._status = {
          Done: ok({
            summary: "Approved transaction",
            description: `Approved transfer of ${this.token} to OneSec`,
            transaction: {
              Icp: {
                blockIndex: approvalResult.Ok,
                ledger: this.ledgerId,
              },
            },
          }),
        };
      }
    } catch (error) {
      this._status = {
        Done: err({
          summary: "Failed to approve",
          description: `Failed to approve transfer of ${this.token} to OneSec: ${error}`,
        }),
      };
    }

    return this._status;
  }
}
