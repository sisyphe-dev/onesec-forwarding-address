import { OneSecBridgeImpl } from "./bridge";
import type { Config } from "./config";
import { OneSecForwardingImpl } from "./forwarding";
import type {
  Addresses,
  Deployment,
  OneSecBridge,
  OneSecForwarding,
} from "./types";
export { DEFAULT_CONFIG } from "./config";
export type { Config, EvmConfig, EvmTokenConfig, IcpConfig } from "./config";
export type { Addresses, OneSecBridge, OneSecForwarding } from "./types";

/**
 * Constructs an instance of `OneSecForwarding` for bridging tokens from EVM
 * chains to ICP using forwarding addresses.
 *
 * A forwarding address is an EVM address that is derived from an ICP address.
 * Tokens transferred to the forwarding address on EVM are bridged to the
 * corresponding ICP address on ICP.
 *
 * @param setup - the deployment environment (defaults to Mainnet)
 * @param addresses - optional canister IDs for custom deployments
 */
export function oneSecForwarding(
  setup?: Deployment,
  addresses?: Addresses,
): OneSecForwarding {
  return new OneSecForwardingImpl(setup ?? "Mainnet", addresses);
}

/**
 * Constructs an instance of `OneSecBridge` for direct bridging operations
 * between ICP and EVM chains.
 *
 * This interface provides methods for transferring tokens directly from ICP
 * to EVM chains and retrieving transfer details.
 *
 * @param setup - the deployment environment (defaults to Mainnet)
 * @param addresses - optional canister IDs for custom deployments
 * @param config - optional EVM configuration for tokens and contracts
 */
export function oneSecBridge(
  setup?: Deployment,
  addresses?: Addresses,
  config?: Config,
): OneSecBridge {
  return new OneSecBridgeImpl(setup ?? "Mainnet", addresses, config);
}
