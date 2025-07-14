#!/usr/bin/env bash
set -e 
rm -rf pkg
RUSTFLAGS="-C lto=yes -C opt-level=z -C embed-bitcode=yes --remap-path-prefix $HOME=crates" wasm-pack build --release --target web
cd pkg
zip temp.zip forwarding_address_bg.wasm
echo -n 'export const FORWARDING_ADDRESS_WASM: string = "' > forwarding_address.wasm.ts
base64 -w 0 temp.zip >> forwarding_address.wasm.ts
echo '";' >> forwarding_address.wasm.ts
rm temp.zip
cp forwarding_address.d.ts ../../onesec-bridge/src/generated/wasm/
cp forwarding_address.js ../../onesec-bridge/src/generated/wasm/
cp forwarding_address.wasm.ts ../../onesec-bridge/src/generated/wasm/
