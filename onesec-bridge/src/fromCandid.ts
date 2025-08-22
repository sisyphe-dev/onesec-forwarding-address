import type * as candid from "./generated/candid/onesec/onesec.did";
import type {
  Account,
  AssetInfo,
  Chain,
  EvmAccount,
  ForwardingResponse,
  ForwardingStatus,
  IcpAccount,
  Status,
  Token,
  Transfer,
  TransferResponse,
  Tx,
} from "./types";

export function forwardingStatus(
  status?: candid.ForwardingStatus,
): ForwardingStatus | undefined {
  if (status === undefined) {
    return undefined;
  }
  switch (true) {
    case "CheckingBalance" in status:
    case "Forwarding" in status:
      return status;
    case "LowBalance" in status:
      return {
        LowBalance: {
          balance: status.LowBalance.balance,
          minAmount: status.LowBalance.min_amount,
        },
      };
    case "Forwarded" in status:
      return {
        Forwarded: {
          hash: status.Forwarded.hash,
          logIndex: status.Forwarded.log_index[0],
        },
      };
    default: {
      // This ensures that all variants are covered above.
      const _exhaustiveCheck: never = status;
      throw Error("unexpected candid forward status");
    }
  }
}

export function forwardingResponse(
  response: candid.ForwardingResponse,
): ForwardingResponse {
  return {
    done: response.done[0],
    status: forwardingStatus(response.status[0]),
  };
}

export function chain(chain?: candid.Chain): Chain | undefined {
  if (chain === undefined) {
    return undefined;
  }
  switch (true) {
    case "ICP" in chain:
      return "ICP";
    case "Base" in chain:
      return "Base";
    case "Arbitrum" in chain:
      return "Arbitrum";
    case "Ethereum" in chain:
      return "Ethereum";
    default: {
      // This ensures that all variants are covered above.
      const _exhaustiveCheck: never = chain;
      throw Error("unexpected candid chain");
    }
  }
}

export function token(token?: candid.Token): Token | undefined {
  if (token === undefined) {
    return undefined;
  }
  switch (true) {
    case "ICP" in token:
      return "ICP";
    case "USDC" in token:
      return "USDC";
    case "USDT" in token:
      return "USDT";
    case "ckBTC" in token:
      return "ckBTC";
    case "cbBTC" in token:
      return "cbBTC";
    case "BOB" in token:
      return "BOB";
    case "GLDT" in token:
      return "GLDT";
    default: {
      // This ensures that all variants are covered above.
      const _exhaustiveCheck: never = token;
      throw Error("unexpected candid token");
    }
  }
}

export function icpAccount(account: candid.IcpAccount): IcpAccount {
  switch (true) {
    case "ICRC" in account:
      return {
        ICRC: {
          owner: account.ICRC.owner,
          subaccount:
            account.ICRC.subaccount[0] !== undefined
              ? Uint8Array.from(account.ICRC.subaccount[0])
              : undefined,
        },
      };
    case "AccountId" in account:
      return {
        AccountId: {
          accountId: account.AccountId,
        },
      };
    default: {
      // This ensures that all variants are covered above.
      const _exhaustiveCheck: never = account;
      throw Error("unexpected candid account");
    }
  }
}

export function evmAccount(account: candid.EvmAccount): EvmAccount {
  return account;
}

export function tx(tx?: candid.Tx): Tx | undefined {
  if (tx === undefined) {
    return undefined;
  }

  switch (true) {
    case "Icp" in tx:
      return {
        Icp: {
          blockIndex: tx.Icp.block_index,
          ledger: tx.Icp.ledger,
        },
      };
    case "Evm" in tx:
      return {
        Evm: {
          hash: tx.Evm.hash,
          logIndex: tx.Evm.log_index[0],
        },
      };
    default: {
      // This ensures that all variants are covered above.
      const _exhaustiveCheck: never = tx;
      throw Error("unexpected candid tx");
    }
  }
}

export function account(account?: candid.Account): Account | undefined {
  if (account === undefined) {
    return undefined;
  }
  switch (true) {
    case "Icp" in account: {
      return { Icp: icpAccount(account.Icp) };
    }
    case "Evm" in account: {
      return { Evm: evmAccount(account.Evm) };
    }
    default: {
      // This ensures that all variants are covered above.
      const _exhaustiveCheck: never = account;
      throw Error("unexpected candid account");
    }
  }
}

export function status(status?: candid.Status): Status | undefined {
  if (status === undefined) {
    return undefined;
  }
  switch (true) {
    case "PendingSourceTx" in status:
    case "PendingDestinationTx" in status:
    case "PendingRefundTx" in status:
    case "Succeeded" in status:
      return status;
    case "Refunded" in status:
      return {
        Refunded: {
          tx: tx(status.Refunded),
        },
      };
    case "Failed" in status:
      return {
        Failed: status.Failed,
      };
    default: {
      // This ensures that all variants are covered above.
      const _exhaustiveCheck: never = status;
      throw Error("unexpected candid status");
    }
  }
}

export function asset(asset: candid.AssetInfo): AssetInfo {
  return {
    chain: chain(asset.chain[0]),
    token: token(asset.token[0]),
    account: account(asset.account[0]),
    tx: tx(asset.tx[0]),
    amount: asset.amount,
  };
}

export function transfer(transfer: candid.Transfer): Transfer {
  return {
    source: asset(transfer.source),
    destination: asset(transfer.destination),
    status: status(transfer.status[0]),
  };
}

export function transferResponse(
  response: candid.TransferResponse,
): TransferResponse {
  switch (true) {
    case "Failed" in response:
      return { Failed: response.Failed };
    case "Accepted" in response:
      return { Accepted: response.Accepted };
    case "Fetching" in response:
      return { Fetching: { blockHeight: response.Fetching.block_height } };
    default: {
      const _exhaustiveCheck: never = response;
      throw Error("unexpected candid transfer response");
    }
  }
}
