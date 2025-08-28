import type {
  About,
  EvmChain,
  IcrcAccount,
  OneSecForwarding,
  StepStatus,
  Token,
  TransferId,
} from "../../../types";
import { BaseStep } from "../../baseStep";
import { formatIcpAccount } from "../../../utils";
import { ICP_CALL_DURATION_MS } from "../../shared";

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
      concise: `Compute forwarding address on ${this.evmChain}`,
      verbose: `Compute the forwarding address on ${this.evmChain} for bridging ${this.token} to ${formatIcpAccount(this.icpAccount)} on ICP`,
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
    if (!this.canRun()) {
      return this._status;
    }

    this._status = {
      state: "running",
      concise: "running",
      verbose: "computing forwarding address and validating it with OneSec",
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
      state: "succeeded",
      concise: `computed forwarding address: ${this.forwardingAddress}`,
      verbose: `computed forwarding address: ${this.forwardingAddress}`,
      forwardingAddress: this.forwardingAddress,
    };
    return this._status;
  }
}
