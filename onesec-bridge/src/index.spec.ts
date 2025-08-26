import { HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { Principal } from "@dfinity/principal";
import { existsSync, readFileSync } from "fs";
import { expect, it } from "vitest";
import { IcpToEvmBridgeBuilder, oneSecForwarding } from "./index";

it(
  "should bridge using a forwarding address",
  async () => {
    const forwarding = oneSecForwarding();

    // Step 1. Get the ICP receiver from the user.
    const receiver = {
      owner: Principal.fromText(
        "67m5w-gm4hr-27n4h-l3nav-cgwnn-wczuf-m4cif-5dbl6-pyqe4-4ztyg-lae",
      ),
    };

    // Step 2. Compute the EVM forwarding address for the ICP receiver.
    const address = await forwarding.addressFor(receiver);

    // Step 3. Show the forwarding address to the user and instruct them
    // to transfer tokens for bridging to that address.

    // Step 4. Once the user transferred tokens, notify the OneSec smart
    // contract to start bridging.
    let result = await forwarding.forwardEvmToIcp(
      "USDC",
      "Base",
      address,
      receiver,
    );

    console.log(result);
    expect(result.status).toStrictEqual({ CheckingBalance: { retry: 0 } });

    // Step 5. Poll the bridging status until it succeeds
    for (let i = 0; i < 50; i++) {
      result = await forwarding.forwardEvmToIcp(
        "USDC",
        "Base",
        address,
        receiver,
      );
      console.log(result);

      if ("done" in result && result.done) {
        const transfer = await forwarding.getTransfer(result.done);
        expect(transfer.status).toStrictEqual({ Succeeded: null });
      }
    }
  },
  { timeout: 10_000 },
);

it(
  "should transfer ICP to EVM using icpToEvmBridgeBuilder",
  async () => {
    if (!existsSync("test_key.pem")) {
      console.warn(
        "To run this test, create test_key.pem as follows:\n\
      openssl ecparam -name secp256k1 -genkey --noout > test_key.pem",
      );
      return; // Exit successfully
    }

    const pem = readFileSync("test_key.pem", "utf8");
    const identity = Secp256k1KeyIdentity.fromPem(pem);

    const agent = new HttpAgent({
      identity,
      host: "https://ic0.app",
    });

    console.log(`Using test principal: ${identity.getPrincipal()}`);

    const bridge = new IcpToEvmBridgeBuilder(agent, "Base", "ICP");

    const icpAccount = {
      owner: identity.getPrincipal(),
      subaccount: undefined,
    };
    const icpAmount = BigInt(100000000);
    const evmAddress = "0x1234567890123456789012345678901234567890";

    const plan = await bridge
      .target("Mainnet")
      .sender(icpAccount.owner, icpAccount.subaccount)
      .receiver(evmAddress)
      .amountInUnits(icpAmount)
      .build();

    console.log(
      "Plan created with steps:",
      plan.steps().map((step: any) => step.details().summary),
    );

    const result = await plan.runAllSteps();

    console.log("Plan execution result:", result);

    if ("Err" in result) {
      console.error("Plan execution failed:", result.Err.verbose);
      expect.fail("Plan execution should not fail");
    }

    if ("Ok" in result) {
      console.log("Plan executed successfully:", result.Ok.about.concise);
      expect(result.Ok).toBeDefined();
    }
  },
  { timeout: 60_000 },
);
