import type {
  About,
  EvmChain,
  IcrcAccount,
  OneSecForwarding,
  StepStatus,
  Token,
} from "../../../types";
import { BaseStep, ICP_CALL_DURATION_MS, ok } from "../../shared";
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
      concise: "Notify forwarding payment",
      verbose: `Notify OneSec canister about ${this.token} payment to the forwarding address on ${this.evmChain}`,
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
      Pending: {
        concise: "Notifying forwarding payment",
        verbose: `Notifying OneSec canister about ${this.token} payment to the forwarding address ${forwardingAddress} on ${this.evmChain}`,
      },
    };


    await this.onesec.forwardEvmToIcp(
      this.token,
      this.evmChain,
      forwardingAddress,
      this.icpAccount,
    );

    this._status = {
      Done: ok({
        concise: "Notified forwarding payment",
        verbose: `Notified OneSec canister about ${this.token} payment to the forwarding address ${forwardingAddress} on ${this.evmChain}`,
      }),
    };

    return this._status;
  }
}
