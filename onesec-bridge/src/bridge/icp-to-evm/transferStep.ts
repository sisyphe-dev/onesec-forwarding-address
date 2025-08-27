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
import { BaseStep, format, formatTx, ICP_CALL_DURATION_MS } from "../shared";

export class TransferStep extends BaseStep {
  private transferId?: TransferId;

  constructor(
    private oneSecActor: OneSec,
    private token: Token,
    private icpAccount: IcrcAccount,
    private evmChain: EvmChain,
    private evmAddress: string,
    private icpAmount: bigint,
    private decimals: number,
    private ledgerId: Principal,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Transfer on ICP`,
      verbose: `Transfer ${format(this.icpAmount, this.decimals)} ${this.token} to OneSec on ICP for bridging to ${this.evmAddress} on ${this.evmChain}`,
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
      state: "running",
      concise: "running",
      verbose: "calling transfer_icp_to_evm of OneSec",
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
        state: "failed",
        concise: "failed to transfer",
        verbose: `failed to transfer: ${response.Failed.error}`,
      };
    } else if ("Accepted" in response) {
      const icpTx = {
        Icp: {
          blockIndex: response.Accepted.id,
          ledger: this.ledgerId,
        },
      };
      this.transferId = response.Accepted;
      this._status = {
        state: "succeeded",
        concise: "done",
        verbose: `transferred tokens to OneSec: ${formatTx(icpTx)}`,
        transaction: icpTx,
      };
    } else if ("Fetching" in response) {
      throw Error(
        `unexpected response from transfer_icp_to_evm: ${JSON.stringify(response)}`,
      );
    }

    return this._status;
  }
}
