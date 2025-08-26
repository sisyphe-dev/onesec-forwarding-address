import type {
  Details,
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
    private icpAccount: IcrcAccount,
    private evmChain: EvmChain,
    private computeForwardingAddressStep: ComputeForwardingAddressStep,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: "Notify forwarding payment",
      description: "Notify forwarding payment",
    };
  }

  expectedDurationMs(): number {
    return ICP_CALL_DURATION_MS;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: "Notifying forwarding payment",
        description: "Notifying forwarding payment",
      },
    };

    const forwardingAddress =
      this.computeForwardingAddressStep.getForwardingAddress();

    if (forwardingAddress === undefined) {
      throw Error(
        "Missing forwarding address: the compute forwarding address step did not run",
      );
    }

    await this.onesec.forwardEvmToIcp(
      this.token,
      this.evmChain,
      forwardingAddress,
      this.icpAccount,
    );

    this._status = {
      Done: ok({
        summary: "Notified forwarding payment",
        description: "Notified forwarding payment",
      }),
    };

    return this._status;
  }
}
