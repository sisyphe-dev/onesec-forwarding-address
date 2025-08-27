import { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { expect, it } from "vitest";
import { EvmToIcpBridgeBuilder, IcpToEvmBridgeBuilder, oneSecForwarding } from "./index";
import { createTestSigners } from "./testUtils";

// it(
//   "should bridge using a forwarding address",
//   { timeout: 10_000 },
//   async () => {
//     console.log("1");
//     const forwarding = oneSecForwarding();

//     // Step 1. Get the ICP receiver from the user.
//     const receiver = {
//       owner: Principal.fromText(
//         "67m5w-gm4hr-27n4h-l3nav-cgwnn-wczuf-m4cif-5dbl6-pyqe4-4ztyg-lae",
//       ),
//     };

//     // Step 2. Compute the EVM forwarding address for the ICP receiver.
//     const address = await forwarding.addressFor(receiver);
//     console.log("2");

//     // Step 3. Show the forwarding address to the user and instruct them
//     // to transfer tokens for bridging to that address.

//     // Step 4. Once the user transferred tokens, notify the OneSec smart
//     // contract to start bridging.
//     let result = await
//       forwarding.forwardEvmToIcp("USDC", "Base", address, receiver);

//     console.log(result);
//     expect(result.status).toStrictEqual({ CheckingBalance: null });

//     console.log("4");

//     for (let i = 0; i < 1; i++) {
//       result = await
//         forwarding.forwardEvmToIcp("USDC", "Base", address, receiver);
//       console.log("5");

//       if ("done" in result && result.done) {
//         console.log(`✅ Transfer completed in iteration ${i + 1}`);
//         const transfer = await forwarding.getTransfer(result.done);
//         expect(transfer.status).toStrictEqual({ Succeeded: null });
//         break; // Exit loop on success
//       }

//     }

//     console.log("done");
//   },
// );

it(
  "should transfer USDC from ICP to EVM using bridge directly",
  { timeout: 10000 },
  async () => {

    const { icpIdentity, evmSigner } = createTestSigners();
    const evmAddress = await evmSigner.getAddress();

    const agent = HttpAgent.createSync({
      identity: icpIdentity,
      host: "https://ic0.app",
    });


    const plan = await new IcpToEvmBridgeBuilder(agent, "Base", "USDC")
      .sender(icpIdentity.getPrincipal())
      .receiver(evmAddress)
      .amountInUnits(100_000_000n)
      .build();

    console.log(
      "Plan created with steps:",
      plan.steps().map((step: any) => step.about().concise),
    );

    console.log(
      "Plan created with steps:",
      plan.steps().map((step: any) => step.about().verbose),
    );

  },
);

it(
  "should transfer USDC from EVM to ICP using bridge directly",
  { timeout: 10000 },
  async () => {

    // Initialize signers at module level (synchronous)
    const { icpIdentity, evmSigner } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(icpIdentity.getPrincipal())
      .amountInUnits(100_000_000n)
      .build(evmSigner);

    console.log(
      "Plan created with steps:",
      plan.steps().map((step: any) => step.about().concise),
    );

    console.log(
      "Plan created with steps:",
      plan.steps().map((step: any) => step.about().verbose),
    );
  },
);


it(
  "should transfer USDC from EVM using forwarding address",
  { timeout: 10000 },
  async () => {
    const { icpIdentity } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(icpIdentity.getPrincipal())
      .amountInUnits(100_000_000n)
      .forward();

    console.log(
      "Plan created with steps:",
      plan.steps().map((step: any) => step.about().concise),
    );

    console.log(
      "Plan created with steps:",
      plan.steps().map((step: any) => step.about().verbose),
    );
  },
);