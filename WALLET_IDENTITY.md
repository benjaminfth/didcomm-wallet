# Wallet Identity Configuration

This wallet extension supports configuring different identities for testing multi-wallet scenarios.

## Default Configuration (Wallet A - Alice)

By default, the wallet uses the following identity:
- **Address:** `0x1111111111111111111111111111111111111111`
- **DID:** `did:example:0x1111111111111111111111111111111111111111`
- **Private Key:** `a1a1a1a1...` (for demo purposes)

## Setting Up a Second Wallet (Wallet B - Bob)

To test DIDComm messaging between two wallets on the same computer:

### Option 1: Use Two Chrome Profiles

1. **Create a second Chrome profile:**
   - Chrome → Settings → "Add Person" or create a new profile
   - Or use a different browser (Edge, Brave, etc.)

2. **Make a copy of the wallet folder:**
   ```powershell
   cd D:\CODING\oc
   Copy-Item -Recurse wallet wallet-bob
   ```

3. **Edit the second wallet's identity:**
   - Open `D:\CODING\oc\wallet-bob\background\background.js`
   - Find the WALLET IDENTITY CONFIGURATION section (around line 8)
   - Comment out the ALICE configuration
   - Uncomment the BOB configuration:
   
   ```javascript
   // Wallet Profile: ALICE (default)
   // const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
   // const DUMMY_PRIVATE_KEY = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';

   // Wallet Profile: BOB (use this in second browser/profile)
   const WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';
   const DUMMY_PRIVATE_KEY = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';
   ```

4. **Load extensions:**
   - Chrome Profile 1: Load `D:\CODING\oc\wallet` (Alice)
   - Chrome Profile 2: Load `D:\CODING\oc\wallet-bob` (Bob)

### Option 2: Quick Test (Same Browser, Different Tabs)

For quick testing without creating a copy:

1. **In one tab:** Use the default configuration (Alice)
2. **Before opening second tab:** Edit `background.js` to use Bob's identity and reload extension
3. Open second tab

**Note:** This shares storage, so it's better to use Option 1 for proper testing.

## Adding More Wallet Identities

To create additional wallets (Carol, Dave, etc.):

1. Add new profile configurations in `background.js`:
   ```javascript
   // Wallet Profile: CAROL
   // const WALLET_ADDRESS = '0x3333333333333333333333333333333333333333';
   // const DUMMY_PRIVATE_KEY = 'c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3c3';
   ```

2. Make copies of the wallet folder (`wallet-carol`, etc.)
3. Uncomment the desired identity in each copy
4. Load in different browser profiles

## Testing DIDComm Messaging

After setting up two wallets with different identities:

1. **Start backend and Kafka** (see main README)

2. **Open demo page in both browsers:**
   - `http://127.0.0.1:5500/demo-didcomm.html`

3. **Alice sends to Bob:**
   - Recipient DID: `did:example:0x2222222222222222222222222222222222222222`
   - Message: "Hello Bob from Alice!"

4. **Bob receives the message** (only Bob sees it, not Alice)

5. **Bob replies to Alice:**
   - Recipient DID: `did:example:0x1111111111111111111111111111111111111111`
   - Message: "Hi Alice, got your message!"

6. **Alice receives Bob's reply** (only Alice sees it)

## Verifying Your Wallet Identity

To check which identity your wallet is using:

1. Open the extension popup
2. Check the displayed address
3. Or in browser console:
   ```javascript
   await window.ethereum.request({ method: 'eth_accounts' })
   ```

The returned address tells you which wallet profile is active.

## Production Note

⚠️ **These are demo addresses and keys for testing only!**

In production:
- Never hardcode private keys
- Use secure key generation and storage
- Implement proper key management (HD wallets, hardware wallets, etc.)
- Use real Ethereum addresses derived from actual private keys
