import type {
    Chain,
    Details,
    EvmChain,
    IcrcAccount,
    OneSecForwarding,
    StepStatus,
    Token,
} from "../../../types";
import { BaseStep, err, ICP_CALL_DURATION_MS, ok } from "../../shared";
import { ComputeForwardingAddressStep } from "./computeForwardingAddressStep";

export class NotifyPaymentToForwardingAddressStep extends BaseStep {
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
            summary: "Notify payment to forwarding address",
            description: "Notify payment to forwarding address",
        };
    }

    chain(): Chain {
        return "ICP";
    }

    contract(): string | undefined {
        return undefined;
    }

    method(): string | undefined {
        return undefined;
    }

    args(): string | undefined {
        return undefined;
    }

    expectedDurationMs(): number {
        return ICP_CALL_DURATION_MS;
    }

    async run(): Promise<StepStatus> {
        this._status = {
            Pending: {
                summary: "Notifying payment to forwarding address",
                description: "Notifying payment to forwarding address",
            },
        };

        const forwardingAddress = this.computeForwardingAddressStep.getForwardingAddress();

        if (forwardingAddress === undefined) {
            this._status = {
                Done: err({
                    summary: "Missing forwarding address",
                    description: "Compute forwarding address step must run before this step",
                }),
            };
            return this._status;
        }

        try {

            await this.onesec.forwardEvmToIcp(this.token, this.evmChain, forwardingAddress, this.icpAccount);

            this._status = {
                Done: ok({
                    summary: "Notified payment to forwarding address",
                    description: "Notified payment to forwarding address",
                }),
            };
        } catch (error) {
            this._status = {
                Pending: {
                    summary: `Failed to notify payment`,
                    description: `Failed to notify payment: ${error}`,
                },
            };
        }

        return this._status;
    }
}
