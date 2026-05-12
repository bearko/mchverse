#!/usr/bin/env bash
set -euo pipefail

cd "$(git rev-parse --show-toplevel 2>/dev/null || echo "$PWD")"

echo "==> Installing Foundry (forge / cast / anvil)"
if ! command -v forge >/dev/null 2>&1; then
  curl -L https://foundry.paradigm.xyz | bash
  for rc in "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile"; do
    [ -f "$rc" ] || touch "$rc"
    grep -q ".foundry/bin" "$rc" 2>/dev/null || \
      echo 'export PATH="$HOME/.foundry/bin:$PATH"' >> "$rc"
  done
  export PATH="$HOME/.foundry/bin:$PATH"
  "$HOME/.foundry/bin/foundryup"
fi

echo "==> Enabling pnpm via corepack"
corepack enable
corepack prepare pnpm@9.12.3 --activate

echo "==> Installing root npm dependencies"
npm install --no-audit --no-fund

if [ -d contracts ]; then
  echo "==> Installing contracts/ dependencies"
  pushd contracts >/dev/null
  pnpm install --no-frozen-lockfile
  popd >/dev/null
fi

cat <<'EOF'

==================================================
 MCHVerse Codespace is ready.

 Frontend (Next.js):
   npm run dev                # http://localhost:3000

 Contracts (MUD + Foundry):
   cd contracts && pnpm dev          # local anvil + auto-deploy
   cd contracts && pnpm build        # compile only
   cd contracts && pnpm deploy:testnet
   cd contracts && pnpm deploy:mainnet   # after allowlist approval

 Suggested Codespace secrets (Settings -> Codespaces):
   PRIVATE_KEY                            (deployer EOA)
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID   (reown.com)
   SESSION_JWT_SECRET                     (32+ byte random)

 Forwarded ports:
   3000  Next.js
   8545  Anvil
   13690 / 13691  MUD indexer / GraphQL
==================================================
EOF
