import { expect, it } from "vitest";
import { createTestSigners, getTestPrivateKey } from "./testUtils";

it("should create signers from TEST_EVM_PRIVATE_KEY environment variable", async () => {
  const { evmSigner, icpIdentity } = createTestSigners();

  // Test EVM signer
  expect(evmSigner).toBeDefined();
  const evmAddress = await evmSigner.getAddress();
  expect(evmAddress).toMatch(/^0x[a-fA-F0-9]{40}$/); // Valid Ethereum address format

  // Test ICP identity  
  expect(icpIdentity).toBeDefined();
  const principal = icpIdentity.getPrincipal();
  expect(principal.toString()).toBeDefined();
  expect(principal.toString().length).toBeGreaterThan(0);

  console.log(`EVM Address: ${evmAddress}`);
  console.log(`ICP Principal: ${principal.toString()}`);
});

it("should get test private key from environment", () => {
  const privateKey = getTestPrivateKey();
  
  expect(privateKey).toBeDefined();
  expect(privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/); // Valid private key format
  expect(privateKey).toHaveLength(66); // 0x + 64 hex chars
});

it("should throw error when TEST_EVM_PRIVATE_KEY is not set", () => {
  const originalKey = process.env.TEST_EVM_PRIVATE_KEY;
  delete process.env.TEST_EVM_PRIVATE_KEY;

  expect(() => createTestSigners()).toThrow("TEST_EVM_PRIVATE_KEY environment variable is not set");
  expect(() => getTestPrivateKey()).toThrow("TEST_EVM_PRIVATE_KEY environment variable is not set");

  // Restore original value
  if (originalKey) {
    process.env.TEST_EVM_PRIVATE_KEY = originalKey;
  }
});

it("should handle private keys with and without 0x prefix", () => {
  const originalKey = process.env.TEST_EVM_PRIVATE_KEY;
  
  // Test with 0x prefix
  process.env.TEST_EVM_PRIVATE_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  let privateKey = getTestPrivateKey();
  expect(privateKey).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

  // Test without 0x prefix
  process.env.TEST_EVM_PRIVATE_KEY = "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  privateKey = getTestPrivateKey();
  expect(privateKey).toBe("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");

  // Restore original value
  if (originalKey) {
    process.env.TEST_EVM_PRIVATE_KEY = originalKey;
  }
});