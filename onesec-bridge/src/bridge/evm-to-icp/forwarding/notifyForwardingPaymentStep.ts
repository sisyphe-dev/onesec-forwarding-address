import type {
  About,
  EvmChain,
  IcrcAccount,
  OneSecForwarding,
  StepStatus,
  Token,
} from "../../../types";
import { BaseStep, ICP_CALL_DURATION_MS } from "../../shared";
import { ComputeForwardingAddressStep } from "./computeForwardingAddressStep";

export class NotifyForwardingPaymentStep extends BaseStep {
  constructor(
    private onesec: OneSecForwarding,
    private token: Token,
    private evmChain: EvmChain,
    private icpAccount: IcrcAccount,
    private computeForwardingAddressStep: ComputeForwardingAddressStep,
  ) {
    super();
  }

  about(): About {
    return {
      concise: `Notify user payment on ${this.evmChain}`,
      verbose: `Notify OneSec about a user payment to the forwarding address on ${this.evmChain}`,
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    const forwardingAddress =
      this.computeForwardingAddressStep.getForwardingAddress();

    if (forwardingAddress === undefined) {
      throw Error(
        "Missing forwarding address: the compute forwarding address step did not run",
      );
    }

    this._status = {
      state: "running",
      concise: "running",
      verbose: `calling forward_evm_to_icp of OneSec with forwarding address ${forwardingAddress}`,
    };

    await this.onesec.forwardEvmToIcp(
      this.token,
      this.evmChain,
      forwardingAddress,
      this.icpAccount,
    );

    this._status = {
      state: "succeeded",
      concise: "done",
      verbose: `notified user payment to ${forwardingAddress}`,
    };

    return this._status;
  }
}
