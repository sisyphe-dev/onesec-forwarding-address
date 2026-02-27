import { Principal } from "@dfinity/principal";
import type { Amount, IcrcAccount, Tx } from "./types";

/**
 * Convert a number to a scaled bigint representation.
 * @param value The number to convert
 * @param decimals Number of decimal places to scale by
 * @returns Scaled bigint representation
 */
export function numberToBigintScaled(value: number, decimals: number): bigint {
  const [integerPart, fractionalPart = ""] = value.toFixed(decimals).split(".");

  const paddedFractionalPart = fractionalPart
    .padEnd(decimals, "0")
    .slice(0, decimals);

  const combined = `${integerPart}${paddedFractionalPart}`;
  return BigInt(combined);
}

/**
 * Convert a scaled bigint to a number representation.
 * @param value The bigint to convert
 * @param decimals Number of decimal places to scale by
 * @returns Number representation
 */
export function bigintToNumberScaled(value: bigint, decimals: number): number {
  const str = value.toString();
  const len = str.length;
  if (decimals === 0) {
    return Number(str);
  }
  if (decimals >= len) {
    return Number("0." + str.padStart(decimals, "0"));
  }
  const diff = len - decimals;
  return Number(str.slice(0, diff) + "." + str.slice(diff));
}

/**
 * Create an Amount object from a bigint value in units.
 * @param units Amount in token's smallest units
 * @param decimals Number of decimal places for the token
 * @returns Amount object with both unit and token representations
 */
export function amountFromUnits(units: bigint, decimals: number): Amount {
  return {
    inUnits: units,
    inTokens: bigintToNumberScaled(units, decimals),
  };
}

/**
 * Create an Amount object from a number value in tokens.
 * @param tokens Amount in human-readable token units
 * @param decimals Number of decimal places for the token
 * @returns Amount object with both unit and token representations
 */
export function amountFromTokens(tokens: number, decimals: number): Amount {
  return {
    inUnits: numberToBigintScaled(tokens, decimals),
    inTokens: tokens,
  };
}

/**
 * Sleep for the specified number of milliseconds.
 * @param ms Number of milliseconds to sleep
 * @returns Promise that resolves after the specified time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate the next delay for exponential backoff.
 * @param currentDelayMs Current delay in milliseconds
 * @param maxDelayMs Maximum delay in milliseconds (default: 10,000ms)
 * @returns Next delay in milliseconds
 */
export function exponentialBackoff(
  currentDelayMs: number,
  maxDelayMs: number = 10_000,
): number {
  return Math.min(maxDelayMs, Math.max(currentDelayMs, 10) * 1.2);
}

/**
 * Encode an ICRC account for use in canister calls.
 *
 * Format of the first array:
 * - bytes[0] = tag: ICRC or account identifier.
 * - bytes[1..32] = encoded principal.
 *
 * Format of the second array:
 * - empty if there is no subaccount
 * - otherwise, subaccount bytes.
 *
 * @param account ICRC account to encode
 * @returns Tuple of encoded principal and optional subaccount
 */
export function encodeIcrcAccount(
  account: IcrcAccount,
): [Uint8Array, Uint8Array?] {
  const principal = encodePrincipal(account.owner);
  if (account.subaccount) {
    return [principal, account.subaccount.slice()];
  }
  return [principal];
}

/**
 * Encode a Principal for use in ICRC account encoding.
 *
 * Format:
 * - bytes[0] = 0 (ICRC account tag)
 * - bytes[1] = the length of the principal in bytes.
 * - bytes[2..length+2] = the principal itself.
 * - bytes[length+2..32] = zeros.
 *
 * @param p Principal to encode
 * @returns Encoded principal as Uint8Array
 */
export function encodePrincipal(p: Principal): Uint8Array {
  const TAG_ICRC = 0;
  const principal = p.toUint8Array();
  const array = new Uint8Array(32);
  array[0] = TAG_ICRC;
  array[1] = principal.length;
  array.set(principal, 2);
  return array;
}

/**
 * Format a bigint amount for display with appropriate decimal precision.
 * @param amount Amount in smallest units
 * @param decimals Number of decimal places for the token
 * @returns Formatted string representation
 */
export function format(amount: bigint, decimals: number): string {
  const tokens = bigintToNumberScaled(amount, decimals);
  const str = tokens.toFixed(6);
  let end = str.length;
  while (end > 2 && str[end - 1] === "0" && str[end - 2] != ".") {
    --end;
  }
  return str.slice(0, end);
}

/**
 * Format an ICRC account for display.
 * @param account ICRC account to format
 * @returns Human-readable string representation
 */
export function formatIcpAccount(account: IcrcAccount): string {
  if (account.subaccount && !account.subaccount.every((x) => x === 0)) {
    const subaccount = [...account.subaccount]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
    return `${account.owner.toText()} / ${subaccount}`;
  }
  return account.owner.toText();
}

/**
 * Format a transaction for display.
 * @param tx Transaction to format (optional)
 * @returns Human-readable string representation
 */
export function formatTx(tx?: Tx): string {
  if (tx === undefined) {
    return "";
  }
  if ("Icp" in tx) {
    return `${tx.Icp.ledger.toText()} / ${tx.Icp.blockIndex}`;
  } else if ("Evm" in tx) {
    return tx.Evm.hash;
  } else {
    return "";
  }
}
