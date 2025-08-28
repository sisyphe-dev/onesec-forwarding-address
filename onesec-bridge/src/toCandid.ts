import type * as candid from "./generated/candid/onesec/onesec.did";
import type { EvmChain, EvmTx, IcrcAccount, Token } from "./types";

export function token(token: Token): candid.Token {
  switch (token) {
    case "ICP":
      return { ICP: null };
    case "USDC":
      return { USDC: null };
    case "USDT":
      return { USDT: null };
    case "cbBTC":
      return { cbBTC: null };
    case "ckBTC":
      return { ckBTC: null };
    case "BOB":
      return { BOB: null };
    case "GLDT":
      return { GLDT: null };
  }
}

export function chain(chain: EvmChain): candid.EvmChain {
  switch (chain) {
    case "Base":
      return { Base: null };
    case "Arbitrum":
      return { Arbitrum: null };
    case "Ethereum":
      return { Ethereum: null };
  }
}

export function icpAccount(account: IcrcAccount): candid.IcpAccount {
  let subaccount: [] | [Uint8Array] = [];
  if (account.subaccount !== undefined) {
    subaccount = [account.subaccount];
  }
  return { ICRC: { owner: account.owner, subaccount } };
}

export function evmAccount(address: string): candid.EvmAccount {
  return { address };
}

export function evmTx(tx: EvmTx): candid.EvmTx {
  return {
    hash: tx.hash,
    log_index: tx.logIndex !== undefined ? [tx.logIndex] : [],
  };
}
