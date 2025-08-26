import type { Principal } from "@dfinity/principal";

/**
 * Specifies a supported EVM chain.
 */
export type EvmChain = "Base" | "Arbitrum" | "Ethereum";

/**
 * Specifies a supported chain.
 */
export type Chain = "ICP" | EvmChain;

/**
 * Specifies a supported token.
 */
export type Token =
  | "ICP"
  | "USDC"
  | "USDT"
  | "cbBTC"
  | "ckBTC"
  | "BOB"
  | "GLDT";

/**
 * Specifies the network where the bridging smart contract is deployed.
 */
export type Deployment = "Mainnet" | "Testnet" | "Local";

export type OperatingMode = "minter" | "locker";

/**
 * An EVM transaction hash with an optional log index.
 */
export interface EvmTx {
  hash: string;
  logIndex?: bigint;
}

/**
 * An ICRC2 ledger transaction with the block index and the ledger canister id.
 */
export interface IcpTx {
  blockIndex: bigint;
  ledger: Principal;
}

/**
 * A general transaction type that can be either an EVM or an ICP transaction.
 */
export type Tx = { Evm: EvmTx } | { Icp: IcpTx };

/**
 * The unique identifier of an accepted transfer.
 */
export interface TransferId {
  id: bigint;
}

/**
 * An error message.
 */
export interface ErrorMessage {
  error: string;
}

/**
 * The status of the forwarding operation:
 * - `CheckingBalance` means that the forwarding request has been received and
 *   the balance of the forwarding address is being checked.
 * - `LowBalance` means that the forwarding address does not have enough tokens
 *   to start bridging.
 * - `Forwarding` means that the forwarding address has enough tokens and the
 *   actual forwarding has started.
 * - `Forwarded` means that the bridging helper contract has been invoked in the
 *    given transaction. Once the main contract accepts that transaction, this
 *    forwarding operation completes and the status moves back to `CheckingBalance`
 *    for the next forwarding operation. The `done` field of `ForwardingResponse`
 *    will contain the transfer id of the transfer.
 */
export type ForwardingStatus =
  | { CheckingBalance: null }
  | { LowBalance: { balance: bigint; minAmount: bigint } }
  | { Forwarding: null }
  | { Forwarded: EvmTx };

/**
 * A result of the `forward_evm_to_icp()` method
 */
export interface ForwardingResponse {
  /**
   * The result of the latest completed forwarding operation.
   * It is the id of the bridging transfer that was initiated by the forwarding
   * operation. The details of the transfer can be fetched using the
   * `getTransfer()` method.
   */
  done?: TransferId;

  /**
   * The status of the currently pending forwarding operation.
   * Note that when the current forwarding operation completes and stores the
   * new transfer id in the `done` field, then the status moves back to
   * `CheckingBalance` for the next forwarding operation.
   */
  status?: ForwardingStatus;
}

/**
 * An ICRC2 address.
 */
export interface IcrcAccount {
  owner: Principal;
  subaccount?: Uint8Array;
}

/**
 * An ICP ledger account id.
 */
export interface IcpAccountId {
  accountId: string;
}

/**
 * A general ICP address that can be either an ICRC2 address or an account-id.
 */
export type IcpAccount = { ICRC: IcrcAccount } | { AccountId: IcpAccountId };

/**
 * An EVM address.
 */
export interface EvmAccount {
  address: string;
}

/**
 * A general address that can be either an EVM or an ICP address.
 */
export type Account = { Evm: EvmAccount } | { Icp: IcpAccount };

/**
 * Details about bridged tokens.
 */
export interface AssetInfo {
  chain?: Chain;
  token?: Token;
  account?: Account;
  amount: bigint;
  tx?: Tx;
}

/**
 * The status of a bridging transfer
 */
export type Status =
  | { PendingSourceTx: null }
  | { PendingDestinationTx: null }
  | { PendingRefundTx: null }
  | { Failed: ErrorMessage }
  | { Refunded: { tx?: Tx } }
  | { Succeeded: null };

/**
 * Details of a bridging transfer.
 */
export interface Transfer {
  source: AssetInfo;
  destination: AssetInfo;
  status?: Status;
}

/**
 * The response from a transfer operation.
 */
export type TransferResponse =
  | { Failed: ErrorMessage }
  | { Accepted: TransferId }
  | { Fetching: { blockHeight: bigint } };

/**
 * A helper for bridging using forwarding addresses.
 */
export interface OneSecForwarding {
  /**
   * Computes the EVM forwarding address that can be used for bridging tokens
   * to the given ICP address.
   * @param receiver - the ICP address for receiving tokens on the ICP chain.
   * @returns the EVM forwarding address.
   */
  addressFor: (receiver: IcrcAccount) => Promise<string>;

  /**
   * Checks the current status of a potential forwarding request.
   *
   * This function should be called **after** `getForwardingStatus`.
   * It does **not** initiate a new forwarding request; it only inspects the current status.
   *
   * @param token - the token that is bridged.
   * @param chain - the source EVM chain.
   * @param forwardingAddress - the EVM forwarding address.
   * @param receiver - the ICP receiving address.
   *
   */
  getForwardingStatus: (
    token: Token,
    chain: EvmChain,
    forwardingAddress: string,
    receiver: IcrcAccount,
  ) => Promise<ForwardingResponse>;

  /**
   * Initiates bridging of tokens from the forwarding address on the EVM chain
   * to the receiving address on the ICP chain.
   *
   * The function should be called after the user transfers tokens to the
   * forwarding address.
   *
   * @param token - the token that is bridged.
   * @param chain - the source EVM chain.
   * @param forwardingAddress - the EVM forwarding address.
   * @param receiver - the ICP receiving address.
   */
  forwardEvmToIcp: (
    token: Token,
    chain: EvmChain,
    forwardingAddress: string,
    receiver: IcrcAccount,
  ) => Promise<ForwardingResponse>;

  /**
   * Fetches details of a bridging transfer by its id.
   *
   * @param transferId - the id of the transfer.
   */
  getTransfer: (transferId: TransferId) => Promise<Transfer>;
}

/**
 * The response of a get transfer fee query.
 */
export interface TransferFee {
  token: Token;
  sourceChain: Chain;
  destinationChain: Chain;
  minAmount: bigint;
  maxAmount: bigint;
  available?: bigint;
  latestTransferFee: bigint;
  averageTransferFee: bigint;
  protocolFeeInPercent: number;
}

export interface Amount {
  inTokens: number;
  inUnits: bigint;
}

export interface Details {
  summary: string;
  description: string;
}

export interface ExpectedFee {
  transferFee: () => Amount;
  protocolFee: (amount: Amount) => Amount;
  protocolFeeInPercent: () => number;
  totalFee: (amount: Amount) => Amount;
}

export type Result =
  | {
      Ok: {
        details: Details;
        amount?: Amount;
        transaction?: Tx;
        link?: string;
        expectedFee?: ExpectedFee;
      };
    }
  | {
      Err: Details;
    };

export type StepStatus =
  | { Planned: null }
  | { Pending: { summary: string; description: string } }
  | { Done: Result };

export interface Step {
  details: () => Details;

  chain: () => Chain;
  contract: () => string | undefined;
  method: () => string | undefined;
  args: () => string | undefined;

  status: () => StepStatus;

  run: () => Promise<StepStatus>;

  expectedDurationMs: () => number;
}

export interface BridgingPlan {
  steps: () => Step[];

  result: () => Result | undefined;

  lastStep: () => Step | undefined;

  nextStep: () => Step | undefined;

  runAllSteps: () => Promise<Result>;

  expectedDurationMs: () => number;
  expectedFees: () => Amount;
  expectedReceive: () => Amount;
}
