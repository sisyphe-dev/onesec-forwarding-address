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
import { EvmToIcpBridgeBuilder } from "onesec-bridge";
import { JsonRpcProvider, Wallet } from "ethers";
import { Principal } from "@dfinity/principal";

// Setup wallet or use the browser wallet API.
const provider = new JsonRpcProvider("https://mainnet.base.org");
const wallet = new Wallet("your-private-key", provider);

// Create bridging plan
const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
  .receiver(Principal.fromText("your-icp-principal"))
  .amountInUnits(1_500_000n) // 1.5 USDC
  // alternative: use `.amountInTokens(1.5)`
  .build(wallet);

// Print plan overview
console.log("Plan steps:");
plan.steps().forEach((step, index) => {
  console.log(`  ${index + 1}. ${step.about().verbose}`);
});

// Execute step by step with progress tracking
let nextStep;
while (nextStep = plan.nextStepToRun()) {
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

// Get final results after completion
const finalStep = plan.latestStep();
if (finalStep) {
  const status = finalStep.status();
  if (status.state === "succeeded") {
    console.log("Bridging completed successfully!");
    if (status.amount) {
      console.log(`Received: ${status.amount.inTokens} USDC`);
    }
    if (status.transaction) {
      console.log(`Transaction: ${JSON.stringify(status.transaction)}`);
    }
  }
}
```

### EVM to ICP Bridging (Forwarding Address)

Use this approach when users cannot connect a wallet or prefer to send tokens manually.

```typescript
import { EvmToIcpBridgeBuilder } from "onesec-bridge";
import { Principal } from "@dfinity/principal";

// Create forwarding-based bridging plan
const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
  .receiver(Principal.fromText("your-icp-principal"))
  .forward();

// Execute with progress tracking
let nextStep;
while (nextStep = plan.nextStepToRun()) {
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

// Get final results after completion
const finalStep = plan.latestStep();
if (finalStep) {
  const status = finalStep.status();
  if (status.state === "succeeded") {
    console.log("Bridging completed successfully!");
    if (status.amount) {
      console.log(`Received: ${status.amount.inTokens} USDC`);
    }
    if (status.transaction) {
      console.log(`ICP Transaction: ${JSON.stringify(status.transaction)}`);
    }
  }
}
```

### ICP to EVM Bridging

Transfer tokens from ICP to EVM chains. Requires an authenticated ICP agent.

```typescript
import { IcpToEvmBridgeBuilder } from "onesec-bridge";
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
  // alternative: use `.amountInTokens(1.5)`
  .build();

// Execute with progress tracking
let nextStep;
while (nextStep = plan.nextStepToRun()) {
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

// Get final results after completion
const finalStep = plan.latestStep();
if (finalStep) {
  const status = finalStep.status();
  if (status.state === "succeeded") {
    console.log("Bridging completed successfully!");
    if (status.amount) {
      console.log(`Received: ${status.amount.inTokens} USDC`);
    }
    if (status.transaction) {
      console.log(`EVM Transaction: ${JSON.stringify(status.transaction)}`);
    }
  }
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

### :factory: IcpToEvmBridgeBuilder

Builder for creating ICP to EVM token bridging plans.

Transfers tokens from ICP ledgers to EVM networks. Requires an authenticated
agent to interact with ICP canisters on behalf of the user.

[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/icp-to-evm/index.ts#L46)

#### Methods

- [deployment](#gear-deployment)
- [sender](#gear-sender)
- [receiver](#gear-receiver)
- [amountInUnits](#gear-amountinunits)
- [amountInTokens](#gear-amountintokens)
- [payApproveFeeFromAmount](#gear-payapprovefeefromamount)
- [withConfig](#gear-withconfig)

##### :gear: deployment

Set target deployment network.

| Method | Type |
| ---------- | ---------- |
| `deployment` | `(deployment: Deployment) => IcpToEvmBridgeBuilder` |

Parameters:

* `deployment`: Target network ("Mainnet", "Testnet", or "Local")


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/icp-to-evm/index.ts#L70)

##### :gear: sender

Set sender ICP account.

| Method | Type |
| ---------- | ---------- |
| `sender` | `(principal: Principal, subaccount?: Uint8Array<ArrayBufferLike> or undefined) => IcpToEvmBridgeBuilder` |

Parameters:

* `principal`: ICP principal sending the tokens
* `subaccount`: Optional 32-byte subaccount


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/icp-to-evm/index.ts#L80)

##### :gear: receiver

Set EVM recipient address.

| Method | Type |
| ---------- | ---------- |
| `receiver` | `(address: string) => IcpToEvmBridgeBuilder` |

Parameters:

* `address`: EVM address receiving the tokens


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/icp-to-evm/index.ts#L89)

##### :gear: amountInUnits

Set amount to bridge in token's smallest units.

| Method | Type |
| ---------- | ---------- |
| `amountInUnits` | `(amount: bigint) => IcpToEvmBridgeBuilder` |

Parameters:

* `amount`: Amount in base units (e.g., 1_500_000n for 1.5 USDC)


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/icp-to-evm/index.ts#L98)

##### :gear: amountInTokens

Set amount to bridge in human-readable token units.

| Method | Type |
| ---------- | ---------- |
| `amountInTokens` | `(amount: number) => IcpToEvmBridgeBuilder` |

Parameters:

* `amount`: Amount in token units (e.g., 1.5 for 1.5 USDC)


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/icp-to-evm/index.ts#L107)

##### :gear: payApproveFeeFromAmount

Deduct the ledger approval fee from the bridging amount.

When enabled, the approval fee is subtracted from the specified amount, so the user
only needs to have exactly the bridging amount in their account rather than
bridging amount + approval fee.

| Method | Type |
| ---------- | ---------- |
| `payApproveFeeFromAmount` | `() => IcpToEvmBridgeBuilder` |

Examples:

```typescript
// Without payApproveFeeFromAmount(): User needs 1.5 USDC + approval fee
const plan1 = await builder.amountInUnits(1_500_000n).build();

// With payApproveFeeFromAmount(): User needs exactly 1.5 USDC, approval fee deducted from amount
const plan2 = await builder.amountInUnits(1_500_000n).payApproveFeeFromAmount().build();
```


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/icp-to-evm/index.ts#L128)

##### :gear: withConfig

Use custom configuration instead of defaults.

| Method | Type |
| ---------- | ---------- |
| `withConfig` | `(config: Config) => IcpToEvmBridgeBuilder` |

Parameters:

* `config`: Custom bridge configuration


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/icp-to-evm/index.ts#L137)


### :factory: EvmToIcpBridgeBuilder

Builder for creating EVM to ICP token bridging plans.

Supports two bridging modes:
- Direct bridging via `build()` - requires user to connect wallet and sign transactions
- Forwarding via `forward()` - user sends tokens to a generated forwarding address

[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/evm-to-icp/index.ts#L58)

#### Methods

- [deployment](#gear-deployment)
- [sender](#gear-sender)
- [amountInUnits](#gear-amountinunits)
- [amountInTokens](#gear-amountintokens)
- [receiver](#gear-receiver)
- [withConfig](#gear-withconfig)

##### :gear: deployment

Set target deployment network.

| Method | Type |
| ---------- | ---------- |
| `deployment` | `(deployment: Deployment) => EvmToIcpBridgeBuilder` |

Parameters:

* `deployment`: Target network ("Mainnet", "Testnet", or "Local")


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/evm-to-icp/index.ts#L79)

##### :gear: sender

Set sender EVM address. Optional for direct bridging (inferred from signer).

| Method | Type |
| ---------- | ---------- |
| `sender` | `(evmAddress: string) => EvmToIcpBridgeBuilder` |

Parameters:

* `evmAddress`: EVM address sending the tokens


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/evm-to-icp/index.ts#L88)

##### :gear: amountInUnits

Set amount to bridge in token's smallest units.

| Method | Type |
| ---------- | ---------- |
| `amountInUnits` | `(amount: bigint) => EvmToIcpBridgeBuilder` |

Parameters:

* `amount`: Amount in base units (e.g., 1_500_000n for 1.5 USDC)


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/evm-to-icp/index.ts#L97)

##### :gear: amountInTokens

Set amount to bridge in human-readable token units.

| Method | Type |
| ---------- | ---------- |
| `amountInTokens` | `(amount: number) => EvmToIcpBridgeBuilder` |

Parameters:

* `amount`: Amount in token units (e.g., 1.5 for 1.5 USDC)


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/evm-to-icp/index.ts#L106)

##### :gear: receiver

Set ICP recipient account.

| Method | Type |
| ---------- | ---------- |
| `receiver` | `(principal: Principal, subaccount?: Uint8Array<ArrayBufferLike> or undefined) => EvmToIcpBridgeBuilder` |

Parameters:

* `principal`: ICP principal receiving the tokens
* `subaccount`: Optional 32-byte subaccount


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/evm-to-icp/index.ts#L116)

##### :gear: withConfig

Use custom configuration instead of defaults.

| Method | Type |
| ---------- | ---------- |
| `withConfig` | `(config: Config) => EvmToIcpBridgeBuilder` |

Parameters:

* `config`: Custom bridge configuration


[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/bridge/evm-to-icp/index.ts#L128)


<!-- TSDOC_END -->

## License

MIT

## Support

For issues and questions:
- [GitHub Issues](https://github.com/sisyphe-dev/onesec-forwarding-address/issues)