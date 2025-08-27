import { HttpAgent } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";
import { expect, it } from "vitest";
import { EvmToIcpBridgeBuilder, IcpToEvmBridgeBuilder, oneSecForwarding } from "./index";
import { createTestSigners } from "./testUtils";

it(
  "should transfer USDC from Base to ICP using bridge directly",
  { timeout: 200000 },
  async () => {

    // Initialize signers at module level (synchronous)
    const { icpIdentity, evmSigner } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(icpIdentity.getPrincipal())
      .amountInUnits(1_500_000n)
      .build(evmSigner);

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
        console.log(error);
        // Either retry the step or break depending on the error.
        throw (error);
      }
    }

    const lastStep = plan.lastStep()!;
    const result = lastStep.status();

    if (result.state === "succeeded") {
      console.log("Bridging succeeded")
    } else {
      console.log("Bridging failed")
    }
  },
);

it(
  "should transfer USDC from ICP to Base using bridge directly",
  { timeout: 200000 },
  async () => {

    // Initialize signers at module level (synchronous)
    const { icpIdentity, evmSigner } = createTestSigners();

    const evmAddress = await evmSigner.getAddress();


    const agent = HttpAgent.createSync({
      identity: icpIdentity,
      host: "https://ic0.app",
    });

    const plan = await new IcpToEvmBridgeBuilder(agent, "Base", "USDC")
      .sender(icpIdentity.getPrincipal())
      .receiver(evmAddress)
      .amountInUnits(1_500_000n)
      .build();

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
        console.log(error);
        // Either retry the step or break depending on the error.
        throw (error);
      }
    }

    const lastStep = plan.lastStep()!;
    const result = lastStep.status();

    if (result.state === "succeeded") {
      console.log("Bridging succeeded")
    } else {
      console.log("Bridging failed")
    }
  },
);


it(
  "should transfer USDC from Base to ICP using forwarding address",
  { timeout: 200000 },
  async () => {

    const { icpIdentity } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(icpIdentity.getPrincipal())
      .amountInUnits(1_500_000n)
      .forward();

    let nextStep;
    while (nextStep = plan.nextStep()) {
      const status = nextStep.status();
      if (status.state === "planned") {
        console.log(nextStep.about().verbose);
      }
      try {
        const result = await nextStep.run();
        console.log(`  - ${result.verbose}`);
        if (result.forwardingAddress) {
          console.log(`Please transfer USDC to this address: ${result.forwardingAddress}`);
        }
      } catch (error) {
        console.log(error);
        // Either retry the step or break depending on the error.
        throw (error);
      }
    }

    const lastStep = plan.lastStep()!;
    const result = lastStep.status();

    if (result.state === "succeeded") {
      console.log("Bridging succeeded")
    } else {
      console.log("Bridging failed")
    }
  },
);