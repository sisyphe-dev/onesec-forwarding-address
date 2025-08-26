import { Principal } from "@dfinity/principal";
import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import * as toCandid from "../../toCandid";
import type {
  Details,
  EvmChain,
  IcrcAccount,
  StepStatus,
  Token,
  TransferId,
} from "../../types";
import { BaseStep, err, ICP_CALL_DURATION_MS, ok } from "../shared";

export class TransferStep extends BaseStep {
  private transferId?: TransferId;

  constructor(
    private oneSecActor: OneSec,
    private oneSecId: Principal,
    private token: Token,
    private icpAccount: IcrcAccount,
    private icpAmount: bigint,
    private evmChain: EvmChain,
    private evmAddress: string,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: `Transfer ${this.token}`,
      description: `Transfer ${this.token} to OneSec`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  getTransferId(): TransferId | undefined {
    return this.transferId;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: `Transferring ${this.token}`,
        description: `Transferring ${this.token} to OneSec`,
      },
    };

    try {
      const result = await this.oneSecActor.transfer_icp_to_evm({
        token: toCandid.token(this.token),
        evm_chain: toCandid.chain(this.evmChain),
        evm_account: { address: this.evmAddress },
        icp_account: toCandid.icpAccount(this.icpAccount),
        icp_amount: this.icpAmount,
        evm_amount: [],
      });

      const response = fromCandid.transferResponse(result);

      if ("Failed" in response) {
        this._status = {
          Done: err({
            summary: `Failed to transfer ${this.token}`,
            description: `Failed to transfer ${this.token}: ${response.Failed.error}`,
          }),
        };
      } else if ("Accepted" in response) {
        this.transferId = response.Accepted;
        this._status = {
          Done: ok({
            summary: `Transferred ${this.token}`,
            description: `Transferred ${this.token} to OneSec`,
            transaction: {
              Icp: {
                blockIndex: response.Accepted.id,
                ledger: this.oneSecId,
              },
            },
          }),
        };
      } else if ("Fetching" in response) {
        throw Error(
          `unexpected response from transfer_icp_to_evm: ${JSON.stringify(response)}`,
        );
      }
    } catch (error) {
      this._status = {
        Done: err({
          summary: `Failed to transfer ${this.token}`,
          description: `Failed to transfer ${this.token}: ${error}`,
        }),
      };
    }

    return this._status;
  }
}
