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
import {
  BaseStep,
  err,
  exponentialBackoff,
  GetEvmTx,
  GetTransferId,
  ICP_CALL_DURATION_MS,
  ok,
  sleep,
} from "../shared";

export class ValidateReceiptStep extends BaseStep implements GetTransferId {
  private delayMs: number = 1_000;
  private transferId?: TransferId;

  constructor(
    private oneSecActor: OneSec,
    private token: Token,
    private evmChain: EvmChain,
    private evmAddress: string,
    private evmAmount: bigint,
    private icpAccount: IcrcAccount,
    private getEvmTx: GetEvmTx,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Validate receipt",
      description: `Wait for OneSec to validate the receipt of the ${this.evmChain} transaction`,
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
        summary: "Validating receipt",
        description: `Waiting for OneSec to validate the receipt of the ${this.evmChain} transaction`,
      },
    };

    const evmTx = this.getEvmTx.getEvmTx();

    if (evmTx === undefined) {
      throw Error("Missing EVM transaction");
    }

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
          summary: "Validated receipt",
          description: `Validated receipt of the ${this.evmChain} transaction`,
        }),
      };
    } else if ("Failed" in response) {
      this._status = {
        Done: err({
          summary: "Failed to validate",
          description: `Failed to validate receipt: ${response.Failed.error}`,
        }),
      };
    } else {
      this._status = {
        Pending: {
          summary: "Validating receipt",
          description: `Waiting for OneSec to validate the receipt of the ${this.evmChain} transaction`,
        },
      };
    }

    return this._status;
  }
}
