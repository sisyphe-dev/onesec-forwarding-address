import { OneSecForwardingImpl } from "./forwarding";

import { Principal } from "@dfinity/principal";
import { expect, it } from "vitest";

const TEST_USER: Principal = Principal.fromText(
  "67m5w-gm4hr-27n4h-l3nav-cgwnn-wczuf-m4cif-5dbl6-pyqe4-4ztyg-lae",
);
const TEST_CANISTER: Principal = Principal.fromText(
  "5okwm-giaaa-aaaar-qbn6a-cai",
);

const ZERO_SUBACCOUNT: Uint8Array = new Uint8Array(32);
const SUBACCOUNT: Uint8Array = Uint8Array.from({ length: 32 }, () => 0x10);

const MAINNET: OneSecForwardingImpl = new OneSecForwardingImpl("Mainnet");
const TESTNET: OneSecForwardingImpl = new OneSecForwardingImpl("Testnet");
const LOCAL: OneSecForwardingImpl = new OneSecForwardingImpl("Local");

it("should compute a forwarding address from principal using the local key", async () => {
  let address = (await LOCAL.computeAddressFor({ owner: TEST_USER })).address;
  expect(address).toBe("0x72B1E739D1820c107444A905fB8BA3a0892c609D");

  address = (await LOCAL.computeAddressFor({
    owner: TEST_USER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0x72B1E739D1820c107444A905fB8BA3a0892c609D");

  address = (await LOCAL.computeAddressFor({ owner: TEST_CANISTER })).address;
  expect(address).toBe("0x52d3bA7321Af4d539cE460bf51312F12781A5980");

  address = (await LOCAL.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0x52d3bA7321Af4d539cE460bf51312F12781A5980");
});

it("should compute a forwarding address from principal and subaccount using the local key", async () => {
  let address = (await LOCAL.computeAddressFor({
    owner: TEST_USER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0xbD258f996193DB6Aa331F6fe15e8A616F6c959da");

  address = (await LOCAL.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0x7690153FA77E24A0b4d99c5470D5ecfc194638A4");
});

it("should compute a forwarding address from principal using the testnet key", async () => {
  let address = (await TESTNET.computeAddressFor({ owner: TEST_USER })).address;
  expect(address).toBe("0xCB2Cb2891A17EC7061C893b92339A94fEFf931A4");

  address = (await TESTNET.computeAddressFor({
    owner: TEST_USER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0xCB2Cb2891A17EC7061C893b92339A94fEFf931A4");

  address = (await TESTNET.computeAddressFor({ owner: TEST_CANISTER })).address;
  expect(address).toBe("0xeDB5b0F1643Da8D7b469c9f341f3d9a73FD3375b");

  address = (await TESTNET.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0xeDB5b0F1643Da8D7b469c9f341f3d9a73FD3375b");
});

it("should compute a forwarding address from principal and subaccount using the testnet key", async () => {
  let address = (await TESTNET.computeAddressFor({
    owner: TEST_USER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0x8EaEABd80C19564cD0aE96403819b6Bcd4613137");

  address = (await TESTNET.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0xbE0272AA6184af0d0260Dba6939805892d6E4D02");
});

it("should compute a forwarding address from principal using the mainnet key", async () => {
  let address = (await MAINNET.computeAddressFor({ owner: TEST_USER })).address;
  expect(address).toBe("0xd9a24235A26CE7bFe34b6Ca1eB95272D2D4d084E");

  address = (await MAINNET.computeAddressFor({
    owner: TEST_USER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0xd9a24235A26CE7bFe34b6Ca1eB95272D2D4d084E");

  address = (await MAINNET.computeAddressFor({ owner: TEST_CANISTER })).address;
  expect(address).toBe("0x657fCc7D102F28573f1e26325e6C2953875cc8cE");

  address = (await MAINNET.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0x657fCc7D102F28573f1e26325e6C2953875cc8cE");
});

it("should compute a forwarding address from principal and subaccount using the mainnet key", async () => {
  let address = (await MAINNET.computeAddressFor({
    owner: TEST_USER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0xE91da02501A1f04713B68B9B8A3E5f7c390B3b1F");

  address = (await MAINNET.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0xafc13a1c52022aAad32Cd7Bb6753Cb41ef25cd45");
});

it("should validate a forwarding address from principal using the local key", async () => {
  let address = (await LOCAL.computeAddressFor({ owner: TEST_USER })).address;
  expect(address).toBe("0x72B1E739D1820c107444A905fB8BA3a0892c609D");

  address = (await LOCAL.computeAddressFor({
    owner: TEST_USER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0x72B1E739D1820c107444A905fB8BA3a0892c609D");

  address = (await LOCAL.computeAddressFor({ owner: TEST_CANISTER })).address;
  expect(address).toBe("0x52d3bA7321Af4d539cE460bf51312F12781A5980");

  address = (await LOCAL.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0x52d3bA7321Af4d539cE460bf51312F12781A5980");
});

it("should validate a forwarding address from principal and subaccount using the local key", async () => {
  let address = (await LOCAL.computeAddressFor({
    owner: TEST_USER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0xbD258f996193DB6Aa331F6fe15e8A616F6c959da");

  address = (await LOCAL.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0x7690153FA77E24A0b4d99c5470D5ecfc194638A4");
});

it("should validate a forwarding address from principal using the testnet key", async () => {
  let address = (await TESTNET.computeAddressFor({ owner: TEST_USER })).address;
  expect(address).toBe("0xCB2Cb2891A17EC7061C893b92339A94fEFf931A4");

  address = (await TESTNET.computeAddressFor({
    owner: TEST_USER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0xCB2Cb2891A17EC7061C893b92339A94fEFf931A4");

  address = (await TESTNET.computeAddressFor({ owner: TEST_CANISTER })).address;
  expect(address).toBe("0xeDB5b0F1643Da8D7b469c9f341f3d9a73FD3375b");

  address = (await TESTNET.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0xeDB5b0F1643Da8D7b469c9f341f3d9a73FD3375b");
});

it("should validate a forwarding address from principal and subaccount using the testnet key", async () => {
  let address = (await TESTNET.computeAddressFor({
    owner: TEST_USER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0x8EaEABd80C19564cD0aE96403819b6Bcd4613137");

  address = (await TESTNET.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0xbE0272AA6184af0d0260Dba6939805892d6E4D02");
});

it("should validate a forwarding address from principal using the mainnet key", async () => {
  let address = (await MAINNET.computeAddressFor({ owner: TEST_USER })).address;
  expect(address).toBe("0xd9a24235A26CE7bFe34b6Ca1eB95272D2D4d084E");

  address = (await MAINNET.computeAddressFor({
    owner: TEST_USER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0xd9a24235A26CE7bFe34b6Ca1eB95272D2D4d084E");

  address = (await MAINNET.computeAddressFor({ owner: TEST_CANISTER })).address;
  expect(address).toBe("0x657fCc7D102F28573f1e26325e6C2953875cc8cE");

  address = (await MAINNET.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: ZERO_SUBACCOUNT,
  })).address;
  expect(address).toBe("0x657fCc7D102F28573f1e26325e6C2953875cc8cE");
});

it("should validate a forwarding address from principal and subaccount using the mainnet key", async () => {
  let address = (await MAINNET.computeAddressFor({
    owner: TEST_USER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0xE91da02501A1f04713B68B9B8A3E5f7c390B3b1F");

  address = (await MAINNET.computeAddressFor({
    owner: TEST_CANISTER,
    subaccount: SUBACCOUNT,
  })).address;
  expect(address).toBe("0xafc13a1c52022aAad32Cd7Bb6753Cb41ef25cd45");
});

it("should fetch transfer from testnet", async () => {
  const transfer = await TESTNET.getTransfer({ id: 0n });
  expect(transfer.status).toStrictEqual({ Succeeded: null });
  expect(transfer.source).toStrictEqual({
    account: {
      Evm: {
        address: "0xa5b6f8ac11FE384B9fcCCFBfa479e020C227a44E",
      },
    },
    amount: 50000000n,
    chain: "Base",
    token: "ICP",
    tx: {
      Evm: {
        hash: "0x047fdff854a684bcdc9e8aa116e4a741341add8d49b2be2e87acd24dea826db9",
        logIndex: 67n,
      },
    },
  });
  expect(transfer.destination).toStrictEqual({
    account: {
      Icp: {
        ICRC: {
          owner: Principal.fromText(
            "vd7os-t3w2v-mvnpf-jr3xm-o7zmf-ngo2c-cpeq2-7e4sz-sldnl-x4twb-4ae",
          ),
          subaccount: undefined,
        },
      },
    },
    amount: 49890000n,
    chain: "ICP",
    token: "ICP",
    tx: {
      Icp: {
        blockIndex: 25007984n,
        ledger: Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
      },
    },
  });
});
