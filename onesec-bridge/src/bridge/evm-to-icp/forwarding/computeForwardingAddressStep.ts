import type {
  About,
  EvmChain,
  IcrcAccount,
  OneSecForwarding,
  StepStatus,
  Token,
  TransferId,
} from "../../../types";
import { BaseStep, formatIcpAccount, ICP_CALL_DURATION_MS, ok } from "../../shared";

export class ComputeForwardingAddressStep extends BaseStep {
  private lastTransferId?: TransferId;
  private forwardingAddress?: string;

  constructor(
    private onesec: OneSecForwarding,
    private token: Token,
    private evmChain: EvmChain,
    private icpAccount: IcrcAccount,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Compute forwarding address`,
      verbose: `Compute a forwarding address on ${this.evmChain} for bridging ${this.token} to ${formatIcpAccount(this.icpAccount)} on ICP`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  getForwardingAddress(): string | undefined {
    return this.forwardingAddress;
  }

  getLastTransferId(): TransferId | undefined {
    return this.lastTransferId;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        concise: `Computing forwarding address`,
        verbose: `Computing a forwarding address on ${this.evmChain} for bridging ${this.token} to ${formatIcpAccount(this.icpAccount)} on ICP`,
      },
    };

    this.forwardingAddress = await this.onesec.addressFor(this.icpAccount);
    const response = await this.onesec.getForwardingStatus(
      this.token,
      this.evmChain,
      this.forwardingAddress,
      this.icpAccount,
    );

    this.lastTransferId = response.done;
    this._status = {
      Done: ok({
        concise: `Computed forwarding address: ${this.forwardingAddress}`,
        verbose: `The user can now send ${this.token} to ${this.forwardingAddress} on ${this.evmChain} to bridge them to ${formatIcpAccount(this.icpAccount)} on ICP`,
      }),
    };
    return this._status;
  }
}


