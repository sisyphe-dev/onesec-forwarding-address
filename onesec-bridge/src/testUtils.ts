import { config } from "dotenv";
import { JsonRpcProvider, Wallet } from "ethers";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

// Load environment variables from .env file
config();

export interface TestSigners {
  /**
   * Ethers signer created from the TEST_EVM_PRIVATE_KEY environment variable
   */
  evmSigner: Wallet;
  
  /**
   * ICP Secp256k1KeyIdentity created from the same TEST_EVM_PRIVATE_KEY environment variable
   */
  icpIdentity: Secp256k1KeyIdentity;
}

/**
 * Creates both an ethers Signer and an ICP Secp256k1KeyIdentity from the TEST_EVM_PRIVATE_KEY environment variable.
 * 
 * This utility function is designed for testing and development purposes. It loads the .env file
 * and uses the TEST_EVM_PRIVATE_KEY to create signers for both EVM chains and the Internet Computer.
 * 
 * IMPORTANT: This function will throw an error if TEST_EVM_PRIVATE_KEY is not set. Tests using
 * this function will fail if the environment variable is missing, which ensures proper test setup.
 * 
 * @param rpcUrl The RPC URL to connect the EVM signer to. Defaults to Base mainnet.
 * @returns An object containing both the EVM signer and ICP identity
 * @throws Error if TEST_EVM_PRIVATE_KEY environment variable is not set or invalid
 * 
 * @example
 * ```typescript
 * // Make sure you have TEST_EVM_PRIVATE_KEY in your .env file
 * // TEST_EVM_PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
 * 
 * const { evmSigner, icpIdentity } = createTestSigners("https://mainnet.base.org");
 * 
 * // Use with ethers
 * const evmAddress = await evmSigner.getAddress();
 * 
 * // Use with ICP
 * const principal = icpIdentity.getPrincipal();
 * ```
 */
export function createTestSigners(rpcUrl: string = "https://mainnet.base.org"): TestSigners {
  const privateKey = process.env.TEST_EVM_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error(
      "TEST_EVM_PRIVATE_KEY environment variable is not set. " +
      "Please create a .env file with TEST_EVM_PRIVATE_KEY=0x... or set the environment variable."
    );
  }

  // Ensure private key has 0x prefix
  const formattedPrivateKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;

  try {
    // Create a provider with the specified RPC URL
    const provider = new JsonRpcProvider(rpcUrl);
    
    // Create ethers Wallet connected to provider
    const evmSigner = new Wallet(formattedPrivateKey, provider);

    // Convert hex private key to bytes for Secp256k1KeyIdentity
    const privateKeyBytes = new Uint8Array(
      Buffer.from(formattedPrivateKey.slice(2), "hex")
    );

    // Create ICP Secp256k1KeyIdentity
    const icpIdentity = Secp256k1KeyIdentity.fromSecretKey(privateKeyBytes);

    return {
      evmSigner,
      icpIdentity,
    };
  } catch (error) {
    throw new Error(
      `Failed to create signers from TEST_EVM_PRIVATE_KEY. Please ensure it's a valid 32-byte hex private key: ${error}`
    );
  }
}

/**
 * Loads environment variables and returns the TEST_EVM_PRIVATE_KEY if available.
 * This is a helper function for cases where you need just the raw private key.
 * 
 * @returns The private key from TEST_EVM_PRIVATE_KEY environment variable
 * @throws Error if TEST_EVM_PRIVATE_KEY environment variable is not set
 */
export function getTestPrivateKey(): string {
  const privateKey = process.env.TEST_EVM_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error(
      "TEST_EVM_PRIVATE_KEY environment variable is not set. " +
      "Please create a .env file with TEST_EVM_PRIVATE_KEY=0x... or set the environment variable."
    );
  }

  return privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
}