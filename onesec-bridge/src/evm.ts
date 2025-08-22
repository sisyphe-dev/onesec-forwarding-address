import { Contract, Signer } from "ethers";
import { DEFAULT_CONFIG, type Config } from "./config";
import { EvmChain, Token } from "./types";

export type OperatingMode = "minter" | "locker";

export function operatingMode(
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
): OperatingMode {
  const mode = config.evm.get(chain)?.tokens.get(token)?.mode;
  if (!mode) {
    throw Error(`no EVM config for ${chain} and ${token}`);
  }
  return mode;
}

export function erc20(
  signer: Signer,
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
): Contract {
  const tokenConfig = config.evm.get(chain)?.tokens.get(token);
  if (!tokenConfig) {
    throw Error(`no EVM config for ${chain} and ${token}`);
  }
  const abi =
    tokenConfig.mode === "minter"
      ? config.abi.erc20_and_minter
      : config.abi.erc20;
  return new Contract(tokenConfig.erc20, abi, signer);
}

export function locker(
  signer: Signer,
  chain: EvmChain,
  token: Token,
  config: Config = DEFAULT_CONFIG,
): [Contract, string] {
  const tokenConfig = config.evm.get(chain)?.tokens.get(token);
  if (!tokenConfig || !tokenConfig.locker) {
    throw Error(`no EVM locker config for ${chain} and ${token}`);
  }
  return [
    new Contract(tokenConfig.locker, config.abi.locker, signer),
    tokenConfig.locker,
  ];
}
