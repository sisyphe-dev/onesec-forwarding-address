# OneSec Bridge SDK

A TypeScript SDK for bridging tokens between EVM chains (Ethereum, Arbitrum, Base) and the Internet Computer (ICP) using the OneSec bridge protocol.

## Features

- **Bi-directional bridging**: Transfer tokens from EVM chains to ICP and vice versa
- **Multiple bridging modes**: Direct wallet-based bridging and forwarding address bridging
- **Step-by-step execution**: Track progress and handle errors at each step

## Installation

```bash
# with npm
npm install onesec-bridge
# with pnpm
pnpm add onesec-bridge
# with yarn
yarn add onesec-bridge
```

## Quick Start

### EVM to ICP Bridging (Direct)

Use this approach when users can connect their wallet and sign transactions directly.

```typescript
import { EvmToIcpBridgeBuilder } from "@onesec/bridge-sdk";
import { JsonRpcProvider, Wallet } from "ethers";
import { Principal } from "@dfinity/principal";

// Setup wallet
const provider = new JsonRpcProvider("https://mainnet.base.org");
const wallet = new Wallet("your-private-key", provider);

// Create bridging plan
const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
  .receiver(Principal.fromText("your-icp-principal"))
  .amountInUnits(1_500_000n) // 1.5 USDC
  .build(wallet);

// Print plan overview
console.log("Plan steps:");
plan.steps().forEach((step, index) => {
  console.log(`  ${index + 1}. ${step.about().verbose}`);
});

// Execute step by step with progress tracking
let nextStep;
while (nextStep = plan.nextStep()) {
  const status = nextStep.status();
  if (status.state === "planned") {
    console.log(nextStep.about().verbose);
  }
  try {
    const result = await nextStep.run();
    console.log(`  - ${result.verbose}`);
  } catch (error) {
    console.error("Step execution failed:", error);
    break;
  }
}
```

### EVM to ICP Bridging (Forwarding Address)

Use this approach when users cannot connect a wallet or prefer to send tokens manually.

```typescript
import { EvmToIcpBridgeBuilder } from "@onesec/bridge-sdk";
import { Principal } from "@dfinity/principal";

// Create forwarding-based bridging plan
const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
  .receiver(Principal.fromText("your-icp-principal"))
  .forward();

// Execute with progress tracking
let nextStep;
while (nextStep = plan.nextStep()) {
  const status = nextStep.status();
  if (status.state === "planned") {
    console.log(nextStep.about().verbose);
  }
  try {
    const result = await nextStep.run();
    console.log(`  - ${result.verbose}`);
    
    // Show forwarding address to user
    if (result.forwardingAddress) {
      console.log(`Please send USDC to: ${result.forwardingAddress}`);
      // Wait for user to send tokens before continuing
    }
  } catch (error) {
    console.error("Step execution failed:", error);
    break;
  }
}
```

### ICP to EVM Bridging

Transfer tokens from ICP to EVM chains. Requires an authenticated ICP agent.

```typescript
import { IcpToEvmBridgeBuilder } from "@onesec/bridge-sdk";
import { HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

// Setup ICP identity and agent
const identity = Secp256k1KeyIdentity.fromSecretKey(/* your private key */);
const agent = HttpAgent.createSync({
  identity,
  host: "https://ic0.app",
});

// Create bridging plan
const plan = await new IcpToEvmBridgeBuilder(agent, "Base", "USDC")
  .sender(identity.getPrincipal())
  .receiver("0x742d35Cc6575C4B9bE904C1e13D21c4C624A9960")
  .amountInUnits(1_500_000n) // 1.5 USDC
  .build();

// Execute with progress tracking (same pattern as above)
let nextStep;
while (nextStep = plan.nextStep()) {
  // ... execution logic
}
```

## Supported Networks and Tokens

### EVM Chains
- Ethereum
- Arbitrum
- Base

### Tokens
- USDC
- USDT
- ICP
- ckBTC
- cbBTC
- BOB
- GLDT

## Migration from v0.7.x

If you're using the deprecated `oneSecForwarding()` function:

```typescript
// Old approach (deprecated)
const forwarding = oneSecForwarding();
const address = await forwarding.addressFor(receiver);

// New approach
const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
  .receiver(principal)
  .amountInUnits(amount)
  .forward();
```

## Documentation
-<!-- TSDOC_START -->

-<!-- TSDOC_END -->

## License

MIT

## Support

For issues and questions:
- [GitHub Issues](https://github.com/sisyphe-dev/onesec-forwarding-address/issues)