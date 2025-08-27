import { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { expect, it } from "vitest";
import { EvmToIcpBridgeBuilder, IcpToEvmBridgeBuilder, oneSecForwarding } from "./index";
import { createTestSigners } from "./testUtils";

// it(
//   "should transfer USDC from ICP to EVM using bridge directly",
//   async () => {

//     const { icpIdentity, evmSigner } = createTestSigners();
//     const evmAddress = await evmSigner.getAddress();
//     console.log(icpIdentity.getPrincipal().toText(), evmAddress);

//     const agent = HttpAgent.createSync({
//       identity: icpIdentity,
//       host: "https://ic0.app",
//     });


//     const plan = await new IcpToEvmBridgeBuilder(agent, "Base", "USDC")
//       .sender(icpIdentity.getPrincipal())
//       .receiver(evmAddress)
//       .amountInUnits(100_000_000n)
//       .build();

//   },
// );

it(
  "should transfer USDC from EVM to ICP using bridge directly",
  { timeout: 100000 },
  async () => {

    // Initialize signers at module level (synchronous)
    const { icpIdentity, evmSigner } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(icpIdentity.getPrincipal())
      .amountInUnits(1_000_000n)
      .build(evmSigner);

    while (plan.nextStep()) {
      try {
        const result = await plan.nextStep()?.run();
        console.log(result);
      } catch (error) {
        console.log(error);
        // Either retry the step or break depending on the error.
        break;
      }
    }

  },
);


// it(
//   "should transfer USDC from EVM using forwarding address",
//   async () => {
//     const { icpIdentity } = createTestSigners();

//     const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
//       .receiver(icpIdentity.getPrincipal())
//       .amountInUnits(100_000_000n)
//       .forward();


//   },
// );