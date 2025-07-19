import type { ActorMethod } from "@dfinity/agent";
import type { IDL } from "@dfinity/candid";
import type { Principal } from "@dfinity/principal";

export type Account = { Evm: EvmAccount } | { Icp: IcpAccount };
export interface Asset {
  tx: [] | [Tx];
  token: Token;
  chain: Chain;
  account: Account;
  amount: bigint;
}
export interface AssetInfo {
  tx: [] | [Tx];
  token: [] | [Token];
  chain: [] | [Chain];
  account: [] | [Account];
  amount: bigint;
}
export interface AssetRequest {
  token: Token;
  chain: Chain;
  account: Account;
  amount: [] | [bigint];
}
export interface CanisterCallResult {
  count: bigint;
  label: string;
}
export interface CanisterCalls {
  method: string;
  duration_in_ms: BigUint64Array | bigint[];
  results: Array<CanisterCallResult>;
  response_in_bytes: BigUint64Array | bigint[];
  canister: Principal;
  cost_in_cycles: BigUint64Array | bigint[];
}
export type Chain =
  | { ICP: null }
  | { Base: null }
  | { Ethereum: null }
  | { Arbitrum: null };
export type Deployment =
  | { Mainnet: null }
  | { Local: null }
  | { Test: null }
  | { Testnet: null };
export interface EcdsaMetadata {
  chain_code_hex: string;
  public_key_pem: string;
}
export type Endpoint =
  | { HttpRequest: null }
  | { GetTransfers: null }
  | { ValidateForwardingAddress: null }
  | { GetCanisterCalls: null }
  | { GetForwardingTransactions: null }
  | { SubmitForwardingUpdate: null }
  | { GetMetadata: null }
  | { GetRelayTasks: null }
  | { UpdateEstimates: null }
  | { ForwardEvmToIcp: null }
  | { GetForwardingAccounts: null }
  | { GetEvmAddress: null }
  | { ScheduleAllTasks: null }
  | { RunTask: null }
  | { GetWeiPerIcpRate: null }
  | { SubmitRelayProof: null }
  | { Transfer: null }
  | { GetEvents: null }
  | { GetForwardingAddress: null }
  | { GetTransfer: null }
  | { TransferEvmToIcp: null }
  | { TransferIcpToEvm: null };
export interface ErrorMessage {
  error: string;
}
export interface EvmAccount {
  address: string;
}
export interface EvmBlockStats {
  fetch_time_safe_ms: [] | [bigint];
  chain: [] | [EvmChain];
  fetch_time_latest_ms: [] | [bigint];
  block_number_safe: [] | [bigint];
  block_time_ms: bigint;
  block_number_latest: [] | [bigint];
}
export type EvmChain = { Base: null } | { Ethereum: null } | { Arbitrum: null };
export interface EvmChainMetadata {
  max_fee_per_gas_average: bigint;
  max_priority_fee_per_gas: bigint;
  fetch_time_safe_ms: [] | [bigint];
  chain: [] | [EvmChain];
  fetch_time_latest_ms: [] | [bigint];
  max_fee_per_gas: bigint;
  chain_id: bigint;
  block_number_safe: [] | [bigint];
  nonce: bigint;
  max_priority_fee_per_gas_average: bigint;
  block_time_ms: bigint;
  block_number_latest: [] | [bigint];
}
export type EvmTask =
  | { Reader: ReaderTask }
  | { Writer: WriterTask }
  | { Forwarder: ForwarderTask }
  | { Prover: ProverTask };
export interface EvmTx {
  log_index: [] | [bigint];
  hash: string;
}
export interface FetchedBlock {
  block_height: bigint;
}
export interface ForwardEvmToIcpArg {
  token: Token;
  chain: EvmChain;
  address: string;
  receiver: IcpAccount;
}
export interface ForwardedTx {
  total_tx_cost_in_wei: bigint;
  token: Token;
  address: string;
  nonce: bigint;
  lock_or_burn_tx: EvmTx;
  receiver: IcpAccount;
}
export type ForwarderTask = { SignTx: null };
export interface ForwardingAccount {
  token: Token;
  chain: EvmChain;
  address: string;
  receiver: IcpAccount;
}
export interface ForwardingBalance {
  token: Token;
  balance: bigint;
  address: string;
}
export interface ForwardingResponse {
  status: [] | [ForwardingStatus];
  done: [] | [TransferId];
}
export type ForwardingStatus =
  | {
      LowBalance: { balance: bigint; min_amount: bigint };
    }
  | { CheckingBalance: null }
  | { Forwarding: null }
  | { Forwarded: EvmTx };
export interface ForwardingUpdate {
  forwarded: Array<ForwardedTx>;
  to_sign: Array<UnsignedForwardingTx>;
  chain: EvmChain;
  balances: Array<ForwardingBalance>;
}
export interface GetTransfersArg {
  count: bigint;
  skip: bigint;
  accounts: Array<Account>;
}
export type IcpAccount =
  | {
      ICRC: {
        owner: Principal;
        subaccount: [] | [Uint8Array | number[]];
      };
    }
  | { AccountId: string };
export type IcpTask =
  | { InitializeEcdsaPublicKey: null }
  | { RefreshExchangeRate: null }
  | { Ledger: { token: Token; task: LedgerTask } };
export interface IcpTokenMetadata {
  token: [] | [Token];
  ledger: Principal;
  index: [] | [Principal];
}
export interface IcpTx {
  block_index: bigint;
  ledger: Principal;
}
export interface InitArg {
  evm: Array<InitEvmArg>;
  icp: [] | [InitIcpArg];
  deployment: Deployment;
}
export interface InitEvmArg {
  initial_nonce: [] | [bigint];
  chain: EvmChain;
  initial_block: [] | [bigint];
  ledger: Array<InitEvmTokenArg>;
}
export interface InitEvmTokenArg {
  token: Token;
  initial_balance: [] | [bigint];
  logger_address: [] | [string];
  erc20_address: [] | [string];
}
export interface InitIcpArg {
  ledger: Array<InitIcpTokenArg>;
}
export interface InitIcpTokenArg {
  token: Token;
  initial_balance: [] | [bigint];
}
export type InitOrUpgradeArg = { Upgrade: UpgradeArg } | { Init: InitArg };
export type LedgerTask = { TransferFee: null } | { Transfer: null };
export interface Metadata {
  stable_memory_bytes: bigint;
  wasm_memory_bytes: bigint;
  event_count: bigint;
  ecdsa: [] | [EcdsaMetadata];
  tokens: Array<TokenMetadata>;
  cycle_balance: bigint;
  evm_chains: Array<EvmChainMetadata>;
  last_upgrade_time: bigint;
  event_bytes: bigint;
}
export type ProverTask = { FetchLatestBlock: null } | { FetchSafeBlock: null };
export interface RLP {
  bytes: Uint8Array | number[];
}
export type ReaderTask = { FetchTxLogs: null };
export type RelayProof =
  | {
      EvmBlockHeader: {
        block_hash: Uint8Array | number[];
        hint_priority_fee_per_gas: [] | [bigint];
        hint_fee_per_gas: [] | [bigint];
        block_header: Uint8Array | number[];
      };
    }
  | {
      EvmTransactionReceipt: {
        id: bigint;
        tx: TrieProof;
        receipt: TrieProof;
        block_hash: Uint8Array | number[];
      };
    }
  | { EvmBlockWithTxLogs: { block_number: bigint } };
export type RelayTask =
  | {
      SendEvmTransaction: { id: bigint; tx: RLP };
    }
  | { FetchEvmBlock: { block_number: bigint } };
export type RequestedTx =
  | { Burn: null }
  | { Lock: null }
  | { ApproveAndLock: null };
export type Result = { Ok: null } | { Err: string };
export interface SignedForwardingTx {
  total_tx_cost_in_wei: bigint;
  token: Token;
  approve_tx: [] | [RLP];
  address: string;
  nonce: bigint;
  lock_or_burn_tx: RLP;
  receiver: IcpAccount;
}
export type Status =
  | { Failed: ErrorMessage }
  | { Refunded: Tx }
  | { PendingRefundTx: null }
  | { PendingDestinationTx: null }
  | { Succeeded: null }
  | { PendingSourceTx: null };
export type Task =
  | { Evm: { chain: EvmChain; task: EvmTask } }
  | { Icp: IcpTask };
export type Token =
  | { BOB: null }
  | { ICP: null }
  | { GLDT: null }
  | { USDC: null }
  | { USDT: null }
  | { cbBTC: null }
  | { ckBTC: null };
export interface TokenMetadata {
  wei_per_token: number;
  decimals: number;
  token: [] | [Token];
  balance: bigint;
  contract: string;
  queue_size: bigint;
  chain: [] | [Chain];
  locker: [] | [string];
  topics: Array<Uint8Array | number[]>;
}
export interface Trace {
  entries: Array<TraceEntry>;
}
export interface TraceEntry {
  tx: [] | [Tx];
  end: [] | [bigint];
  result: [] | [Result];
  chain: [] | [Chain];
  block_number: [] | [bigint];
  event: [] | [TraceEvent];
  start: bigint;
}
export type TraceEvent =
  | { PendingConfirmTx: null }
  | { ConfirmTx: null }
  | { SendTx: null }
  | { FetchTx: null }
  | { SignTx: null };
export interface Transfer {
  end: [] | [bigint];
  status: [] | [Status];
  destination: AssetInfo;
  trace: Trace;
  source: AssetInfo;
  start: [] | [bigint];
  queue_position: [] | [bigint];
}
export interface TransferArg {
  destination: AssetRequest;
  source: Asset;
}
export interface TransferEvmToIcpArg {
  token: Token;
  evm_account: EvmAccount;
  icp_account: IcpAccount;
  evm_chain: EvmChain;
  evm_tx: EvmTx;
  evm_amount: bigint;
  icp_amount: [] | [bigint];
}
export interface TransferFee {
  source_chain: [] | [Chain];
  destination_chain: [] | [Chain];
  latest_transfer_fee_in_tokens: bigint;
  min_amount: bigint;
  average_transfer_fee_in_tokens: bigint;
  available: [] | [bigint];
  source_token: [] | [Token];
  max_amount: bigint;
  protocol_fee_in_percent: number;
  destination_token: [] | [Token];
}
export interface TransferIcpToEvmArg {
  token: Token;
  evm_account: EvmAccount;
  icp_account: IcpAccount;
  evm_chain: EvmChain;
  evm_amount: [] | [bigint];
  icp_amount: bigint;
}
export interface TransferId {
  id: bigint;
}
export type TransferResponse =
  | { Failed: ErrorMessage }
  | { Accepted: TransferId }
  | { Fetching: FetchedBlock };
export interface TransferStats {
  source_chain: [] | [Chain];
  destination_chain: [] | [Chain];
  count: bigint;
  source_token: [] | [Token];
  duration_ms_avg: bigint;
  duration_ms_max: bigint;
  destination_token: [] | [Token];
}
export interface TrieProof {
  root_hash: Uint8Array | number[];
  value: RLP;
  nodes: Array<RLP>;
  index: bigint;
}
export type Tx = { Evm: EvmTx } | { Icp: IcpTx };
export interface UnsignedForwardingTx {
  token: Token;
  max_priority_fee_per_gas: bigint;
  max_fee_per_gas: bigint;
  requested_tx: RequestedTx;
  address: string;
  nonce: bigint;
  amount: bigint;
  receiver: IcpAccount;
}
export interface UpgradeArg {
  deployment: Deployment;
}
export type WriterTask =
  | { NewTx: null }
  | { PollTx: null }
  | { SendTx: null }
  | { FetchFeeEstimate: null };
export interface _SERVICE {
  forward_evm_to_icp: ActorMethod<
    [ForwardEvmToIcpArg],
    { Ok: ForwardingResponse } | { Err: string }
  >;
  get_canister_calls: ActorMethod<[], Array<CanisterCalls>>;
  get_events: ActorMethod<
    [bigint, bigint],
    { Ok: Array<string> } | { Err: string }
  >;
  get_events_bin: ActorMethod<
    [bigint, bigint],
    { Ok: Array<Uint8Array | number[]> } | { Err: string }
  >;
  get_evm_address: ActorMethod<[], [] | [string]>;
  get_evm_block_stats: ActorMethod<[EvmChain], EvmBlockStats>;
  get_evm_encoding: ActorMethod<[[] | [IcpAccount]], string>;
  get_forwarding_accounts: ActorMethod<
    [EvmChain, bigint, bigint],
    Array<ForwardingAccount>
  >;
  get_forwarding_address: ActorMethod<
    [IcpAccount],
    { Ok: string } | { Err: string }
  >;
  get_forwarding_status: ActorMethod<
    [ForwardEvmToIcpArg],
    { Ok: ForwardingResponse } | { Err: string }
  >;
  get_forwarding_transactions: ActorMethod<
    [EvmChain],
    Array<SignedForwardingTx>
  >;
  get_icp_token_metadata: ActorMethod<[], Array<IcpTokenMetadata>>;
  get_metadata: ActorMethod<[], { Ok: Metadata } | { Err: string }>;
  get_paused_endpoints: ActorMethod<[], Array<Endpoint>>;
  get_paused_tasks: ActorMethod<[], Array<Task>>;
  get_relay_tasks: ActorMethod<[EvmChain], Array<RelayTask>>;
  get_transfer: ActorMethod<[TransferId], { Ok: Transfer } | { Err: string }>;
  get_transfer_fees: ActorMethod<[], Array<TransferFee>>;
  get_transfer_stats: ActorMethod<[bigint], Array<TransferStats>>;
  get_transfers: ActorMethod<
    [GetTransfersArg],
    { Ok: Array<Transfer> } | { Err: string }
  >;
  get_wei_per_icp_rate: ActorMethod<[], number>;
  pause_all_tasks: ActorMethod<[], string>;
  pause_endpoint: ActorMethod<[Endpoint], string>;
  pause_task: ActorMethod<[Task], string>;
  resume_all_paused_endpoints: ActorMethod<[], string>;
  resume_all_paused_tasks: ActorMethod<[], string>;
  resume_endpoint: ActorMethod<[Endpoint], string>;
  resume_task: ActorMethod<[Task], string>;
  run_task: ActorMethod<[Task], string>;
  schedule_all_tasks: ActorMethod<[], string>;
  submit_forwarding_update: ActorMethod<[ForwardingUpdate], Result>;
  submit_relay_proof: ActorMethod<[EvmChain, Array<RelayProof>], Result>;
  transfer: ActorMethod<[TransferArg], TransferResponse>;
  transfer_evm_to_icp: ActorMethod<[TransferEvmToIcpArg], TransferResponse>;
  transfer_icp_to_evm: ActorMethod<[TransferIcpToEvmArg], TransferResponse>;
  validate_forwarding_address: ActorMethod<[IcpAccount, string], Result>;
}
export declare const idlFactory: IDL.InterfaceFactory;
export declare const init: (args: { IDL: typeof IDL }) => IDL.Type[];
