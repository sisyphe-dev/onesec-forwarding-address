use ic_ethereum_types::Address;
use ic_secp256k1::{DerivationIndex, DerivationPath, PublicKey};
use wasm_bindgen::prelude::*;

pub const MAINNET_KEY_ID: u8 = 0;
pub const TESTNET_KEY_ID: u8 = 1;
pub const LOCAL_KEY_ID: u8 = 2;

/// Obtained from `get_metadata()` endpoint of `5okwm-giaaa-aaaar-qbn6a-cai`.
pub const MAINNET_PUBLIC_KEY: &str = r#"
-----BEGIN PUBLIC KEY-----
MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAE4U7h8g/utxSXviWiwrZnQQ/FtNkAOkY8
9InghxAYPbxr+UexWfudSoJ9nE25xwme4Gi8DO4pDxyPDfIeFCzCNw==
-----END PUBLIC KEY-----
"#;
pub const MAINNET_CHAIN_CODE: &str =
    "0853741652c40fdc1a2cc29789f40ffe3dfbcb63a63dea746b405e20d8a81ea3";

/// Obtained from `get_metadata()` endpoint of `zvjow-lyaaa-aaaar-qap7q-cai`.
pub const TESTNET_PUBLIC_KEY: &str = r#"
-----BEGIN PUBLIC KEY-----
MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEn3MobHw+HBvy6Y6UHJyZDP1W55Vow4K3
lz6RRtgI44HRuTpJAk2TmIaq50e8wFu1Byiwe89P09vUCh0jFOPBww==
-----END PUBLIC KEY-----";
"#;
pub const TESTNET_CHAIN_CODE: &str =
    "db0a0aea740ddb02af1e73550d693d88ec0290b65fe08eb031e3df1fb4301c76";

/// Obtained from `get_metadata()` endpoint of `5okwm-giaaa-aaaar-qbn6a-cai`
/// running in dfx.
pub const LOCAL_PUBLIC_KEY: &str = r#"
-----BEGIN PUBLIC KEY-----
MFYwEAYHKoZIzj0CAQYFK4EEAAoDQgAEgPOczsVDO2aWzmQCP5S3AcUGi+y3FxZJ
95zA/2J5noRLC4RJXw+S7RAMoG2Bvup7FcgIJi5R1wKhquilWh3eNw==
-----END PUBLIC KEY-----
"#;
pub const LOCAL_CHAIN_CODE: &str =
    "70628cc337d33056c29f473dd91d1644a232ac16a8d1d87e0c524e0feafefb6c";

#[wasm_bindgen]
pub fn forwarding_address_from_icrc(key: u8, principal: Vec<u8>, subaccount: Vec<u8>) -> String {
    forwarding_address_from_path(key, derivation_path_icrc(principal, subaccount))
}

#[wasm_bindgen]
pub fn forwarding_address_from_account_id(key: u8, account_id: Vec<u8>) -> String {
    forwarding_address_from_path(key, derivation_path_account_id(account_id))
}

pub fn forwarding_address_from_path(key: u8, path: DerivationPath) -> String {
    let (public_key, chain_code) = public_key_and_chain_code(key);
    let (subkey, _) =
        public_key.derive_subkey_with_chain_code(&path, &chain_code.try_into().unwrap());
    let address = derive_address_from_public_key(&subkey);
    address.to_string()
}

pub fn derivation_path_icrc(principal: Vec<u8>, subaccount: Vec<u8>) -> DerivationPath {
    const ICRC_TAG: u8 = 1;
    let subaccount = if subaccount.is_empty() {
        vec![0u8; 32]
    } else {
        subaccount
    };
    DerivationPath::new(vec![
        DerivationIndex(ICRC_TAG.to_be_bytes().to_vec()),
        DerivationIndex(principal),
        DerivationIndex(subaccount),
    ])
}

pub fn derivation_path_account_id(account_id: Vec<u8>) -> DerivationPath {
    const ACCOUNT_ID_TAG: u8 = 2;
    DerivationPath::new(vec![
        DerivationIndex(ACCOUNT_ID_TAG.to_be_bytes().to_vec()),
        DerivationIndex(account_id),
    ])
}

pub fn derive_address_from_public_key(pubkey: &PublicKey) -> Address {
    fn keccak(bytes: &[u8]) -> [u8; 32] {
        ic_sha3::Keccak256::hash(bytes)
    }
    let key_bytes = pubkey.serialize_sec1(false);
    let hash = keccak(&key_bytes[1..]);
    let mut addr = [0u8; 20];
    addr[..].copy_from_slice(&hash[12..32]);
    Address::new(addr)
}

fn public_key_and_chain_code(key: u8) -> (PublicKey, Vec<u8>) {
    let (public_key, chain_code) = match key {
        TESTNET_KEY_ID => (TESTNET_PUBLIC_KEY, TESTNET_CHAIN_CODE),
        LOCAL_KEY_ID => (LOCAL_PUBLIC_KEY, LOCAL_CHAIN_CODE),
        _ => (MAINNET_PUBLIC_KEY, MAINNET_CHAIN_CODE),
    };
    (
        PublicKey::deserialize_pem(public_key.trim()).unwrap(),
        hex_to_bytes(chain_code.trim()),
    )
}

fn hex_to_bytes(hex: &str) -> Vec<u8> {
    (0..hex.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&hex[i..i + 2], 16).unwrap())
        .collect()
}

#[cfg(test)]
mod tests {
    use candid::Principal;
    use ic_base_types::PrincipalId;
    use icp_ledger::AccountIdentifier;

    use super::*;

    #[test]
    fn test_local_principal() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let address = forwarding_address_from_icrc(
            LOCAL_KEY_ID,
            principal.as_slice().to_vec(),
            vec![0u8; 32],
        );
        assert_eq!(address, "0x52d3bA7321Af4d539cE460bf51312F12781A5980");
    }

    #[test]
    fn test_local_icrc() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let subaccount =
            hex_to_bytes("1122334455667788991011121314151617181920212223242526272829303132");
        let address =
            forwarding_address_from_icrc(LOCAL_KEY_ID, principal.as_slice().to_vec(), subaccount);
        assert_eq!(address, "0xF98948D04b26c1cEd58ccC090FcBbE7ab6aAAceD");
    }

    #[test]
    fn test_local_account_id() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let subaccount =
            hex_to_bytes("1122334455667788991011121314151617181920212223242526272829303132");
        let account_id = AccountIdentifier::new(
            PrincipalId(principal),
            Some(icp_ledger::Subaccount(subaccount.try_into().unwrap())),
        );
        let address = forwarding_address_from_account_id(LOCAL_KEY_ID, account_id.to_vec());
        assert_eq!(address, "0x496E79C2968dd543A4AF2122cF40f4865a2f8b56");
    }

    #[test]
    fn test_testnet_principal() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let address = forwarding_address_from_icrc(
            TESTNET_KEY_ID,
            principal.as_slice().to_vec(),
            vec![0u8; 32],
        );
        assert_eq!(address, "0xeDB5b0F1643Da8D7b469c9f341f3d9a73FD3375b");
    }

    #[test]
    fn test_testnet_icrc() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let subaccount =
            hex_to_bytes("1122334455667788991011121314151617181920212223242526272829303132");
        let address =
            forwarding_address_from_icrc(TESTNET_KEY_ID, principal.as_slice().to_vec(), subaccount);
        assert_eq!(address, "0x1fe31a8561B03a65d89d91470caB89FE3bfA6190");
    }

    #[test]
    fn test_testnet_account_id() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let subaccount =
            hex_to_bytes("1122334455667788991011121314151617181920212223242526272829303132");
        let account_id = AccountIdentifier::new(
            PrincipalId(principal),
            Some(icp_ledger::Subaccount(subaccount.try_into().unwrap())),
        );
        let address = forwarding_address_from_account_id(TESTNET_KEY_ID, account_id.to_vec());
        assert_eq!(address, "0x86FD21eb1B9144157887092d50BcD671e450b264");
    }

    #[test]
    fn test_mainnet_principal() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let address = forwarding_address_from_icrc(
            MAINNET_KEY_ID,
            principal.as_slice().to_vec(),
            vec![0u8; 32],
        );
        assert_eq!(address, "0x657fCc7D102F28573f1e26325e6C2953875cc8cE");
    }

    #[test]
    fn test_mainnet_icrc() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let subaccount =
            hex_to_bytes("1122334455667788991011121314151617181920212223242526272829303132");
        let address =
            forwarding_address_from_icrc(MAINNET_KEY_ID, principal.as_slice().to_vec(), subaccount);
        assert_eq!(address, "0x6BA62947ee2c95Dd57B54c18C01AA22f875a14cc");
    }

    #[test]
    fn test_mainnet_account_id() {
        let principal = Principal::from_text("5okwm-giaaa-aaaar-qbn6a-cai").unwrap();
        let subaccount =
            hex_to_bytes("1122334455667788991011121314151617181920212223242526272829303132");
        let account_id = AccountIdentifier::new(
            PrincipalId(principal),
            Some(icp_ledger::Subaccount(subaccount.try_into().unwrap())),
        );
        let address = forwarding_address_from_account_id(MAINNET_KEY_ID, account_id.to_vec());
        assert_eq!(address, "0x6aC101c84aca267EBf1491C1487E4ae021709256");
    }
}
