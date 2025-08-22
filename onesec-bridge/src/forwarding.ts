import { unzip } from "fflate";
import * as fromCandid from "./fromCandid";
import wasmInit, * as wasm from "./generated/wasm/forwarding_address";
import { FORWARDING_ADDRESS_WASM } from "./generated/wasm/forwarding_address.wasm";
import { anonymousOneSec, type OneSec } from "./icp";
import * as toCandid from "./toCandid";
import type {
  Addresses,
  Deployment,
  EvmAccount,
  EvmChain,
  ForwardingResponse,
  IcrcAccount,
  OneSecForwarding,
  Token,
  Transfer,
  TransferId,
} from "./types";

let wasmInitialized = false;

async function setupWasm(): Promise<void> {
  if (wasmInitialized) {
    return;
  }

  const zipped = Uint8Array.from(atob(FORWARDING_ADDRESS_WASM), (c) =>
    c.charCodeAt(0),
  );
  const unzipped: ArrayBuffer = await new Promise((resolve) => {
    unzip(zipped, (err, files) => {
      if (err !== null) throw err;
      const [_filename, data] = Object.entries(files)[0];
      resolve(data.buffer as ArrayBuffer);
    });
  });

  await wasmInit({ module_or_path: unzipped });
  wasmInitialized = true;
}

export class OneSecForwardingImpl implements OneSecForwarding {
  deployment: Deployment;
  addresses?: Addresses;
  onesec?: OneSec;

  constructor(deployment: Deployment, addresses?: Addresses) {
    this.deployment = deployment;
    this.addresses = addresses;
  }

  async addressFor(receiver: IcrcAccount): Promise<string> {
    let onesec = this.onesec;
    if (onesec === undefined) {
      onesec = this.onesec = await anonymousOneSec(
        this.deployment,
        this.addresses,
      );
    }

    const account = await this.computeAddressFor(receiver);
    const result = await onesec.validate_forwarding_address(
      toCandid.icpAccount(receiver),
      account.address,
    );
    if ("Err" in result) {
      throw Error(result.Err);
    }
    return account.address;
  }

  async getForwardingStatus(
    token: Token,
    sourceChain: EvmChain,
    sender: string,
    receiver: IcrcAccount,
  ): Promise<ForwardingResponse> {
    let onesec = this.onesec;
    if (onesec == undefined) {
      onesec = this.onesec = await anonymousOneSec(
        this.deployment,
        this.addresses,
      );
    }

    const result = await onesec.get_forwarding_status({
      chain: toCandid.chain(sourceChain),
      token: toCandid.token(token),
      address: sender,
      receiver: toCandid.icpAccount(receiver),
    });

    if ("Err" in result) {
      throw Error(result.Err);
    }
    return fromCandid.forwardingResponse(result.Ok);
  }

  async forwardEvmToIcp(
    token: Token,
    sourceChain: EvmChain,
    sender: string,
    receiver: IcrcAccount,
  ): Promise<ForwardingResponse> {
    let onesec = this.onesec;
    if (onesec === undefined) {
      onesec = this.onesec = await anonymousOneSec(
        this.deployment,
        this.addresses,
      );
    }
    const result = await onesec.forward_evm_to_icp({
      chain: toCandid.chain(sourceChain),
      token: toCandid.token(token),
      address: sender,
      receiver: toCandid.icpAccount(receiver),
    });
    if ("Err" in result) {
      throw Error(result.Err);
    }
    return fromCandid.forwardingResponse(result.Ok);
  }

  async getTransfer(transferId: TransferId): Promise<Transfer> {
    let onesec = this.onesec;
    if (onesec === undefined) {
      onesec = this.onesec = await anonymousOneSec(
        this.deployment,
        this.addresses,
      );
    }
    const result = await onesec.get_transfer(transferId);
    if ("Err" in result) {
      throw Error(result.Err);
    }
    return fromCandid.transfer(result.Ok);
  }

  async computeAddressFor(receiver: IcrcAccount): Promise<EvmAccount> {
    await setupWasm();
    if (
      receiver.subaccount !== undefined &&
      receiver.subaccount.length !== 32
    ) {
      throw Error(
        `invalid subaccount length: expected 32, but ${receiver.subaccount.length}`,
      );
    }
    const principal = receiver.owner.toUint8Array();
    const subaccount = receiver.subaccount ?? new Uint8Array(32);
    const address = wasm.forwarding_address_from_icrc(
      this.keyId(),
      principal,
      subaccount,
    );
    return {
      address,
    };
  }

  keyId(): number {
    switch (this.deployment) {
      case "Mainnet":
        return 0;
      case "Testnet":
        return 1;
      case "Local":
        return 2;
    }
  }
}
