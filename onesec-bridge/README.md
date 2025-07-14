# OneSec Bridge

This repository contains a library for bridging tokens between EVM and ICP
blockchains using the OneSec smart contract.

## Installation

```bash
# with npm
npm install onesec-bridge
# with pnpm
pnpm add onesec-bridge
# with yarn
yarn add onesec-bridge
```

## Usage

See `src/index.spec.ts` for more examples of usage.

```typescript
import { oneSecForwarding } from "onesec-bridge";

const forwarding = oneSecForwarding();

const receiver = {
  owner: Principal.fromText(
    "67m5w-gm4hr-27n4h-l3nav-cgwnn-wczuf-m4cif-5dbl6-pyqe4-4ztyg-lae",
  ),
};

const address = await forwarding.addressFor(receiver);

// Transfer tokens to `address` and then notify the smart
// contract to start bridging.
let result = await forwarding.forwardEvmToIcp(
  "USDC",
  "Base",
  address,
  receiver,
);

while (!result.done) {
  console.log(result.status);
  // Wait some time before retrying.
  await sleep(10_000);
  result = await forwarding.forwardEvmToIcp("USDC", "Base", address, receiver);
}

const transferId = result.done;
const transfer = await forwarding.getTransfer(transferId);

console.log(transfer.status);

// Wait more and retry if `transfer.status` is pending.
```

## Documentation

`onesec-bridge` exports the following types and functions:

<!-- TSDOC_START -->

### :toolbox: Functions

- [oneSecForwarding](#gear-onesecforwarding)

#### :gear: oneSecForwarding

Constructs an instance of `OneSecForwarding` for bridging tokens from EVM
chains to ICP using forwarding addresses.

A forwarding address is an EVM address that is derived from an ICP address.
Tokens transferred to the forwarding address on EVM are bridged to the
corresponding ICP address on ICP.

| Function           | Type                     |
| ------------------ | ------------------------ |
| `oneSecForwarding` | `() => OneSecForwarding` |

[:link: Source](https://github.com/sisyphe-dev/key_token.git/tree/main/src/index.ts#L13)

<!-- TSDOC_END -->
