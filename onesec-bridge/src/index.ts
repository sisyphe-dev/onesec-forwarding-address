import { OneSecForwardingImpl } from "./forwarding";
import type { Deployment, OneSecForwarding } from "./types";
export type { OneSecForwarding } from "./types";

/**
 * Constructs an instance of `OneSecForwarding` for bridging tokens from EVM
 * chains to ICP using forwarding addresses.
 *
 * A forwarding address is an EVM address that is derived from an ICP address.
 * Tokens transferred to the forwarding address on EVM are bridged to the
 * corresponding ICP address on ICP.
 */
export function oneSecForwarding(setup?: Deployment): OneSecForwarding {
  if (!setup) return new OneSecForwardingImpl("Mainnet");
  switch (setup) {
    case "Mainnet":
      return new OneSecForwardingImpl("Mainnet");
    case "Testnet":
      return new OneSecForwardingImpl("Testnet");
    case "Local":
      return new OneSecForwardingImpl("Local");
  }
}
