import type {
  Chain,
  Details,
  EvmChain,
  IcrcAccount,
  OneSecForwarding,
  StepStatus,
  Token,
  TransferId,
} from "../../../types";
import { BaseStep, ICP_CALL_DURATION_MS, ok } from "../../shared";

export class ComputeForwardingAddressStep extends BaseStep {
  private lastTransferId?: TransferId;
  private forwardingAddress?: string;

  constructor(
    private onesec: OneSecForwarding,
    private token: Token,
    private icpAccount: IcrcAccount,
    private evmChain: EvmChain,
  ) {
    super();
  }

  details(): Details {
    return {
      summary: `Compute forwarding address`,
      description: `Compute forwarding address on ${this.evmChain} for receiving ${this.token} to ${this.icpAccount.owner}`,
    };
  }

  chain(): Chain {
    return this.evmChain;
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

  getForwardingAddress(): string | undefined {
    return this.forwardingAddress;
  }

  getLastTransferId(): TransferId | undefined {
    return this.lastTransferId;
  }

  async run(): Promise<StepStatus> {
    this._status = {
      Pending: {
        summary: `Computing forwarding address`,
        description: `Computing forwarding address on ${this.evmChain} for receiving ${this.token} to ${this.icpAccount.owner}`,
      },
    };

    try {
      this.forwardingAddress = await this.onesec.addressFor(this.icpAccount);
      const response = await this.onesec.getForwardingStatus(this.token, this.evmChain, this.forwardingAddress, this.icpAccount);
      this.lastTransferId = response.done;
      this._status = {
        Done: ok({
          summary: 'Computed forwarding address',
          description: `User can now send ${this.token} to ${this.forwardingAddress} on ${this.evmChain}`,
        }),
      };
    } catch (error) {
      this._status = {
        Pending: {
          summary: `Failed to compute forwarding address`,
          description: `Failed to compute forwarding address: ${error}`,
        },
      };
    }

    return this._status;
  }
}
