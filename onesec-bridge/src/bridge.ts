import { Actor, type Agent } from "@dfinity/agent";
import { Signer } from "ethers";
import type { Config } from "./config";
import { erc20, locker, operatingMode } from "./evm";
import * as fromCandid from "./fromCandid";
import {
  anonymousOneSec,
  encodeIcrcAccount,
  icrcLedgerWithAgent,
  oneSecWithAgent,
} from "./icp";
import * as toCandid from "./toCandid";
import type {
  Addresses,
  Deployment,
  EvmChain,
  IcrcAccount,
  OneSecBridge,
  Token,
  Transfer,
  TransferId,
  TransferResponse,
} from "./types";

export class OneSecBridgeImpl implements OneSecBridge {
  constructor(
    private deployment: Deployment,
    private addresses?: Addresses,
    private config?: Config,
  ) {}

  async transferIcpToEvm(
    agent: Agent,
    token: Token,
    icpAccount: IcrcAccount,
    icpAmount: bigint,
    evmChain: EvmChain,
    evmAddress: string,
    evmAmount?: bigint,
  ): Promise<TransferResponse> {
    const agentPrincipal = await agent.getPrincipal();
    if (agentPrincipal.toText() !== icpAccount.owner.toText()) {
      return this.failedResponse(
        `Agent principal ${agentPrincipal.toText()} does not match ICP account ${icpAccount.owner.toText()}`,
      );
    }

    try {
      const [ledger, onesec] = await Promise.all([
        icrcLedgerWithAgent(token, agent, this.addresses, this.config),
        oneSecWithAgent(this.deployment, agent, this.addresses, this.config),
      ]);

      const spenderId = Actor.canisterIdOf(onesec as any);
      const approvalResult = await ledger.icrc2_approve({
        amount: icpAmount,
        spender: { owner: spenderId, subaccount: [] },
        fee: [],
        memo: [],
        from_subaccount: icpAccount.subaccount ? [icpAccount.subaccount] : [],
        created_at_time: [],
        expected_allowance: [],
        expires_at: [],
      });

      if ("Err" in approvalResult) {
        return this.failedResponse(
          `Approval failed: ${JSON.stringify(approvalResult.Err)}`,
        );
      }

      const result = await onesec.transfer_icp_to_evm({
        token: toCandid.token(token),
        evm_chain: toCandid.chain(evmChain),
        evm_account: { address: evmAddress },
        icp_account: toCandid.icpAccount(icpAccount),
        icp_amount: icpAmount,
        evm_amount: evmAmount !== undefined ? [evmAmount] : [],
      });

      return fromCandid.transferResponse(result);
    } catch (error) {
      return this.failedResponse(`Transfer failed: ${error}`);
    }
  }

  async transferEvmToIcp(
    signer: Signer,
    token: Token,
    evmChain: EvmChain,
    evmAddress: string,
    evmAmount: bigint,
    icpAccount: IcrcAccount,
    icpAmount?: bigint,
  ): Promise<TransferResponse> {
    try {
      const evmTxHash = await this.executeEvmTransaction(
        signer,
        token,
        evmChain,
        evmAmount,
        icpAccount,
      );

      return await this.submitEvmToIcpWithRetry(
        token,
        evmChain,
        evmAddress,
        evmTxHash,
        evmAmount,
        icpAccount,
        icpAmount,
      );
    } catch (error) {
      return this.failedResponse(`EVM to ICP transfer failed: ${error}`);
    }
  }

  async getTransfer(transferId: TransferId): Promise<Transfer> {
    try {
      const onesec = await anonymousOneSec(
        this.deployment,
        this.addresses,
        this.config,
      );
      const result = await onesec.get_transfer(transferId);

      if ("Err" in result) {
        throw new Error(result.Err);
      }

      return fromCandid.transfer(result.Ok);
    } catch (error) {
      throw new Error(`Failed to get transfer: ${error}`);
    }
  }

  // Helper methods

  private failedResponse(error: string): TransferResponse {
    return { Failed: { error } };
  }

  private async executeEvmTransaction(
    signer: Signer,
    token: Token,
    evmChain: EvmChain,
    evmAmount: bigint,
    icpAccount: IcrcAccount,
  ): Promise<string> {
    const mode = operatingMode(evmChain, token, this.config);
    const [data1, data2] = encodeIcrcAccount(icpAccount);

    switch (mode) {
      case "locker":
        return await this.executeLockerTransaction(
          signer,
          token,
          evmChain,
          evmAmount,
          data1,
          data2,
        );

      case "minter":
        return await this.executeMinterTransaction(
          signer,
          token,
          evmChain,
          evmAmount,
          data1,
          data2,
        );

      default:
        throw new Error(`Unsupported mode: ${mode}`);
    }
  }

  private async executeLockerTransaction(
    signer: Signer,
    token: Token,
    evmChain: EvmChain,
    evmAmount: bigint,
    data1: Uint8Array,
    data2?: Uint8Array,
  ): Promise<string> {
    const tokenContract = erc20(signer, evmChain, token, this.config);
    const [lockerContract, lockerAddress] = locker(
      signer,
      evmChain,
      token,
      this.config,
    );

    // Approve tokens
    const approveTx = await tokenContract.approve(lockerAddress, evmAmount);
    const approveReceipt = await approveTx.wait();
    if (approveReceipt.status !== 1) {
      throw new Error(`Approve transaction failed: ${approveReceipt.hash}`);
    }

    // Lock tokens
    const lockTx = data2
      ? await lockerContract.lock2(evmAmount, data1, data2)
      : await lockerContract.lock1(evmAmount, data1);

    const lockReceipt = await lockTx.wait();
    if (lockReceipt.status !== 1) {
      throw new Error(`Lock transaction failed: ${lockReceipt.hash}`);
    }

    return lockReceipt.hash;
  }

  private async executeMinterTransaction(
    signer: Signer,
    token: Token,
    evmChain: EvmChain,
    evmAmount: bigint,
    data1: Uint8Array,
    data2?: Uint8Array,
  ): Promise<string> {
    const minter = erc20(signer, evmChain, token, this.config);

    // Burn tokens
    const burnTx = data2
      ? await minter.burn2(evmAmount, data1, data2)
      : await minter.burn1(evmAmount, data1);

    const burnReceipt = await burnTx.wait();
    if (burnReceipt.status !== 1) {
      throw new Error(`Burn transaction failed: ${burnReceipt.hash}`);
    }

    return burnReceipt.hash;
  }

  private async submitEvmToIcpWithRetry(
    token: Token,
    evmChain: EvmChain,
    evmAddress: string,
    evmTxHash: string,
    evmAmount: bigint,
    icpAccount: IcrcAccount,
    icpAmount?: bigint,
  ): Promise<TransferResponse> {
    const onesec = await anonymousOneSec(
      this.deployment,
      this.addresses,
      this.config,
    );

    let delay = 1000;
    const maxDelay = 10000;
    const delayMultiplier = 1.5;

    while (true) {
      const result = await onesec.transfer_evm_to_icp({
        token: toCandid.token(token),
        evm_chain: toCandid.chain(evmChain),
        evm_account: toCandid.evmAccount(evmAddress),
        evm_tx: toCandid.evmTx({ hash: evmTxHash }),
        icp_account: toCandid.icpAccount(icpAccount),
        evm_amount: evmAmount,
        icp_amount: icpAmount !== undefined ? [icpAmount] : [],
      });

      const response = fromCandid.transferResponse(result);

      if ("Fetching" in response) {
        await sleep(delay);
        delay = Math.min(maxDelay, delay * delayMultiplier);
        continue;
      }

      return response;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
