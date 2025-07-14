import { Principal } from "@dfinity/principal";
import { expect, it } from "vitest";
import { oneSecForwarding } from "./index";

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
