import type { Deployment, EvmChain, Token } from "./types";

export interface EvmTokenConfig {
  mode: "minter" | "locker";
  erc20: string;
  locker?: string;
}

export interface EvmConfig {
  tokens: Map<Token, EvmTokenConfig>;
}

export interface IcpConfig {
  hosts: Map<Deployment, string>;
  oneSecCanisters: Map<Deployment, string>;
  ledgerCanisters: Map<Token, string>;
}

export interface Config {
  evm: Map<EvmChain, EvmConfig>;
  icp: IcpConfig;
  abi: {
    erc20_and_minter: string[];
    erc20: string[];
    locker: string[];
  };
}

const BASE_TOKENS: Map<Token, EvmTokenConfig> = new Map([
  [
    "ICP",
    {
      mode: "minter",
      erc20: "0x00f3C42833C3170159af4E92dbb451Fb3F708917",
    },
  ],
  [
    "USDC",
    {
      mode: "locker",
      erc20: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      locker: "0xAe2351B15cFf68b5863c6690dCA58Dce383bf45A",
    },
  ],
  [
    "cbBTC",
    {
      mode: "locker",
      erc20: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      locker: "0x7744c6a83E4b43921f27d3c94a742bf9cd24c062",
    },
  ],
  [
    "ckBTC",
    {
      mode: "minter",
      erc20: "0x919A41Ea07c26f0001859Bc5dcb8754068718Fb7",
    },
  ],
  [
    "GLDT",
    {
      mode: "minter",
      erc20: "0x86856814e74456893Cfc8946BedcBb472b5fA856",
    },
  ],
  [
    "BOB",
    {
      mode: "minter",
      erc20: "0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89",
    },
  ],
]);

const ARBITRUM_TOKENS: Map<Token, EvmTokenConfig> = new Map([
  [
    "ICP",
    {
      mode: "minter",
      erc20: "0x00f3C42833C3170159af4E92dbb451Fb3F708917",
    },
  ],
  [
    "USDC",
    {
      mode: "locker",
      erc20: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      locker: "0xAe2351B15cFf68b5863c6690dCA58Dce383bf45A",
    },
  ],
  [
    "cbBTC",
    {
      mode: "locker",
      erc20: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      locker: "0x7744c6a83E4b43921f27d3c94a742bf9cd24c062",
    },
  ],
  [
    "ckBTC",
    {
      mode: "minter",
      erc20: "0x919A41Ea07c26f0001859Bc5dcb8754068718Fb7",
    },
  ],
  [
    "GLDT",
    {
      mode: "minter",
      erc20: "0x86856814e74456893Cfc8946BedcBb472b5fA856",
    },
  ],
  [
    "BOB",
    {
      mode: "minter",
      erc20: "0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89",
    },
  ],
]);

const ETHEREUM_TOKENS: Map<Token, EvmTokenConfig> = new Map([
  [
    "ICP",
    {
      mode: "minter",
      erc20: "0x00f3C42833C3170159af4E92dbb451Fb3F708917",
    },
  ],
  [
    "USDC",
    {
      mode: "locker",
      erc20: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      locker: "0xAe2351B15cFf68b5863c6690dCA58Dce383bf45A",
    },
  ],
  [
    "USDT",
    {
      mode: "locker",
      erc20: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      locker: "0xc5AC945a0af0768929301A27D6f2a7770995fAeb",
    },
  ],
  [
    "cbBTC",
    {
      mode: "locker",
      erc20: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      locker: "0x7744c6a83E4b43921f27d3c94a742bf9cd24c062",
    },
  ],
  [
    "ckBTC",
    {
      mode: "minter",
      erc20: "0x919A41Ea07c26f0001859Bc5dcb8754068718Fb7",
    },
  ],
  [
    "GLDT",
    {
      mode: "minter",
      erc20: "0x86856814e74456893Cfc8946BedcBb472b5fA856",
    },
  ],
  [
    "BOB",
    {
      mode: "minter",
      erc20: "0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89",
    },
  ],
]);

export const DEFAULT_CONFIG: Config = {
  evm: new Map([
    ["Base", { tokens: BASE_TOKENS }],
    ["Arbitrum", { tokens: ARBITRUM_TOKENS }],
    ["Ethereum", { tokens: ETHEREUM_TOKENS }],
  ]),
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
    ledgerCanisters: new Map([
      ["ICP", "ryjl3-tyaaa-aaaaa-aaaba-cai"],
      ["USDC", "53nhb-haaaa-aaaar-qbn5q-cai"],
      ["USDT", "ij33n-oiaaa-aaaar-qbooa-cai"],
      ["cbBTC", "io25z-dqaaa-aaaar-qbooq-cai"],
      ["ckBTC", "mxzaz-hqaaa-aaaar-qaada-cai"],
      ["BOB", "7pail-xaaaa-aaaas-aabmq-cai"],
      ["GLDT", "6c7su-kiaaa-aaaar-qaira-cai"],
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
