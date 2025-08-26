import type { Deployment, EvmChain, OperatingMode, Token } from "./types";


export interface TokenConfig {
  evmMode: OperatingMode;
  erc20?: string;
  erc20Mainnet?: string;
  erc20MainnetBase?: string;
  erc20MainnetArbitrum?: string;
  erc20MainnetEthereum?: string;
  erc20Testnet?: string;
  erc20TestnetBase?: string;
  erc20TestnetArbitrum?: string;
  erc20TestnetEthereum?: string;
  erc20Local?: string;
  erc20LocalBase?: string;
  erc20LocalArbitrum?: string;
  erc20LocalEthereum?: string;
  locker?: string;
  lockerMainnet?: string;
  lockerMainnetBase?: string;
  lockerMainnetArbitrum?: string;
  lockerMainnetEthereum?: string;
  lockerTestnet?: string;
  lockerTestnetBase?: string;
  lockerTestnetArbitrum?: string;
  lockerTestnetEthereum?: string;
  lockerLocal?: string;
  lockerLocalBase?: string;
  lockerLocalArbitrum?: string;
  lockerLocalEthereum?: string;
  ledger?: string;
  ledgerMainnet?: string;
  ledgerTestnet?: string;
  ledgerLocal?: string;
  ledgerFee: bigint;
  decimals: number;
}

export interface IcpConfig {
  hosts: Map<Deployment, string>;
  onesec: Map<Deployment, string>;
}

export interface EvmConfig {
  confirmBlocks: number,
  blockTimeMs: Map<Deployment, number>,
}


export interface Config {
  tokens: Map<Token, TokenConfig>;
  icp: IcpConfig;
  evm: Map<EvmChain, EvmConfig>,
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
      erc20Mainnet: "0x00f3C42833C3170159af4E92dbb451Fb3F708917",
      erc20Local: "0x00f3C42833C3170159af4E92dbb451Fb3F708917",
      erc20Testnet: "0xa96496d9Ef442a3CF8F3e24B614b87a70ddf74f3",
      ledger: "ryjl3-tyaaa-aaaaa-aaaba-cai",
      ledgerFee: 10_000n,
      decimals: 8,
    },
  ],
  [
    "USDC",
    {
      evmMode: "locker",
      erc20MainnetBase: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      erc20MainnetArbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
      erc20MainnetEthereum: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      lockerMainnet: "0xAe2351B15cFf68b5863c6690dCA58Dce383bf45A",
      lockerLocal: "0xAe2351B15cFf68b5863c6690dCA58Dce383bf45A",
      lockerTestnet: "0x38200DD4c3adbE86Be49717ccA8a3fD08466Cba6",
      ledgerMainnet: "53nhb-haaaa-aaaar-qbn5q-cai",
      ledgerLocal: "53nhb-haaaa-aaaar-qbn5q-cai",
      ledgerTestnet: "7csws-aiaaa-aaaar-qaqpa-cai",
      ledgerFee: 10_000n,
      decimals: 6,
    },
  ],
  [
    "USDT",
    {
      evmMode: "locker",
      erc20MainnetEthereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      lockerMainnetEthereum: "0xc5AC945a0af0768929301A27D6f2a7770995fAeb",
      erc20LocalEthereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      lockerLocalEthereum: "0xc5AC945a0af0768929301A27D6f2a7770995fAeb",
      erc20TestnetEthereum: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      lockerTestnetEthereum: "0x205E3f1001bbE91971D25349ac3aA949D9Be5079",
      ledgerMainnet: "ij33n-oiaaa-aaaar-qbooa-cai",
      ledgerLocal: "ij33n-oiaaa-aaaar-qbooa-cai",
      ledgerTestnet: "n4dku-tiaaa-aaaar-qboqa-cai",
      ledgerFee: 10_000n,
      decimals: 6,
    },
  ],
  [
    "cbBTC",
    {
      evmMode: "locker",
      erc20: "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
      lockerMainnet: "0x7744c6a83E4b43921f27d3c94a742bf9cd24c062",
      lockerLocal: "0x7744c6a83E4b43921f27d3c94a742bf9cd24c062",
      lockerTestnet: "0xd543007D8415169756e8a61b2cc079369d4aB6a8",
      ledgerMainnet: "io25z-dqaaa-aaaar-qbooq-cai",
      ledgerLocal: "io25z-dqaaa-aaaar-qbooq-cai",
      ledgerTestnet: "n3cma-6qaaa-aaaar-qboqq-cai",
      ledgerFee: 20n,
      decimals: 8,
    },
  ],
  [
    "ckBTC",
    {
      evmMode: "minter",
      erc20Mainnet: "0x919A41Ea07c26f0001859Bc5dcb8754068718Fb7",
      erc20Local: "0x919A41Ea07c26f0001859Bc5dcb8754068718Fb7",
      erc20Testnet: "0x9D8dE8E7Cd748F760C81199AD3b902798DA7E7bC",
      ledger: "mxzaz-hqaaa-aaaar-qaada-cai",
      ledgerFee: 10n,
      decimals: 8,
    },
  ],
  [
    "GLDT",
    {
      evmMode: "minter",
      erc20Mainnet: "0x86856814e74456893Cfc8946BedcBb472b5fA856",
      erc20Local: "0x86856814e74456893Cfc8946BedcBb472b5fA856",
      erc20Testnet: "0xB5A497b709703eC987B6879f064B02017998De1d",
      ledger: "6c7su-kiaaa-aaaar-qaira-cai",
      ledgerFee: 10_000_000n,
      decimals: 8,
    },
  ],
  [
    "BOB",
    {
      evmMode: "minter",
      erc20Mainnet: "0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89",
      erc20Local: "0xecc5f868AdD75F4ff9FD00bbBDE12C35BA2C9C89",
      erc20Testnet: "0xc6d02fa25bC437E38099476a6856225aE5ac2C75",
      ledger: "7pail-xaaaa-aaaas-aabmq-cai",
      ledgerFee: 1_000_000n,
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
    onesec: new Map([
      ["Mainnet", "5okwm-giaaa-aaaar-qbn6a-cai"],
      ["Testnet", "zvjow-lyaaa-aaaar-qap7q-cai"],
      ["Local", "5okwm-giaaa-aaaar-qbn6a-cai"],
    ]),
  },
  evm: new Map([
    ["Arbitrum", {
      confirmBlocks: 96,
      blockTimeMs: new Map([
        ["Mainnet", 240],
        ["Testnet", 240],
        ["Local", 10],
      ])
    }],
    ["Base", {
      confirmBlocks: 12,
      blockTimeMs: new Map([
        ["Mainnet", 1900],
        ["Testnet", 1900],
        ["Local", 10],
      ])
    }],
    ["Ethereum", {
      confirmBlocks: 4,
      blockTimeMs: new Map([
        ["Mainnet", 12_000],
        ["Testnet", 12_000],
        ["Local", 10],
      ])
    }]
  ]),
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

function tokenConfigFieldNames(name: string, deployment: Deployment, evmChain?: EvmChain): string[] {
  const result = [];
  if (evmChain !== undefined) {
    result.push(`${name}${deployment}${evmChain}`);
  }
  result.push(`${name}${deployment}`);
  result.push(name);
  return result;
}

function lookup(config: TokenConfig, name: string, deployment: Deployment, evmChain?: EvmChain): string | undefined {
  const keys = tokenConfigFieldNames(name, deployment, evmChain);
  for (const key of keys) {
    const value = config[key as keyof TokenConfig];
    if (value !== undefined) {
      return value as string;
    }
  }
  return undefined;
}

export function getTokenErc20Address(
  config: Config,
  token: Token,
  deployment: Deployment,
  chain: EvmChain,
): string | undefined {
  const tokenConfig = config.tokens.get(token);
  if (!tokenConfig) return undefined;
  return lookup(tokenConfig, "erc20", deployment, chain);
}

export function getTokenLockerAddress(
  config: Config,
  token: Token,
  deployment: Deployment,
  chain: EvmChain,
): string | undefined {
  const tokenConfig = config.tokens.get(token);
  if (!tokenConfig || tokenConfig.evmMode !== "locker") return undefined;
  return lookup(tokenConfig, "locker", deployment, chain);
}

export function getTokenLedgerCanister(
  config: Config,
  token: Token,
  deployment: Deployment,
): string | undefined {
  const tokenConfig = config.tokens.get(token);
  if (!tokenConfig) throw new Error(`Token ${token} not found in config`);
  return lookup(tokenConfig, "ledger", deployment);
}

export function getTokenDecimals(
  config: Config,
  token: Token,
): number {
  const tokenConfig = config.tokens.get(token);
  if (!tokenConfig) throw new Error(`Token ${token} not found in config`);
  return tokenConfig.decimals;
}

export function getTokenEvmMode(
  config: Config,
  token: Token,
): OperatingMode {
  const tokenConfig = config.tokens.get(token);
  if (!tokenConfig) throw new Error(`Token ${token} not found in config`);
  return tokenConfig.evmMode;
}

export function getTokenConfig(
  config: Config,
  token: Token,
): TokenConfig | undefined {
  return config.tokens.get(token);
}
