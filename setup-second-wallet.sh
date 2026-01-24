#!/bin/bash

# Setup script to create a second wallet instance (Bob) for testing
# Run this from /Users/benjamin/Coding/oc/wallet

echo "🔧 Creating second wallet instance (Bob)..."

# Set paths
SOURCE_PATH="."
DEST_PATH="../wallet-bob"

# Remove existing wallet-bob if it exists
if [ -d "$DEST_PATH" ]; then
    echo "⚠️  Wallet-bob folder already exists. Removing..."
    rm -rf "$DEST_PATH"
fi

echo "📂 Copying wallet folder..."
cp -r "$SOURCE_PATH" "$DEST_PATH"

# Update background.js to use Bob's identity
BG_PATH="$DEST_PATH/background/background.js"

echo "🔄 Updating wallet identity to Bob..."

# Comment out Alice's wallet address and private key
sed -i '' 's/^const WALLET_ADDRESS = '\''0x1111111111111111111111111111111111111111'\'';/\/\/ const WALLET_ADDRESS = '\''0x1111111111111111111111111111111111111111'\'';/' "$BG_PATH"
sed -i '' 's/^const DUMMY_PRIVATE_KEY = '\''a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1'\'';/\/\/ const DUMMY_PRIVATE_KEY = '\''a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1'\'';/' "$BG_PATH"

# Comment out Alice's encryption keys
sed -i '' 's/^const ENCRYPTION_PUBLIC_KEY = '\''MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3MJ6wzmCO7MIC7X1ARmiwXFFgNpkMeRzMOtbvoi7FewOggZMj0kACobXLx+22Pycd7\/tGz91Y6FqXyt+WHy7xA=='\'';/\/\/ const ENCRYPTION_PUBLIC_KEY = '\''MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3MJ6wzmCO7MIC7X1ARmiwXFFgNpkMeRzMOtbvoi7FewOggZMj0kACobXLx+22Pycd7\/tGz91Y6FqXyt+WHy7xA=='\'';/' "$BG_PATH"
sed -i '' 's/^const ENCRYPTION_PRIVATE_KEY = '\''MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgGzkRAogLNTD6ahm+DqODy054lm41lP8N8+CmTJ\/mcUyhRANCAATcwnrDOYI7swgLtfUBGaLBcUWA2mQx5HMw61u+iLsV7A6CBkyPSQAKhtcvH7bY\/Jx3v+0bP3VjoWpfK35YfLvE'\'';/\/\/ const ENCRYPTION_PRIVATE_KEY = '\''MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgGzkRAogLNTD6ahm+DqODy054lm41lP8N8+CmTJ\/mcUyhRANCAATcwnrDOYI7swgLtfUBGaLBcUWA2mQx5HMw61u+iLsV7A6CBkyPSQAKhtcvH7bY\/Jx3v+0bP3VjoWpfK35YfLvE'\'';/' "$BG_PATH"

# Uncomment Bob's wallet address and private key
sed -i '' 's/^\/\/ const WALLET_ADDRESS = '\''0x2222222222222222222222222222222222222222'\'';/const WALLET_ADDRESS = '\''0x2222222222222222222222222222222222222222'\'';/' "$BG_PATH"
sed -i '' 's/^\/\/ const DUMMY_PRIVATE_KEY = '\''b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2'\'';/const DUMMY_PRIVATE_KEY = '\''b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2'\'';/' "$BG_PATH"

# Uncomment Bob's encryption keys  
sed -i '' 's/^\/\/ const ENCRYPTION_PUBLIC_KEY = '\''MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP06TUHqL1ea3y3NPWk2yBooB7FkhPLj0nRhXDu226iV4Xvr+fGVCPgQyglPdbMOYgey66BZeRzt\/RMmAsQ6VCQ=='\'';/const ENCRYPTION_PUBLIC_KEY = '\''MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP06TUHqL1ea3y3NPWk2yBooB7FkhPLj0nRhXDu226iV4Xvr+fGVCPgQyglPdbMOYgey66BZeRzt\/RMmAsQ6VCQ=='\'';/' "$BG_PATH"
sed -i '' 's/^\/\/ const ENCRYPTION_PRIVATE_KEY = '\''MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgB6bStmlXvU27nob\/9Xt+cFh\/FC\/s1DR8OdFFDHFdkeShRANCAAQ\/TpNQeovV5rfLc09aTbIGigHsWSE8uPSdGFcO7bbqJXhe+v58ZUI+BDKCU91sw5iB7LroFl5HO39EyYCxDpUJ'\'';/const ENCRYPTION_PRIVATE_KEY = '\''MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgB6bStmlXvU27nob\/9Xt+cFh\/FC\/s1DR8OdFFDHFdkeShRANCAAQ\/TpNQeovV5rfLc09aTbIGigHsWSE8uPSdGFcO7bbqJXhe+v58ZUI+BDKCU91sw5iB7LroFl5HO39EyYCxDpUJ'\'';/' "$BG_PATH"

# Update signing public key to use Bob's derived key
sed -i '' "s/const SIGNING_PUBLIC_KEY = '02a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';/const SIGNING_PUBLIC_KEY = '02b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';/" "$BG_PATH"

echo ""
echo "🔍 Verifying changes in background.js:"

# Show the active wallet configuration lines
echo "  $(grep '^const WALLET_ADDRESS' "$BG_PATH")"
echo "  $(grep '^const DUMMY_PRIVATE_KEY' "$BG_PATH")"  
echo "  $(grep '^const ENCRYPTION_PUBLIC_KEY' "$BG_PATH")"
echo "  $(grep '^const SIGNING_PUBLIC_KEY' "$BG_PATH")"

echo ""
echo "✅ Success! Second wallet created at: $(cd "$DEST_PATH" && pwd)"
echo ""
echo "📋 Next steps:"
echo "1. Create a new Chrome profile or use Safari/Edge"
echo "2. Load unpacked extension from: $(cd "$DEST_PATH" && pwd)"
echo "3. Open demo page in both browsers and test DIDComm messaging"
echo ""
echo "🆔 Wallet identities:"
echo "  Alice (wallet):     did:example:0x1111111111111111111111111111111111111111"
echo "  Bob (wallet-bob):   did:example:0x2222222222222222222222222222222222222222"
