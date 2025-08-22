import { HttpAgent } from "@dfinity/agent";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";
import { Principal } from "@dfinity/principal";
import { existsSync, readFileSync } from "fs";
import { expect, it } from "vitest";
import { oneSecBridge, oneSecForwarding } from "./index";

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

    expect(result.done).toBe(undefined);
    expect(result.status).toStrictEqual({ CheckingBalance: null });

    // Step 5. If tokens were actually transferred to the forwarding address in Step 3,
    // then they would be forwarded to the ICP receiver within 1-2 minutes.
    // The new status of forwarding can be fetched by calling `forward_evm_to_icp`.

    result = await forwarding.forwardEvmToIcp(
      "USDC",
      "Base",
      address,
      receiver,
    );

    if (result.done !== undefined) {
      const transfer = await forwarding.getTransfer(result.done);
      expect(transfer.status).toStrictEqual({ Succeeded: null });
    }
  },
  { timeout: 10_000 },
);

it(
  "should transfer ICP to EVM using oneSecBridge",
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

    console.log(`Using test principal: ${agent.getPrincipal()}`);

    const bridge = oneSecBridge("Mainnet");

    const icpAccount = {
      owner: identity.getPrincipal(),
      subaccount: undefined,
    };
    const icpAmount = BigInt(100000000);
    const evmChain = "Base" as const;
    const evmAddress = "0x1234567890123456789012345678901234567890";

    const response = await bridge.transferIcpToEvm(
      agent,
      "ICP",
      icpAccount,
      icpAmount,
      evmChain,
      evmAddress,
    );

    console.log("Transfer response:", response);

    if ("Failed" in response) {
      console.error("Transfer failed:", response.Failed.error);
      expect.fail(`Transfer failed: ${response.Failed.error}`);
      return;
    }

    if ("Accepted" in response) {
      console.log("Transfer accepted with ID:", response.Accepted.id);

      // Poll for transfer status
      const transferId = response.Accepted;
      let transfer = await bridge.getTransfer(transferId);
      console.log("Initial transfer status:", transfer);

      // Poll until completion (max 5 minutes)
      const maxPolls = 30; // 5 minutes with 10 second intervals
      let polls = 0;

      while (polls < maxPolls) {
        transfer = await bridge.getTransfer(transferId);
        console.log(`Poll ${polls + 1}: Transfer status:`, transfer.status);

        if (transfer.status && "Succeeded" in transfer.status) {
          console.log("Transfer succeeded!");
          expect(transfer.status).toStrictEqual({ Succeeded: null });
          return;
        }

        if (transfer.status && "Failed" in transfer.status) {
          console.error("Transfer failed:", transfer.status.Failed.error);
          expect.fail(`Transfer failed: ${transfer.status.Failed.error}`);
          return;
        }

        // Wait 10 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 10000));
        polls++;
      }

      console.warn("Transfer did not complete within 5 minutes");
      console.log("Final transfer status:", transfer);
    } else if ("Fetching" in response) {
      console.log(
        "Transfer is fetching at block:",
        response.Fetching.blockHeight,
      );
      console.warn(
        "Transfer is still fetching. Manual verification may be needed.",
      );
    }
  },
  { timeout: 300_000 }, // 5 minutes timeout
);
