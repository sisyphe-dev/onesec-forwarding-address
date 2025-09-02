import { HttpAgent } from "@dfinity/agent";
import { describe, expect, it } from "vitest";
import { EvmToIcpBridgeBuilder, IcpToEvmBridgeBuilder } from "./index";
import { createTestSigners } from "./testUtils";

// The purpose of this test is to show how to use the API. It is skipped by
// default because it requires private keys and interacts with the mainnet.
it.skip(
  "should transfer USDC from Base to ICP using bridge directly",
  { timeout: 200000 },
  async () => {
    const { icpIdentity, evmSigner } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(icpIdentity.getPrincipal())
      .amountInUnits(1_500_000n)
      // alternative: use `.amountInTokens(1.5)`
      .build(evmSigner);

    console.log("Plan steps:");
    plan.steps().forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.about().verbose}`);
    });
    console.log("");

    let nextStep;
    while ((nextStep = plan.nextStepToRun())) {
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
        throw error;
      }
    }

    const latestStep = plan.latestStep()!;
    const result = latestStep.status();
    expect(result.state).toBe("succeeded");

    // Verify final results are available
    if (result.amount) {
      console.log(
        `Received: ${result.amount.inTokens} USDC (${result.amount.inUnits} units)`,
      );
      expect(result.amount.inUnits).toBeGreaterThan(0n);
    }
    if (result.transaction) {
      console.log(`Final transaction:`, result.transaction);
      expect(result.transaction).toBeDefined();
    }
  },
);

// The purpose of this test is to show how to use the API. It is skipped by
// default because it requires private keys and interacts with the mainnet.
it.skip(
  "should transfer USDC from ICP to Base using bridge directly",
  { timeout: 200000 },
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
      .amountInUnits(1_500_000n)
      // alternative: use `.amountInTokens(1.5)`
      .build();

    console.log("Plan steps:");
    plan.steps().forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.about().verbose}`);
    });
    console.log("");

    let nextStep;
    while ((nextStep = plan.nextStepToRun())) {
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
        throw error;
      }
    }

    const latestStep = plan.latestStep()!;
    const result = latestStep.status();

    expect(result.state).toBe("succeeded");

    // Verify final results are available
    if (result.amount) {
      console.log(
        `Received: ${result.amount.inTokens} USDC (${result.amount.inUnits} units)`,
      );
      expect(result.amount.inUnits).toBeGreaterThan(0n);
    }
    if (result.transaction) {
      console.log(`Final EVM transaction:`, result.transaction);
      expect(result.transaction).toBeDefined();
    }
  },
);

// The purpose of this test is to show how to use the API. It is skipped by
// default because it requires private keys and interacts with the mainnet.
it.skip(
  "should transfer USDC from Base to ICP using forwarding address",
  { timeout: 2000000 },
  async () => {
    const { icpIdentity } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(
        icpIdentity.getPrincipal(),
        Uint8Array.from([
          1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
          1, 1, 1, 1, 1, 1, 1, 1, 1,
        ]),
      )
      .deployment("Testnet")
      .forward();

    console.log("Plan steps:");
    plan.steps().forEach((step, index) => {
      console.log(`  ${index + 1}. ${step.about().verbose}`);
    });
    console.log("");

    let nextStep;
    let forwardingAddress;
    while ((nextStep = plan.nextStepToRun())) {
      const status = nextStep.status();
      if (status.state === "planned") {
        console.log(nextStep.about().verbose);
      }
      try {
        const result = await nextStep.run();
        console.log(`  - ${result.verbose}`);
        if (result.forwardingAddress) {
          forwardingAddress = result.forwardingAddress;
          break;
        }
      } catch (error) {
        console.log(error);
        // Either retry the step or break depending on the error.
        throw error;
      }
    }

    console.log(`Please send USDC to ${forwardingAddress}`);
    // Wait until the user transfers USDC and then
    // continue with the remaining steps.

    while ((nextStep = plan.nextStepToRun())) {
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
        throw error;
      }
    }

    const latestStep = plan.latestStep()!;
    const result = latestStep.status();

    expect(result.state).toBe("succeeded");

    // Verify final results are available
    if (result.amount) {
      console.log(
        `Received: ${result.amount.inTokens} USDC (${result.amount.inUnits} units)`,
      );
      expect(result.amount.inUnits).toBeGreaterThan(0n);
    }
    if (result.transaction) {
      console.log(`Final ICP transaction:`, result.transaction);
      expect(result.transaction).toBeDefined();
    }
  },
);

describe("Bridging Plan Message Validation", () => {
  it("should have correct step messages for EVM to ICP bridge (USDC/Base)", async () => {
    const { icpIdentity, evmSigner } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(icpIdentity.getPrincipal())
      .amountInUnits(1_500_000n)
      .build(evmSigner);

    const steps = plan.steps();
    const messages = steps.map((step) => ({
      concise: step.about().concise,
      verbose: step.about().verbose,
    }));

    expect(messages).toEqual([
      {
        concise: "Fetch fees and check limits",
        verbose: "Fetch fees and check limits for USDC from Base to ICP",
      },
      {
        concise: "Approve transaction on Base",
        verbose:
          expect.stringContaining(
            "Approve transaction to send 1.5 USDC to OneSec on Base for bridging to",
          ) && expect.stringContaining("on ICP"),
      },
      {
        concise: "Submit transaction on Base",
        verbose:
          expect.stringContaining(
            "Submit transaction to send 1.5 USDC to OneSec on Base for bridging to",
          ) && expect.stringContaining("on ICP"),
      },
      {
        concise: "Confirm blocks on Base",
        verbose:
          expect.stringContaining("Wait for") &&
          expect.stringContaining(
            "blocks on Base until the transaction becomes confirmed",
          ),
      },
      {
        concise: "Validate transaction receipt",
        verbose: "Wait for OneSec to validate transaction receipt",
      },
      {
        concise: "Wait for transfer on ICP",
        verbose:
          expect.stringContaining("Wait for OneSec to transfer USDC to") &&
          expect.stringContaining("on ICP"),
      },
    ]);
  });

  it("should have correct step messages for ICP to EVM bridge (USDC/Base)", async () => {
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

    const steps = plan.steps();
    const messages = steps.map((step) => ({
      concise: step.about().concise,
      verbose: step.about().verbose,
    }));

    expect(messages).toEqual([
      {
        concise: "Fetch fees and check limits",
        verbose: "Fetch fees and check limits for USDC from ICP to Base",
      },
      {
        concise: "Approve transfer on ICP",
        verbose:
          expect.stringContaining(
            "Approve transfer of 1.5 USDC to OneSec on ICP for bridging to",
          ) && expect.stringContaining("on Base"),
      },
      {
        concise: "Transfer on ICP",
        verbose:
          expect.stringContaining(
            "Transfer 1.5 USDC to OneSec on ICP for bridging to",
          ) && expect.stringContaining("on Base"),
      },
      {
        concise: "Wait for transaction on Base",
        verbose:
          expect.stringContaining(
            "Wait for OneSec to sign and submit a transaction to send USDC to",
          ) && expect.stringContaining("on Base"),
      },
      {
        concise: "Confirm blocks on Base",
        verbose:
          expect.stringContaining("Wait for") &&
          expect.stringContaining(
            "blocks on Base until the transaction becomes confirmed",
          ),
      },
      {
        concise: "Validate transaction receipt",
        verbose: "Wait for OneSec to validate the receipt of the transaction",
      },
    ]);
  });

  it("should have correct step messages for EVM to ICP forwarding (USDC/Base)", async () => {
    const { icpIdentity } = createTestSigners();

    const plan = await new EvmToIcpBridgeBuilder("Base", "USDC")
      .receiver(icpIdentity.getPrincipal())
      .amountInUnits(1_500_000n)
      .forward();

    const steps = plan.steps();
    const messages = steps.map((step) => ({
      concise: step.about().concise,
      verbose: step.about().verbose,
    }));

    expect(messages).toEqual([
      {
        concise: "Fetch fees and check limits",
        verbose: "Fetch fees and check limits for USDC from Base to ICP",
      },
      {
        concise: "Compute forwarding address on Base",
        verbose:
          expect.stringContaining(
            "Compute the forwarding address on Base for bridging USDC to",
          ) && expect.stringContaining("on ICP"),
      },
      {
        concise: "Notify user payment on Base",
        verbose:
          "Notify OneSec about a user payment to the forwarding address on Base",
      },
      {
        concise: "Wait for forwarding transaction on Base",
        verbose:
          "Wait for OneSec to detect the USDC payment and submit a forwarding transaction on Base",
      },
      {
        concise: "Confirm blocks on Base",
        verbose:
          expect.stringContaining("Wait for") &&
          expect.stringContaining(
            "blocks on Base until the transaction becomes confirmed",
          ),
      },
      {
        concise: "Validate transaction receipt",
        verbose: "Wait for OneSec to validate transaction receipt",
      },
      {
        concise: "Wait for transfer on ICP",
        verbose:
          expect.stringContaining("Wait for OneSec to transfer USDC to") &&
          expect.stringContaining("on ICP"),
      },
    ]);
  });

  it("should have correct step messages for different tokens (ICP/Arbitrum)", async () => {
    const { icpIdentity, evmSigner } = createTestSigners();
    const evmAddress = await evmSigner.getAddress();

    const agent = HttpAgent.createSync({
      identity: icpIdentity,
      host: "https://ic0.app",
    });

    const plan = await new IcpToEvmBridgeBuilder(agent, "Arbitrum", "ICP")
      .sender(icpIdentity.getPrincipal())
      .receiver(evmAddress)
      .amountInUnits(100_000_000n)
      .build();

    const steps = plan.steps();
    const messages = steps.map((step) => ({
      concise: step.about().concise,
      verbose: step.about().verbose,
    }));

    expect(messages).toEqual([
      {
        concise: "Fetch fees and check limits",
        verbose: "Fetch fees and check limits for ICP from ICP to Arbitrum",
      },
      {
        concise: "Approve transfer on ICP",
        verbose:
          expect.stringContaining(
            "Approve transfer of 1 ICP to OneSec on ICP for bridging to",
          ) && expect.stringContaining("on Arbitrum"),
      },
      {
        concise: "Transfer on ICP",
        verbose:
          expect.stringContaining(
            "Transfer 1 ICP to OneSec on ICP for bridging to",
          ) && expect.stringContaining("on Arbitrum"),
      },
      {
        concise: "Wait for transaction on Arbitrum",
        verbose:
          expect.stringContaining(
            "Wait for OneSec to sign and submit a transaction to send ICP to",
          ) && expect.stringContaining("on Arbitrum"),
      },
      {
        concise: "Confirm blocks on Arbitrum",
        verbose:
          expect.stringContaining("Wait for") &&
          expect.stringContaining(
            "blocks on Arbitrum until the transaction becomes confirmed",
          ),
      },
      {
        concise: "Validate transaction receipt",
        verbose: "Wait for OneSec to validate the receipt of the transaction",
      },
    ]);
  });
});
