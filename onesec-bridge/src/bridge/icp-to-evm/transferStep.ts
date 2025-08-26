import { Principal } from "@dfinity/principal";
import * as fromCandid from "../../fromCandid";
import { type _SERVICE as OneSec } from "../../generated/candid/onesec/onesec.did";
import * as toCandid from "../../toCandid";
import type {
  About,
  EvmChain,
  IcrcAccount,
  StepStatus,
  Token,
  TransferId,
} from "../../types";
import { BaseStep, err, format, ICP_CALL_DURATION_MS, ok } from "../shared";

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
    private decimals: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Transfer ${this.token}`,
      verbose: `Transfer ${format(this.icpAmount, this.decimals)} ${this.token} from ${this.icpAccount.owner.toText()} to OneSec canister ${this.oneSecId.toText()} for bridging to ${this.evmAddress} on ${this.evmChain}`,
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
        concise: `Transferring ${this.token}`,
        verbose: `Transferring ${this.token} to OneSec`,
      },
    };

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
          concise: `Failed to transfer ${this.token}`,
          verbose: `Failed to transfer ${this.token}: ${response.Failed.error}`,
        }),
      };
    } else if ("Accepted" in response) {
      this.transferId = response.Accepted;
      this._status = {
        Done: ok({
          concise: `Transferred ${this.token}`,
          verbose: `Transferred ${this.token} to OneSec`,
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

    return this._status;
  }
}
