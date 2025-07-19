export const idlFactory = ({ IDL }) => {
  const Deployment = IDL.Variant({
    Mainnet: IDL.Null,
    Local: IDL.Null,
    Test: IDL.Null,
    Testnet: IDL.Null,
  });
  const UpgradeArg = IDL.Record({ deployment: Deployment });
  const EvmChain = IDL.Variant({
    Base: IDL.Null,
    Ethereum: IDL.Null,
    Arbitrum: IDL.Null,
  });
  const Token = IDL.Variant({
    BOB: IDL.Null,
    ICP: IDL.Null,
    GLDT: IDL.Null,
    USDC: IDL.Null,
    USDT: IDL.Null,
    cbBTC: IDL.Null,
    ckBTC: IDL.Null,
  });
  const InitEvmTokenArg = IDL.Record({
    token: Token,
    initial_balance: IDL.Opt(IDL.Nat64),
    logger_address: IDL.Opt(IDL.Text),
    erc20_address: IDL.Opt(IDL.Text),
  });
  const InitEvmArg = IDL.Record({
    initial_nonce: IDL.Opt(IDL.Nat64),
    chain: EvmChain,
    initial_block: IDL.Opt(IDL.Nat64),
    ledger: IDL.Vec(InitEvmTokenArg),
  });
  const InitIcpTokenArg = IDL.Record({
    token: Token,
    initial_balance: IDL.Opt(IDL.Nat64),
  });
  const InitIcpArg = IDL.Record({ ledger: IDL.Vec(InitIcpTokenArg) });
  const InitArg = IDL.Record({
    evm: IDL.Vec(InitEvmArg),
    icp: IDL.Opt(InitIcpArg),
    deployment: Deployment,
  });
  const InitOrUpgradeArg = IDL.Variant({
    Upgrade: UpgradeArg,
    Init: InitArg,
  });
  const IcpAccount = IDL.Variant({
    ICRC: IDL.Record({
      owner: IDL.Principal,
      subaccount: IDL.Opt(IDL.Vec(IDL.Nat8)),
    }),
    AccountId: IDL.Text,
  });
  const ForwardEvmToIcpArg = IDL.Record({
    token: Token,
    chain: EvmChain,
    address: IDL.Text,
    receiver: IcpAccount,
  });
  const EvmTx = IDL.Record({
    log_index: IDL.Opt(IDL.Nat64),
    hash: IDL.Text,
  });
  const ForwardingStatus = IDL.Variant({
    LowBalance: IDL.Record({ balance: IDL.Nat, min_amount: IDL.Nat }),
    CheckingBalance: IDL.Null,
    Forwarding: IDL.Null,
    Forwarded: EvmTx,
  });
  const TransferId = IDL.Record({ id: IDL.Nat64 });
  const ForwardingResponse = IDL.Record({
    status: IDL.Opt(ForwardingStatus),
    done: IDL.Opt(TransferId),
  });
  const CanisterCallResult = IDL.Record({
    count: IDL.Nat64,
    label: IDL.Text,
  });
  const CanisterCalls = IDL.Record({
    method: IDL.Text,
    duration_in_ms: IDL.Vec(IDL.Nat64),
    results: IDL.Vec(CanisterCallResult),
    response_in_bytes: IDL.Vec(IDL.Nat64),
    canister: IDL.Principal,
    cost_in_cycles: IDL.Vec(IDL.Nat64),
  });
  const EvmBlockStats = IDL.Record({
    fetch_time_safe_ms: IDL.Opt(IDL.Nat64),
    chain: IDL.Opt(EvmChain),
    fetch_time_latest_ms: IDL.Opt(IDL.Nat64),
    block_number_safe: IDL.Opt(IDL.Nat64),
    block_time_ms: IDL.Nat64,
    block_number_latest: IDL.Opt(IDL.Nat64),
  });
  const ForwardingAccount = IDL.Record({
    token: Token,
    chain: EvmChain,
    address: IDL.Text,
    receiver: IcpAccount,
  });
  const RLP = IDL.Record({ bytes: IDL.Vec(IDL.Nat8) });
  const SignedForwardingTx = IDL.Record({
    total_tx_cost_in_wei: IDL.Nat64,
    token: Token,
    approve_tx: IDL.Opt(RLP),
    address: IDL.Text,
    nonce: IDL.Nat64,
    lock_or_burn_tx: RLP,
    receiver: IcpAccount,
  });
  const IcpTokenMetadata = IDL.Record({
    token: IDL.Opt(Token),
    ledger: IDL.Principal,
    index: IDL.Opt(IDL.Principal),
  });
  const EcdsaMetadata = IDL.Record({
    chain_code_hex: IDL.Text,
    public_key_pem: IDL.Text,
  });
  const Chain = IDL.Variant({
    ICP: IDL.Null,
    Base: IDL.Null,
    Ethereum: IDL.Null,
    Arbitrum: IDL.Null,
  });
  const TokenMetadata = IDL.Record({
    wei_per_token: IDL.Float64,
    decimals: IDL.Nat8,
    token: IDL.Opt(Token),
    balance: IDL.Nat,
    contract: IDL.Text,
    queue_size: IDL.Nat64,
    chain: IDL.Opt(Chain),
    locker: IDL.Opt(IDL.Text),
    topics: IDL.Vec(IDL.Vec(IDL.Nat8)),
  });
  const EvmChainMetadata = IDL.Record({
    max_fee_per_gas_average: IDL.Nat64,
    max_priority_fee_per_gas: IDL.Nat64,
    fetch_time_safe_ms: IDL.Opt(IDL.Nat64),
    chain: IDL.Opt(EvmChain),
    fetch_time_latest_ms: IDL.Opt(IDL.Nat64),
    max_fee_per_gas: IDL.Nat64,
    chain_id: IDL.Nat64,
    block_number_safe: IDL.Opt(IDL.Nat64),
    nonce: IDL.Nat64,
    max_priority_fee_per_gas_average: IDL.Nat64,
    block_time_ms: IDL.Nat64,
    block_number_latest: IDL.Opt(IDL.Nat64),
  });
  const Metadata = IDL.Record({
    stable_memory_bytes: IDL.Nat64,
    wasm_memory_bytes: IDL.Nat64,
    event_count: IDL.Nat64,
    ecdsa: IDL.Opt(EcdsaMetadata),
    tokens: IDL.Vec(TokenMetadata),
    cycle_balance: IDL.Nat,
    evm_chains: IDL.Vec(EvmChainMetadata),
    last_upgrade_time: IDL.Nat64,
    event_bytes: IDL.Nat64,
  });
  const Endpoint = IDL.Variant({
    HttpRequest: IDL.Null,
    GetTransfers: IDL.Null,
    ValidateForwardingAddress: IDL.Null,
    GetCanisterCalls: IDL.Null,
    GetForwardingTransactions: IDL.Null,
    SubmitForwardingUpdate: IDL.Null,
    GetMetadata: IDL.Null,
    GetRelayTasks: IDL.Null,
    UpdateEstimates: IDL.Null,
    ForwardEvmToIcp: IDL.Null,
    GetForwardingAccounts: IDL.Null,
    GetEvmAddress: IDL.Null,
    ScheduleAllTasks: IDL.Null,
    RunTask: IDL.Null,
    GetWeiPerIcpRate: IDL.Null,
    SubmitRelayProof: IDL.Null,
    Transfer: IDL.Null,
    GetEvents: IDL.Null,
    GetForwardingAddress: IDL.Null,
    GetTransfer: IDL.Null,
    TransferEvmToIcp: IDL.Null,
    TransferIcpToEvm: IDL.Null,
  });
  const ReaderTask = IDL.Variant({ FetchTxLogs: IDL.Null });
  const WriterTask = IDL.Variant({
    NewTx: IDL.Null,
    PollTx: IDL.Null,
    SendTx: IDL.Null,
    FetchFeeEstimate: IDL.Null,
  });
  const ForwarderTask = IDL.Variant({ SignTx: IDL.Null });
  const ProverTask = IDL.Variant({
    FetchLatestBlock: IDL.Null,
    FetchSafeBlock: IDL.Null,
  });
  const EvmTask = IDL.Variant({
    Reader: ReaderTask,
    Writer: WriterTask,
    Forwarder: ForwarderTask,
    Prover: ProverTask,
  });
  const LedgerTask = IDL.Variant({
    TransferFee: IDL.Null,
    Transfer: IDL.Null,
  });
  const IcpTask = IDL.Variant({
    InitializeEcdsaPublicKey: IDL.Null,
    RefreshExchangeRate: IDL.Null,
    Ledger: IDL.Record({ token: Token, task: LedgerTask }),
  });
  const Task = IDL.Variant({
    Evm: IDL.Record({ chain: EvmChain, task: EvmTask }),
    Icp: IcpTask,
  });
  const RelayTask = IDL.Variant({
    SendEvmTransaction: IDL.Record({ id: IDL.Nat64, tx: RLP }),
    FetchEvmBlock: IDL.Record({ block_number: IDL.Nat64 }),
  });
  const ErrorMessage = IDL.Record({ error: IDL.Text });
  const IcpTx = IDL.Record({
    block_index: IDL.Nat64,
    ledger: IDL.Principal,
  });
  const Tx = IDL.Variant({ Evm: EvmTx, Icp: IcpTx });
  const Status = IDL.Variant({
    Failed: ErrorMessage,
    Refunded: Tx,
    PendingRefundTx: IDL.Null,
    PendingDestinationTx: IDL.Null,
    Succeeded: IDL.Null,
    PendingSourceTx: IDL.Null,
  });
  const EvmAccount = IDL.Record({ address: IDL.Text });
  const Account = IDL.Variant({ Evm: EvmAccount, Icp: IcpAccount });
  const AssetInfo = IDL.Record({
    tx: IDL.Opt(Tx),
    token: IDL.Opt(Token),
    chain: IDL.Opt(Chain),
    account: IDL.Opt(Account),
    amount: IDL.Nat,
  });
  const Result = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text });
  const TraceEvent = IDL.Variant({
    PendingConfirmTx: IDL.Null,
    ConfirmTx: IDL.Null,
    SendTx: IDL.Null,
    FetchTx: IDL.Null,
    SignTx: IDL.Null,
  });
  const TraceEntry = IDL.Record({
    tx: IDL.Opt(Tx),
    end: IDL.Opt(IDL.Nat64),
    result: IDL.Opt(Result),
    chain: IDL.Opt(Chain),
    block_number: IDL.Opt(IDL.Nat64),
    event: IDL.Opt(TraceEvent),
    start: IDL.Nat64,
  });
  const Trace = IDL.Record({ entries: IDL.Vec(TraceEntry) });
  const Transfer = IDL.Record({
    end: IDL.Opt(IDL.Nat64),
    status: IDL.Opt(Status),
    destination: AssetInfo,
    trace: Trace,
    source: AssetInfo,
    start: IDL.Opt(IDL.Nat64),
    queue_position: IDL.Opt(IDL.Nat64),
  });
  const TransferFee = IDL.Record({
    source_chain: IDL.Opt(Chain),
    destination_chain: IDL.Opt(Chain),
    latest_transfer_fee_in_tokens: IDL.Nat,
    min_amount: IDL.Nat,
    average_transfer_fee_in_tokens: IDL.Nat,
    available: IDL.Opt(IDL.Nat),
    source_token: IDL.Opt(Token),
    max_amount: IDL.Nat,
    protocol_fee_in_percent: IDL.Float64,
    destination_token: IDL.Opt(Token),
  });
  const TransferStats = IDL.Record({
    source_chain: IDL.Opt(Chain),
    destination_chain: IDL.Opt(Chain),
    count: IDL.Nat64,
    source_token: IDL.Opt(Token),
    duration_ms_avg: IDL.Nat64,
    duration_ms_max: IDL.Nat64,
    destination_token: IDL.Opt(Token),
  });
  const GetTransfersArg = IDL.Record({
    count: IDL.Nat64,
    skip: IDL.Nat64,
    accounts: IDL.Vec(Account),
  });
  const ForwardedTx = IDL.Record({
    total_tx_cost_in_wei: IDL.Nat64,
    token: Token,
    address: IDL.Text,
    nonce: IDL.Nat64,
    lock_or_burn_tx: EvmTx,
    receiver: IcpAccount,
  });
  const RequestedTx = IDL.Variant({
    Burn: IDL.Null,
    Lock: IDL.Null,
    ApproveAndLock: IDL.Null,
  });
  const UnsignedForwardingTx = IDL.Record({
    token: Token,
    max_priority_fee_per_gas: IDL.Nat64,
    max_fee_per_gas: IDL.Nat64,
    requested_tx: RequestedTx,
    address: IDL.Text,
    nonce: IDL.Nat64,
    amount: IDL.Nat,
    receiver: IcpAccount,
  });
  const ForwardingBalance = IDL.Record({
    token: Token,
    balance: IDL.Nat,
    address: IDL.Text,
  });
  const ForwardingUpdate = IDL.Record({
    forwarded: IDL.Vec(ForwardedTx),
    to_sign: IDL.Vec(UnsignedForwardingTx),
    chain: EvmChain,
    balances: IDL.Vec(ForwardingBalance),
  });
  const TrieProof = IDL.Record({
    root_hash: IDL.Vec(IDL.Nat8),
    value: RLP,
    nodes: IDL.Vec(RLP),
    index: IDL.Nat64,
  });
  const RelayProof = IDL.Variant({
    EvmBlockHeader: IDL.Record({
      block_hash: IDL.Vec(IDL.Nat8),
      hint_priority_fee_per_gas: IDL.Opt(IDL.Nat64),
      hint_fee_per_gas: IDL.Opt(IDL.Nat64),
      block_header: IDL.Vec(IDL.Nat8),
    }),
    EvmTransactionReceipt: IDL.Record({
      id: IDL.Nat64,
      tx: TrieProof,
      receipt: TrieProof,
      block_hash: IDL.Vec(IDL.Nat8),
    }),
    EvmBlockWithTxLogs: IDL.Record({ block_number: IDL.Nat64 }),
  });
  const AssetRequest = IDL.Record({
    token: Token,
    chain: Chain,
    account: Account,
    amount: IDL.Opt(IDL.Nat),
  });
  const Asset = IDL.Record({
    tx: IDL.Opt(Tx),
    token: Token,
    chain: Chain,
    account: Account,
    amount: IDL.Nat,
  });
  const TransferArg = IDL.Record({
    destination: AssetRequest,
    source: Asset,
  });
  const FetchedBlock = IDL.Record({ block_height: IDL.Nat64 });
  const TransferResponse = IDL.Variant({
    Failed: ErrorMessage,
    Accepted: TransferId,
    Fetching: FetchedBlock,
  });
  const TransferEvmToIcpArg = IDL.Record({
    token: Token,
    evm_account: EvmAccount,
    icp_account: IcpAccount,
    evm_chain: EvmChain,
    evm_tx: EvmTx,
    evm_amount: IDL.Nat,
    icp_amount: IDL.Opt(IDL.Nat),
  });
  const TransferIcpToEvmArg = IDL.Record({
    token: Token,
    evm_account: EvmAccount,
    icp_account: IcpAccount,
    evm_chain: EvmChain,
    evm_amount: IDL.Opt(IDL.Nat),
    icp_amount: IDL.Nat,
  });
  return IDL.Service({
    forward_evm_to_icp: IDL.Func(
      [ForwardEvmToIcpArg],
      [IDL.Variant({ Ok: ForwardingResponse, Err: IDL.Text })],
      [],
    ),
    get_canister_calls: IDL.Func([], [IDL.Vec(CanisterCalls)], ["query"]),
    get_events: IDL.Func(
      [IDL.Nat64, IDL.Nat64],
      [IDL.Variant({ Ok: IDL.Vec(IDL.Text), Err: IDL.Text })],
      ["query"],
    ),
    get_events_bin: IDL.Func(
      [IDL.Nat64, IDL.Nat64],
      [IDL.Variant({ Ok: IDL.Vec(IDL.Vec(IDL.Nat8)), Err: IDL.Text })],
      ["query"],
    ),
    get_evm_address: IDL.Func([], [IDL.Opt(IDL.Text)], ["query"]),
    get_evm_block_stats: IDL.Func([EvmChain], [EvmBlockStats], ["query"]),
    get_evm_encoding: IDL.Func([IDL.Opt(IcpAccount)], [IDL.Text], ["query"]),
    get_forwarding_accounts: IDL.Func(
      [EvmChain, IDL.Nat64, IDL.Nat64],
      [IDL.Vec(ForwardingAccount)],
      ["query"],
    ),
    get_forwarding_address: IDL.Func(
      [IcpAccount],
      [IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })],
      ["query"],
    ),
    get_forwarding_status: IDL.Func(
      [ForwardEvmToIcpArg],
      [IDL.Variant({ Ok: ForwardingResponse, Err: IDL.Text })],
      ["query"],
    ),
    get_forwarding_transactions: IDL.Func(
      [EvmChain],
      [IDL.Vec(SignedForwardingTx)],
      ["query"],
    ),
    get_icp_token_metadata: IDL.Func(
      [],
      [IDL.Vec(IcpTokenMetadata)],
      ["query"],
    ),
    get_metadata: IDL.Func(
      [],
      [IDL.Variant({ Ok: Metadata, Err: IDL.Text })],
      ["query"],
    ),
    get_paused_endpoints: IDL.Func([], [IDL.Vec(Endpoint)], ["query"]),
    get_paused_tasks: IDL.Func([], [IDL.Vec(Task)], ["query"]),
    get_relay_tasks: IDL.Func([EvmChain], [IDL.Vec(RelayTask)], ["query"]),
    get_transfer: IDL.Func(
      [TransferId],
      [IDL.Variant({ Ok: Transfer, Err: IDL.Text })],
      ["query"],
    ),
    get_transfer_fees: IDL.Func([], [IDL.Vec(TransferFee)], ["query"]),
    get_transfer_stats: IDL.Func(
      [IDL.Nat64],
      [IDL.Vec(TransferStats)],
      ["query"],
    ),
    get_transfers: IDL.Func(
      [GetTransfersArg],
      [IDL.Variant({ Ok: IDL.Vec(Transfer), Err: IDL.Text })],
      ["query"],
    ),
    get_wei_per_icp_rate: IDL.Func([], [IDL.Float64], ["query"]),
    pause_all_tasks: IDL.Func([], [IDL.Text], []),
    pause_endpoint: IDL.Func([Endpoint], [IDL.Text], []),
    pause_task: IDL.Func([Task], [IDL.Text], []),
    resume_all_paused_endpoints: IDL.Func([], [IDL.Text], []),
    resume_all_paused_tasks: IDL.Func([], [IDL.Text], []),
    resume_endpoint: IDL.Func([Endpoint], [IDL.Text], []),
    resume_task: IDL.Func([Task], [IDL.Text], []),
    run_task: IDL.Func([Task], [IDL.Text], []),
    schedule_all_tasks: IDL.Func([], [IDL.Text], []),
    submit_forwarding_update: IDL.Func([ForwardingUpdate], [Result], []),
    submit_relay_proof: IDL.Func([EvmChain, IDL.Vec(RelayProof)], [Result], []),
    transfer: IDL.Func([TransferArg], [TransferResponse], []),
    transfer_evm_to_icp: IDL.Func(
      [TransferEvmToIcpArg],
      [TransferResponse],
      [],
    ),
    transfer_icp_to_evm: IDL.Func(
      [TransferIcpToEvmArg],
      [TransferResponse],
      [],
    ),
    validate_forwarding_address: IDL.Func(
      [IcpAccount, IDL.Text],
      [Result],
      ["query"],
    ),
  });
};
export const init = ({ IDL }) => {
  const Deployment = IDL.Variant({
    Mainnet: IDL.Null,
    Local: IDL.Null,
    Test: IDL.Null,
    Testnet: IDL.Null,
  });
  const UpgradeArg = IDL.Record({ deployment: Deployment });
  const EvmChain = IDL.Variant({
    Base: IDL.Null,
    Ethereum: IDL.Null,
    Arbitrum: IDL.Null,
  });
  const Token = IDL.Variant({
    BOB: IDL.Null,
    ICP: IDL.Null,
    GLDT: IDL.Null,
    USDC: IDL.Null,
    USDT: IDL.Null,
    cbBTC: IDL.Null,
    ckBTC: IDL.Null,
  });
  const InitEvmTokenArg = IDL.Record({
    token: Token,
    initial_balance: IDL.Opt(IDL.Nat64),
    logger_address: IDL.Opt(IDL.Text),
    erc20_address: IDL.Opt(IDL.Text),
  });
  const InitEvmArg = IDL.Record({
    initial_nonce: IDL.Opt(IDL.Nat64),
    chain: EvmChain,
    initial_block: IDL.Opt(IDL.Nat64),
    ledger: IDL.Vec(InitEvmTokenArg),
  });
  const InitIcpTokenArg = IDL.Record({
    token: Token,
    initial_balance: IDL.Opt(IDL.Nat64),
  });
  const InitIcpArg = IDL.Record({ ledger: IDL.Vec(InitIcpTokenArg) });
  const InitArg = IDL.Record({
    evm: IDL.Vec(InitEvmArg),
    icp: IDL.Opt(InitIcpArg),
    deployment: Deployment,
  });
  const InitOrUpgradeArg = IDL.Variant({
    Upgrade: UpgradeArg,
    Init: InitArg,
  });
  return [InitOrUpgradeArg];
};
