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
import {
  BaseStep,
  err,
  exponentialBackoff,
  formatIcpAccount,
  GetEvmTx,
  GetTransferId,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../shared";

export class ValidateReceiptStep extends BaseStep implements GetTransferId {
  private transferId?: TransferId;

  constructor(
    private oneSecActor: OneSec,
    private token: Token,
    private evmChain: EvmChain,
    private evmAddress: string,
    private evmAmount: bigint,
    private icpAccount: IcrcAccount,
    private getEvmTx: GetEvmTx,
    private delayMs: number,
  ) {
    super();
  }

  about(): About {
    return {
      concise: "Validate transaction receipt",
      verbose: `Wait for OneSec to validate the receipt of the transaction on ${this.evmChain} and initiate transfer to ${formatIcpAccount(this.icpAccount)} on ICP`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  getTransferId(): TransferId | undefined {
    return this.transferId;
  }

  async run(): Promise<StepStatus> {
    const evmTx = this.getEvmTx.getEvmTx();

    if (evmTx === undefined) {
      throw Error("Missing the EVM transaction. Please run the transfer step before running this step.");
    }

    this._status = {
      Pending: {
        concise: "Validate transaction receipt",
        verbose: `Waiting for OneSec to validate the receipt of transaction ${evmTx.hash} on ${this.evmChain} and initiate transfer to ${formatIcpAccount(this.icpAccount)} on ICP`,
      },
    };

    await sleep(this.delayMs);
    this.delayMs = exponentialBackoff(this.delayMs);

    const result = await this.oneSecActor.transfer_evm_to_icp({
      token: toCandid.token(this.token),
      evm_chain: toCandid.chain(this.evmChain),
      evm_account: toCandid.evmAccount(this.evmAddress),
      evm_tx: toCandid.evmTx(evmTx),
      icp_account: toCandid.icpAccount(this.icpAccount),
      evm_amount: this.evmAmount,
      icp_amount: [],
    });

    const response = fromCandid.transferResponse(result);

    if ("Accepted" in response) {
      this.transferId = { id: response.Accepted.id };
      this._status = {
        Done: ok({
          concise: "Validated transaction receipt",
          verbose: `OneSec validated the receipt of transaction ${evmTx.hash} on ${this.evmChain} and initiated transfer to ${formatIcpAccount(this.icpAccount)} on ICP: ${this.transferId}`,
        }),
      };
    } else if ("Failed" in response) {
      this._status = {
        Done: err({
          concise: "Failed to validate transaction receipt",
          verbose: `OneSec failed to validate the receipt of transaction ${evmTx.hash} on ${this.evmChain}: ${response.Failed.error}`,
        }),
      };
    }

    return this._status;
  }
}
