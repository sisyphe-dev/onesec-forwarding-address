import type { Deployment, EvmChain, Token } from "./types";

export interface TokenConfig {
  evmMode: "locker" | "minter";
  erc20_mainnet_base?: string;
  erc20_mainnet_arbitrum?: string;
  erc20_mainnet_ethereum?: string;
  erc20_testnet_base?: string;
  erc20_testnet_arbitrum?: string;
  erc20_testnet_ethereum?: string;
  erc20_local_base?: string;
  erc20_local_arbitrum?: string;
  erc20_local_ethereum?: string;
  locker_mainnet_base?: string;
  locker_mainnet_arbitrum?: string;
  locker_mainnet_ethereum?: string;
  locker_testnet_base?: string;
  locker_testnet_arbitrum?: string;
  locker_testnet_ethereum?: string;
  locker_local_base?: string;
  locker_local_arbitrum?: string;
  locker_local_ethereum?: string;
  ledger_mainnet: string;
  ledger_testnet: string;
  ledger_local: string;
  decimals: number;
}

export interface IcpConfig {
  hosts: Map<Deployment, string>;
  oneSecCanisters: Map<Deployment, string>;
}

export interface Config {
  tokens: Map<Token, TokenConfig>;
  icp: IcpConfig;
  abi: {
    erc20_and_minter: string[];
    erc20: string[];
    locker: string[];
  };
}

const TOKEN_CONFIGS: Map<Token, TokenConfig> = new Map([
  [
    "ICP",
    {
      evmMode: "minter",
      erc20_mainnet_base: "0x00f3C42833C3170159af4E92dbb451Fb3F708917",
      erc20_mainnet_arbitrum: "0x00f3C42833C3170159af4E92dbb451Fb3F708917",
      erc20_mainnet_ethereum: "0x00f3C42833C3170159af4E92dbb451Fb3F708917",
      ledger_mainnet: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      ledger_testnet: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      ledger_local: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      decimals: 8,
    },
  ],
  [
    "USDC",
    {
      evmMode: "locker",
      erc20_mainnet_base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      erc20_mainnet_arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      erc20_mainnet_ethereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      locker_mainnet_base: "0xAe2351B15cFf68b5863c6690dCA58Dce383bf45A",
      locker_mainnet_arbitrum: "0xAe2351B15cFf68b5863c6690dCA58Dce383bf45A",
      locker_mainnet_ethereum: "0xAe2351B15cFf68b5863c6690dCA58Dce383bf45A",
      ledger_mainnet: "53nhb-haaaa-aaaar-qbn5q-cai",
      ledger_testnet: "53nhb-haaaa-aaaar-qbn5q-cai",
      ledger_local: "53nhb-haaaa-aaaar-qbn5q-cai",
      decimals: 6,
    },
  ],
  [
    "USDT",
    {
      evmMode: "locker",
      erc20_mainnet_ethereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      locker_mainnet_ethereum: "0xc5AC945a0af0768929301A27D6f2a7770995fAeb",
      ledger_mainnet: "ij33n-oiaaa-aaaar-qbooa-cai",
      ledger_testnet: "ij33n-oiaaa-aaaar-qbooa-cai",
      ledger_local: "ij33n-oiaaa-aaaar-qbooa-cai",
      decimals: 6,
    },
  ],
  [
    "cbBTC",
    {
      evmMode: "locker",
      erc20_mainnet_base: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      erc20_mainnet_arbitrum: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      erc20_mainnet_ethereum: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      locker_mainnet_base: "0x7744c6a83E4b43921f27d3c94a742bf9cd24c062",
      locker_mainnet_arbitrum: "0x7744c6a83E4b43921f27d3c94a742bf9cd24c062",
      locker_mainnet_ethereum: "0x7744c6a83E4b43921f27d3c94a742bf9cd24c062",
      ledger_mainnet: "io25z-dqaaa-aaaar-qbooq-cai",
      ledger_testnet: "io25z-dqaaa-aaaar-qbooq-cai",
      ledger_local: "io25z-dqaaa-aaaar-qbooq-cai",
      decimals: 8,
    },
  ],
  [
    "ckBTC",
    {
      evmMode: "minter",
      erc20_mainnet_base: "0x919A41Ea07c26f0001859Bc5dcb8754068718Fb7",
      erc20_mainnet_arbitrum: "0x919A41Ea07c26f0001859Bc5dcb8754068718Fb7",
      erc20_mainnet_ethereum: "0x919A41Ea07c26f0001859Bc5dcb8754068718Fb7",
      ledger_mainnet: "mxzaz-hqaaa-aaaar-qaada-cai",
      ledger_testnet: "mxzaz-hqaaa-aaaar-qaada-cai",
      ledger_local: "mxzaz-hqaaa-aaaar-qaada-cai",
      decimals: 8,
    },
  ],
  [
    "GLDT",
    {
      evmMode: "minter",
      erc20_mainnet_base: "0x86856814e74456893Cfc8946BedcBb472b5fA856",
      erc20_mainnet_arbitrum: "0x86856814e74456893Cfc8946BedcBb472b5fA856",
      erc20_mainnet_ethereum: "0x86856814e74456893Cfc8946BedcBb472b5fA856",
      ledger_mainnet: "6c7su-kiaaa-aaaar-qaira-cai",
      ledger_testnet: "6c7su-kiaaa-aaaar-qaira-cai",
      ledger_local: "6c7su-kiaaa-aaaar-qaira-cai",
      decimals: 8,
    },
  ],
  [
    "BOB",
    {
      evmMode: "minter",
      erc20_mainnet_base: "0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89",
      erc20_mainnet_arbitrum: "0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89",
      erc20_mainnet_ethereum: "0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89",
      ledger_mainnet: "7pail-xaaaa-aaaas-aabmq-cai",
      ledger_testnet: "7pail-xaaaa-aaaas-aabmq-cai",
      ledger_local: "7pail-xaaaa-aaaas-aabmq-cai",
      decimals: 8,
    },
  ],
]);


export const DEFAULT_CONFIG: Config = {
  tokens: TOKEN_CONFIGS,
  icp: {
    hosts: new Map([
      ["Mainnet", "https://ic0.app"],
      ["Testnet", "https://ic0.app"],
      ["Local", "http://127.0.1:8080"],
    ]),
    oneSecCanisters: new Map([
      ["Mainnet", "5okwm-giaaa-aaaar-qbn6a-cai"],
      ["Testnet", "zvjow-lyaaa-aaaar-qap7q-cai"],
      ["Local", "5okwm-giaaa-aaaar-qbn6a-cai"],
    ]),
  },
  abi: {
    erc20_and_minter: [
      "function balanceOf(address account) view returns (uint256)",
      "function burn1(uint256 amount, bytes32 data1)",
      "function burn2(uint256 amount, bytes32 data1, bytes32 data2)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ],
    erc20: [
      "function balanceOf(address account) view returns (uint256)",
      "function approve(address spender, uint256 amount) returns (bool)",
    ],
    locker: [
      "function lock1(uint256 amount, bytes32 data1)",
      "function lock2(uint256 amount, bytes32 data1, bytes32 data2)",
    ],
  },
};

export function getTokenErc20Address(
  token: Token,
  deployment: Deployment,
  chain: EvmChain,
): string | undefined {
  const config = DEFAULT_CONFIG.tokens.get(token);
  if (!config) return undefined;

  const key = `erc20_${deployment.toLowerCase()}_${chain.toLowerCase()}` as keyof TokenConfig;
  const value = config[key];
  return typeof value === "string" ? value : undefined;
}

export function getTokenLockerAddress(
  token: Token,
  deployment: Deployment,
  chain: EvmChain,
): string | undefined {
  const config = DEFAULT_CONFIG.tokens.get(token);
  if (!config || config.evmMode !== "locker") return undefined;

  const key = `locker_${deployment.toLowerCase()}_${chain.toLowerCase()}` as keyof TokenConfig;
  const value = config[key];
  return typeof value === "string" ? value : undefined;
}

export function getTokenLedgerCanister(
  token: Token,
  deployment: Deployment,
): string {
  const config = DEFAULT_CONFIG.tokens.get(token);
  if (!config) throw new Error(`Token ${token} not found in config`);

  const key = `ledger_${deployment.toLowerCase()}` as keyof TokenConfig;
  return config[key] as string;
}

export function getTokenDecimals(token: Token): number {
  const config = DEFAULT_CONFIG.tokens.get(token);
  if (!config) throw new Error(`Token ${token} not found in config`);

  return config.decimals;
}

export function getTokenConfig(token: Token): TokenConfig | undefined {
  return DEFAULT_CONFIG.tokens.get(token);
}
