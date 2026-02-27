import type { Principal } from "@dfinity/principal";
import { anonymousOneSec } from "./bridge/shared";
import * as fromCandid from "./fromCandid";
import * as toCandid from "./toCandid";
import type { Deployment, Transfer } from "./types";

/**
 * Fetch recent transfers for a given ICP account.
 *
 * Queries the OneSec canister's `get_transfers` endpoint, which returns
 * transfers ordered from most recent to oldest. Use `count` and `skip` to
 * paginate through results.
 *
 * **Note:** The canister currently returns {@link Transfer} records without
 * their {@link TransferId}. To resume a specific transfer, you need the ID
 * that was returned by the original `transfer_icp_to_evm` call. A canister
 * update is planned to include IDs in the response.
 *
 * @param principal ICP principal of the account
 * @param options Optional filters and pagination
 * @returns Array of transfers for the account
 *
 * @example
 * ```typescript
 * const transfers = await getTransfers(myPrincipal, { count: 5 });
 * for (const t of transfers) {
 *   console.log(t.status, t.source.amount, "->", t.destination.amount);
 * }
 * ```
 */
export async function getTransfers(
  principal: Principal,
  options?: {
    subaccount?: Uint8Array;
    count?: number;
    skip?: number;
    deployment?: Deployment;
  },
): Promise<Transfer[]> {
  const deployment = options?.deployment ?? "Mainnet";
  const onesec = await anonymousOneSec(deployment);
  const account = {
    Icp: toCandid.icpAccount({
      owner: principal,
      subaccount: options?.subaccount,
    }),
  };
  const result = await onesec.get_transfers({
    count: BigInt(options?.count ?? 10),
    skip: BigInt(options?.skip ?? 0),
    accounts: [account],
  });
  if ("Err" in result) {
    throw new Error(`Failed to get transfers: ${result.Err}`);
  }
  return result.Ok.map(fromCandid.transfer);
}
