# 🔐 DIDComm Wallet - Chrome Extension with Real-Time Messaging

A Chrome extension implementing a minimal Web3 wallet with **DIDComm (Decentralized Identity Communication)** messaging capabilities using SignalR and Apache Kafka.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [DIDComm Messaging](#didcomm-messaging)
- [API Reference](#api-reference)
- [Development](#development)
- [Testing Multi-Wallet Scenarios](#testing-multi-wallet-scenarios)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [License](#license)

---

## 🎯 Overview

This project demonstrates a **Chrome extension wallet** that combines:

1. **EIP-1193 Provider**: Ethereum-compatible provider interface injected into web pages
2. **Permission System**: User approval required for dApp connections
3. **Message Signing**: Sign messages with wallet's private key
4. **DIDComm Messaging**: Send and receive decentralized identity messages in real-time
5. **SignalR Integration**: Persistent WebSocket connections for real-time message delivery
6. **Apache Kafka**: Message broker for reliable, scalable message distribution
7. **ASP.NET Core Backend**: RESTful API and SignalR hub for message routing

The wallet uses **Decentralized Identifiers (DIDs)** in the format `did:example:<wallet-address>` for identity-based messaging.

---

## ✨ Features

### Web3 Wallet Features
- ✅ **EIP-1193 Provider** - Standard Ethereum provider interface (`window.ethereum`)
- ✅ **Account Management** - Single account with configurable address
- ✅ **Permission Gating** - User approval required for dApp connections
- ✅ **Message Signing** - Sign arbitrary messages (demo implementation)
- ✅ **Chain ID Support** - Network identification (default: Ethereum mainnet `0x1`)

### DIDComm Features
- ✅ **Send DIDComm Messages** - Send messages to other wallets by DID
- ✅ **Receive Messages Real-Time** - WebSocket-based instant message delivery
- ✅ **Message Signature** - Messages signed with sender's private key
- ✅ **Message Verification** - Validate sender signatures
- ✅ **Inbox Management** - View received messages in extension popup
- ✅ **Unread Count Badge** - Visual notification for new messages
- ✅ **Message Filtering** - Only receive messages addressed to your DID

### Backend Features
- ✅ **SignalR Hub** - Real-time WebSocket connections
- ✅ **DID Group Subscriptions** - Clients subscribe to their DID for targeted delivery
- ✅ **Kafka Integration** - Messages published to Kafka for durability and scalability
- ✅ **Kafka Consumer** - Processes messages and broadcasts via SignalR
- ✅ **REST API** - HTTP endpoint for sending DIDComm messages
- ✅ **CORS Support** - Configured for wallet extension and local development

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Page (dApp)                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  window.ethereum (EIP-1193 Provider)                        │ │
│  │  - eth_requestAccounts()                                    │ │
│  │  - eth_accounts, eth_chainId                                │ │
│  │  - personal_sign()                                          │ │
│  │  - didcomm_send(), didcomm_getMessages()                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────┬──────────────────────────────────────────────────────┘
            │ postMessage
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Chrome Extension (Service Worker)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Background Script (background.js)                          │ │
│  │  - Permission management                                    │ │
│  │  - Message signing                                          │ │
│  │  - DIDComm message handling                                 │ │
│  │  - SignalR initialization                                   │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Offscreen Document (signalr-client.js)                     │ │
│  │  - Persistent SignalR WebSocket connection                  │ │
│  │  - Subscribe to DID group (JoinDid)                         │ │
│  │  - Receive DidCommMessageReceived events                    │ │
│  │  - Forward messages to background script                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────┬──────────────────────────────────────────────────────┘
            │ SignalR WebSocket
            ▼
┌─────────────────────────────────────────────────────────────────┐
│          ASP.NET Core Backend (localhost:7001)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  SignalR Hub (/didcommhub)                                  │ │
│  │  - JoinDid(did) - Subscribe to DID group                    │ │
│  │  - DidCommMessageReceived event - Broadcast to group        │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  REST API (/api/SendDidCommMessage)                         │ │
│  │  - Receives DIDComm messages via HTTP POST                  │ │
│  │  - Publishes to Kafka topic                                 │ │
│  │  - Broadcasts via SignalR to recipient's DID group          │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Kafka Consumer Service                                     │ │
│  │  - Consumes from 'didcomm-messages' topic                   │ │
│  │  - Broadcasts messages via SignalR                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────┬──────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Apache Kafka (localhost:9092)                       │
│  Topic: didcomm-messages                                         │
│  - Message persistence                                           │
│  - Reliable delivery                                             │
│  - Scalability for multiple consumers                            │
└─────────────────────────────────────────────────────────────────┘
```

### Message Flow

1. **Sending a Message**:
   - dApp calls `window.ethereum.sendDidCommMessage(to, body)`
   - Extension signs the message with wallet's private key
   - Extension sends HTTP POST to `/api/SendDidCommMessage`
   - Backend publishes to Kafka and broadcasts via SignalR to recipient's DID group
   - Recipient's wallet (subscribed to their DID group) receives the message instantly

2. **Receiving a Message**:
   - Offscreen document maintains WebSocket connection to SignalR hub
   - On connection, invokes `JoinDid(walletDid)` to subscribe to DID group
   - Kafka consumer processes message and broadcasts via SignalR
   - SignalR sends `DidCommMessageReceived` event to clients in recipient's DID group
   - Offscreen document forwards to background script
   - Background script validates, stores, and updates badge count

---

## 🛠️ Technology Stack

### Frontend (Chrome Extension)
- **Manifest V3** - Chrome Extension architecture
- **JavaScript (Vanilla)** - No frameworks, pure JS
- **SignalR JavaScript Client** - WebSocket communication
- **Chrome Extension APIs**:
  - `chrome.runtime` - Messaging between extension components
  - `chrome.storage` - Persist approved origins
  - `chrome.offscreen` - Persistent WebSocket connections
  - `chrome.action` - Badge notifications

### Backend
- **ASP.NET Core 6.0** - Web API framework
- **SignalR** - Real-time WebSocket communication
- **Confluent.Kafka** - Apache Kafka .NET client
- **Newtonsoft.Json** - JSON serialization

### Infrastructure
- **Apache Kafka** - Message broker (requires ZooKeeper)
- **HTTPS/TLS** - Local development certificate (localhost:7001)

---

## 📁 Project Structure

```
wallet/
├── manifest.json                      # Chrome extension manifest (Manifest V3)
├── README.md                          # This file
├── WALLET_IDENTITY.md                 # Multi-wallet configuration guide
├── setup-second-wallet.ps1            # PowerShell script to create Bob wallet
├── wallet.sln                         # Visual Studio solution
│
├── background/
│   └── background.js                  # Service worker - main extension logic
│
├── content/
│   └── inject.js                      # Content script - bridges page ↔ extension
│
├── inpage/
│   └── inpage.js                      # Injected provider - window.ethereum
│
├── offscreen/
│   ├── signalr.html                   # Offscreen document HTML
│   ├── signalr-client.js              # SignalR WebSocket client
│   └── signalr.min.js                 # SignalR JavaScript library
│
├── popup/
│   ├── popup.html                     # Extension popup UI
│   └── popup.js                       # Popup logic - display messages
│
├── permission/
│   ├── permission.html                # Permission approval UI
│   └── permission.js                  # Permission handling
│
├── sign/
│   ├── sign.html                      # Message signing UI
│   └── sign.js                        # Signature handling
│
├── icons/                             # Extension icons (16, 32, 48, 128)
│
├── backend/                           # ASP.NET Core backend
│   ├── Program.cs                     # Main entry point, configuration
│   ├── appsettings.json               # Configuration (Kafka, logging)
│   ├── DidCommBackend.csproj          # Project file
│   │
│   ├── Controllers/
│   │   └── DidCommController.cs       # REST API - SendDidCommMessage
│   │
│   ├── Hubs/
│   │   └── DidCommHub.cs              # SignalR hub - JoinDid, message events
│   │
│   ├── Services/
│   │   ├── KafkaProducerService.cs    # Kafka message producer
│   │   └── KafkaConsumerService.cs    # Kafka message consumer (background service)
│   │
│   └── Models/
│       └── DidModels.cs               # DidCommMessage model
│
├── demo-didcomm.html                  # Demo page for DIDComm messaging
├── demo-sign.html                     # Demo page for message signing
├── test-didcomm-subscription.html     # Test SignalR subscription
└── test-signalr.html                  # Test SignalR connection
```

---

## 📦 Prerequisites

### Required Software

1. **Google Chrome** or Chromium-based browser (Edge, Brave, etc.)
   - Version: 88+ (Manifest V3 support)

2. **Java Development Kit (JDK)**
   - Version: 11 or higher
   - Required for: Apache Kafka and ZooKeeper
   - Download: [OpenJDK](https://openjdk.org/) or [Oracle JDK](https://www.oracle.com/java/technologies/downloads/)

3. **Apache Kafka**
   - Version: 2.8.0 or higher (includes ZooKeeper)
   - Download: [Kafka Downloads](https://kafka.apache.org/downloads)
   - Extract to: `C:\kafka` (or update paths in instructions)

4. **.NET SDK**
   - Version: 6.0 or higher
   - Download: [.NET Downloads](https://dotnet.microsoft.com/download)

5. **PowerShell** (Windows)
   - Pre-installed on Windows 10/11
   - Alternative: PowerShell Core for cross-platform

### Optional Tools

- **Visual Studio 2022** or **VS Code** - For backend development
- **Live Server** (VS Code extension) - For demo HTML pages
- **Postman** or **curl** - For API testing

---

## 🚀 Installation

### 1. Clone/Download the Project

```powershell
cd D:\CODING\oc
git clone <repository-url> wallet
cd wallet
```

### 2. Install Apache Kafka

#### Download and Extract
```powershell
# Download Kafka from https://kafka.apache.org/downloads
# Extract to C:\kafka

# Verify installation
cd C:\kafka
dir
# Should see: bin/, config/, libs/, etc.
```

#### Start ZooKeeper (Terminal 1)
```powershell
cd C:\kafka
.\bin\windows\zookeeper-server-start.bat .\config\zookeeper.properties
```

#### Start Kafka (Terminal 2)
```powershell
cd C:\kafka
.\bin\windows\kafka-server-start.bat .\config\server.properties
```

#### Create Kafka Topic (Terminal 3)
```powershell
cd C:\kafka
.\bin\windows\kafka-topics.bat --create --topic didcomm-messages --bootstrap-server localhost:9092 --partitions 1 --replication-factor 1
```

Verify topic creation:
```powershell
.\bin\windows\kafka-topics.bat --list --bootstrap-server localhost:9092
# Should output: didcomm-messages
```

### 3. Setup Backend (.NET Core)

#### Restore Dependencies
```powershell
cd D:\CODING\oc\wallet\backend
dotnet restore
```

#### Build the Project
```powershell
dotnet build
```

#### Generate Self-Signed Certificate (First Time Only)
```powershell
dotnet dev-certs https --trust
```
- Click "Yes" when prompted to trust the certificate

#### Run the Backend
```powershell
dotnet run
```

Expected output:
```
==============================================
Backend is now listening on: https://localhost:7001
SignalR Hub: https://localhost:7001/didcommhub
API Endpoint: POST https://localhost:7001/api/SendDidCommMessage
==============================================
```

### 4. Load Chrome Extension

#### Enable Developer Mode
1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** (top right)

#### Load Unpacked Extension
1. Click **Load unpacked**
2. Navigate to `D:\CODING\oc\wallet`
3. Select the folder and click **Select Folder**

#### Verify Installation
- Extension should appear with icon in toolbar
- Click the extension icon to see popup
- Check: Address should be `0x1111...1111` (Alice)

### 5. Open Demo Pages

#### Using Live Server (Recommended)
1. Install "Live Server" extension in VS Code
2. Right-click `demo-didcomm.html`
3. Select "Open with Live Server"
4. Browser opens at `http://127.0.0.1:5500/demo-didcomm.html`

#### Or Use File Protocol
- Open `file:///D:/CODING/oc/wallet/demo-didcomm.html`
- Note: Some browsers restrict `file://` protocol features

---

## ⚙️ Configuration

### Wallet Identity

Each wallet instance has a unique identity defined in [`background/background.js`](background/background.js):

```javascript
// Wallet Profile: ALICE (default)
const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
const DUMMY_PRIVATE_KEY = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';

// DID is derived from address
const WALLET_DID = 'did:example:' + WALLET_ADDRESS;
// Result: did:example:0x1111111111111111111111111111111111111111
```

### Backend Configuration

Edit [`backend/appsettings.json`](backend/appsettings.json):

```json
{
  "Kafka": {
    "BootstrapServers": "localhost:9092",
    "DidCommTopic": "didcomm-messages"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore.SignalR": "Debug"
    }
  }
}
```

### SignalR Connection URL

Edit [`offscreen/signalr-client.js`](offscreen/signalr-client.js):

```javascript
const SIGNALR_HUB_URL = 'https://localhost:7001/didcommhub';
```

---

## 💡 Usage

### Connecting a dApp

1. Open a demo page (e.g., `demo-didcomm.html`)
2. Click **"Connect Wallet"**
3. Extension opens permission popup
4. Review the requesting origin
5. Click **"Approve"** or **"Reject"**
6. If approved, page displays wallet address

### Signing a Message

```javascript
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: ['Hello World', '0x1111111111111111111111111111111111111111']
});
console.log('Signature:', signature);
```

### Sending a DIDComm Message

```javascript
// Get wallet's DID
const accounts = await window.ethereum.request({ method: 'eth_accounts' });
const myDid = 'did:example:' + accounts[0];

// Send message to another wallet
const result = await window.ethereum.sendDidCommMessage(
  'did:example:0x2222222222222222222222222222222222222222', // Bob's DID
  { text: 'Hello Bob from Alice!' }
);

console.log('Message sent:', result);
```

### Receiving Messages

Messages are received automatically via SignalR. View them in:

1. **Extension Popup**:
   - Click extension icon
   - Scroll to "DIDComm Messages" section
   - See last 5 received messages
   - Click a message to mark as read

2. **Programmatically**:
```javascript
const messages = await window.ethereum.getDidCommMessages();
console.log('Received messages:', messages);
```

---

## 📨 DIDComm Messaging

### Message Format

```json
{
  "id": "unique-message-id-12345",
  "type": "https://didcomm.org/basicmessage/2.0/message",
  "from": "did:example:0x1111111111111111111111111111111111111111",
  "to": "did:example:0x2222222222222222222222222222222222222222",
  "created_time": "2025-12-16T10:30:00Z",
  "body": {
    "text": "Hello Bob from Alice!"
  },
  "signature": "0xa1a1a1a1...hashvalue..."
}
```

### Signature Verification

Messages are signed using the sender's private key:

```javascript
// Sender (Alice) signs the message
const signature = await signMessage(messageBody, DUMMY_PRIVATE_KEY);

// Recipient (Bob) verifies the signature
const isValid = verifyDidCommSignature(didcommMessage);
```

**Note**: This is a simplified demo implementation. In production:
- Use proper secp256k1 signing (e.g., `ethers.js`)
- Resolve sender's DID to retrieve public key from DID document
- Use DIDComm v2 specification for encryption and advanced features

### DID Resolution (Future Enhancement)

Currently, DIDs are simple: `did:example:<address>`

In production, implement DID resolution:
1. Parse DID to extract method and identifier
2. Query DID resolver (e.g., Universal Resolver)
3. Retrieve DID Document containing public keys
4. Verify signatures using resolved public keys

---

## 🔌 API Reference

### Chrome Extension Provider (`window.ethereum`)

#### Standard EIP-1193 Methods

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `eth_requestAccounts` | `[]` | `string[]` | Request wallet connection (triggers permission popup) |
| `eth_accounts` | `[]` | `string[]` | Get connected accounts |
| `eth_chainId` | `[]` | `string` | Get current chain ID (e.g., `"0x1"`) |
| `personal_sign` | `[message, address]` | `string` | Sign a message with wallet's private key |

#### Custom DIDComm Methods

| Method | Params | Returns | Description |
|--------|--------|---------|-------------|
| `didcomm_send` | `[to, body]` | `{ success, messageId }` | Send DIDComm message to recipient DID |
| `didcomm_getMessages` | `[]` | `{ messages: [...] }` | Get all received messages |
| `didcomm_markAsRead` | `[messageId]` | `{ success }` | Mark a message as read |
| `mywallet_getApprovedOrigins` | `[]` | `{ origins: [...] }` | Get list of approved origins |

#### Provider Properties

```javascript
window.ethereum.isMyWallet      // true
window.ethereum.isMetaMask      // false
window.ethereum.chainId         // "0x1"
window.ethereum.selectedAddress // "0x1111111111111111111111111111111111111111" or null
```

#### Events

```javascript
// Account changed
window.ethereum.on('accountsChanged', (accounts) => {
  console.log('New account:', accounts[0]);
});

// Chain changed
window.ethereum.on('chainChanged', (chainId) => {
  console.log('New chain:', chainId);
});
```

### Backend REST API

#### Send DIDComm Message

**Endpoint**: `POST https://localhost:7001/api/SendDidCommMessage`

**Headers**:
```
Content-Type: application/json
```

**Request Body**:
```json
{
  "id": "msg-12345",
  "type": "https://didcomm.org/basicmessage/2.0/message",
  "from": "did:example:0x1111111111111111111111111111111111111111",
  "to": "did:example:0x2222222222222222222222222222222222222222",
  "created_time": "2025-12-16T10:30:00Z",
  "body": {
    "text": "Hello Bob!"
  },
  "signature": "0xa1a1a1a1..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "messageId": "msg-12345"
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "From and To fields are required"
}
```

#### Get Messages (Placeholder)

**Endpoint**: `GET https://localhost:7001/api/Messages?forDid=did:example:0x1111...`

**Response**:
```json
{
  "messages": []
}
```

Note: Currently returns empty array. In production, query from database.

### SignalR Hub (`/didcommhub`)

#### Connect to Hub

```javascript
const connection = new signalR.HubConnectionBuilder()
  .withUrl('https://localhost:7001/didcommhub')
  .withAutomaticReconnect()
  .build();

await connection.start();
```

#### Methods (Client → Server)

| Method | Parameters | Description |
|--------|-----------|-------------|
| `JoinDid` | `string did` | Subscribe to DID-specific group for targeted message delivery |
| `LeaveDid` | `string did` | Unsubscribe from DID group |

#### Events (Server → Client)

| Event | Payload | Description |
|-------|---------|-------------|
| `DidCommMessageReceived` | `DidCommMessage` | Broadcast when a message is received for the subscribed DID |

#### Example Usage

```javascript
// Subscribe to your DID
await connection.invoke('JoinDid', 'did:example:0x1111111111111111111111111111111111111111');

// Listen for incoming messages
connection.on('DidCommMessageReceived', (message) => {
  console.log('New message:', message);
});
```

---

## 🧪 Testing Multi-Wallet Scenarios

To test DIDComm messaging between two wallets, you need two separate wallet instances with different identities.

### Quick Setup with PowerShell Script

```powershell
cd D:\CODING\oc\wallet
.\setup-second-wallet.ps1
```

This script:
1. Creates a copy at `D:\CODING\oc\wallet-bob`
2. Automatically configures Bob's identity
3. Provides next steps

### Manual Setup

See detailed instructions in [`WALLET_IDENTITY.md`](WALLET_IDENTITY.md).

### Testing Flow

1. **Start Infrastructure**:
   - ZooKeeper (Terminal 1)
   - Kafka (Terminal 2)
   - Backend (Terminal 3)

2. **Load Extensions**:
   - Chrome Profile 1: Load `wallet` (Alice)
   - Chrome Profile 2 or Edge: Load `wallet-bob` (Bob)

3. **Open Demo Pages**:
   - Both browsers: Navigate to `http://127.0.0.1:5500/demo-didcomm.html`
   - Click "Connect Wallet" in both

4. **Alice Sends to Bob**:
   - Alice's browser:
     - Recipient DID: `did:example:0x2222222222222222222222222222222222222222`
     - Message: "Hello Bob from Alice!"
     - Click "Send Message"

5. **Bob Receives**:
   - Bob's browser: Message appears instantly
   - Bob's extension popup: Shows unread badge

6. **Bob Replies**:
   - Bob's browser:
     - Recipient DID: `did:example:0x1111111111111111111111111111111111111111`
     - Message: "Hi Alice, got your message!"
     - Click "Send Message"

7. **Alice Receives**:
   - Alice's browser: Reply appears
   - Alice's extension: Badge updated

### Verification Checklist

- [ ] Both wallets connect to backend successfully
- [ ] SignalR connections established (check browser console)
- [ ] Both wallets subscribe to their DIDs (check backend logs)
- [ ] Messages sent appear in sender's "Sent Messages" section
- [ ] Messages received appear only in recipient's "Received Messages"
- [ ] Badge count updates for unread messages
- [ ] Messages visible in extension popup
- [ ] Backend logs show Kafka produce/consume operations

---

## 🐛 Troubleshooting

### Extension Issues

#### "Extension context invalidated" Error
**Problem**: Extension was reloaded/updated while page was open

**Solution**:
1. Reload the web page (`Ctrl+R` or `F5`)
2. Reconnect the wallet if necessary

#### Permission Popup Not Appearing
**Problem**: Popup blocker or extension error

**Solution**:
1. Check browser console for errors
2. Allow popups for `chrome-extension://`
3. Reload extension and try again

#### Messages Not Received
**Problem**: SignalR connection or subscription issue

**Solution**:
1. Open browser console (F12)
2. Look for `[SignalR Offscreen]` logs
3. Check if `✅ Successfully joined DID group` message appears
4. Verify backend is running on `https://localhost:7001`
5. Reload extension to restart SignalR connection

### Backend Issues

#### "Address already in use: bind" Error (Port 7001)
**Problem**: Another process is using port 7001

**Solution**:
```powershell
# Find process using port 7001
netstat -ano | findstr :7001

# Kill the process (replace <PID> with actual process ID)
taskkill /PID <PID> /F
```

#### SignalR Connection Errors
**Problem**: HTTPS certificate issues

**Solution**:
```powershell
# Regenerate dev certificate
dotnet dev-certs https --clean
dotnet dev-certs https --trust
```

#### "Could not load file or assembly 'Confluent.Kafka'"
**Problem**: NuGet packages not restored

**Solution**:
```powershell
cd backend
dotnet restore
dotnet build
```

### Kafka Issues

#### Kafka Not Starting
**Problem**: ZooKeeper not running or port conflict

**Solution**:
1. Ensure ZooKeeper is running first
2. Wait 10-15 seconds after ZooKeeper starts
3. Check `logs/` folder in Kafka directory for errors
4. Verify ports 2181 (ZooKeeper) and 9092 (Kafka) are free

#### "Topic does not exist" Error
**Problem**: Topic `didcomm-messages` not created

**Solution**:
```powershell
cd C:\kafka
.\bin\windows\kafka-topics.bat --create --topic didcomm-messages --bootstrap-server localhost:9092
```

#### Messages Not Consumed
**Problem**: Consumer group offset or connection issue

**Solution**:
```powershell
# Reset consumer group offsets
.\bin\windows\kafka-consumer-groups.bat --bootstrap-server localhost:9092 --group didcomm-consumer --reset-offsets --to-earliest --topic didcomm-messages --execute
```

### Demo Page Issues

#### CORS Errors
**Problem**: Backend not configured for origin

**Solution**:
Edit [`backend/Program.cs`](backend/Program.cs), add your origin:
```csharp
policy.WithOrigins(
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://localhost:3000"  // Add your origin here
)
```

#### "window.ethereum is undefined"
**Problem**: Extension not loaded or page loaded before extension

**Solution**:
1. Verify extension is loaded (`chrome://extensions/`)
2. Reload the page (`Ctrl+R`)
3. Check browser console for injection errors

---

## 🔒 Security Considerations

### ⚠️ **THIS IS A DEMO PROJECT - NOT PRODUCTION READY**

#### Known Security Limitations

1. **Weak Private Key Storage**:
   - Private keys are hardcoded in `background.js`
   - No encryption or secure storage
   - **Production**: Use encrypted storage, hardware wallets, or key derivation

2. **Simplified Signature Scheme**:
   - Uses dummy signature (SHA-256 hash + private key)
   - Not actual secp256k1 ECDSA signing
   - **Production**: Use `ethers.js` or `web3.js` for proper signing

3. **No DID Resolution**:
   - DIDs are simple `did:example:<address>` format
   - No DID Document lookup for public keys
   - **Production**: Implement DID resolver (Universal Resolver, DID:Web, etc.)

4. **No Message Encryption**:
   - Messages sent in plaintext
   - SignalR connection is encrypted (HTTPS), but messages are not
   - **Production**: Implement DIDComm v2 encryption (JWE)

5. **No Rate Limiting**:
   - Backend has no rate limiting or abuse prevention
   - **Production**: Implement rate limiting, authentication, quotas

6. **Self-Signed Certificate**:
   - Backend uses development HTTPS certificate
   - Browser trust required for local development
   - **Production**: Use proper TLS certificates (Let's Encrypt, etc.)

7. **No Authentication**:
   - Backend API endpoint is public
   - Anyone can send messages via HTTP POST
   - **Production**: Implement API authentication (JWT, OAuth, DID Auth)

8. **Local Storage Only**:
   - Messages stored in browser memory (lost on restart)
   - No persistent database
   - **Production**: Use database (PostgreSQL, MongoDB, etc.)

#### Best Practices for Production

1. **Key Management**:
   - Never store private keys in plaintext
   - Use encrypted key stores (e.g., Web3 wallets, hardware security modules)
   - Implement key rotation and revocation

2. **Cryptography**:
   - Use established libraries (`ethers.js`, `noble-secp256k1`)
   - Follow DIDComm v2 specification for encryption and signing
   - Implement perfect forward secrecy

3. **DID Standards**:
   - Use standard DID methods (did:key, did:web, did:ethr)
   - Implement DID Document resolution
   - Support multiple public keys and authentication methods

4. **Infrastructure**:
   - Deploy backend with proper TLS
   - Use authentication and authorization
   - Implement HTTPS everywhere
   - Rate limiting and DDoS protection

5. **Testing**:
   - Unit tests for all components
   - Integration tests for message flow
   - Security audits and penetration testing
   - Formal verification for cryptographic operations

---

## 🛠️ Development

### Running in Development Mode

```powershell
# Terminal 1: ZooKeeper
cd C:\kafka
.\bin\windows\zookeeper-server-start.bat .\config\zookeeper.properties

# Terminal 2: Kafka
cd C:\kafka
.\bin\windows\kafka-server-start.bat .\config\server.properties

# Terminal 3: Backend
cd D:\CODING\oc\wallet\backend
dotnet watch run  # Hot reload on file changes
```

### Debugging

#### Extension Debugging
1. Open `chrome://extensions/`
2. Find "My Simple Wallet"
3. Click "Errors" to see console logs
4. Click "Inspect views: service worker" for background script debugger

#### Backend Debugging (Visual Studio)
1. Open `wallet.sln` in Visual Studio 2022
2. Set breakpoints in `DidCommController.cs` or `DidCommHub.cs`
3. Press F5 to start debugging

#### SignalR Connection Debugging
- Open browser console (F12)
- Look for `[SignalR Offscreen]` prefixed logs
- Check connection state, group subscriptions, received messages

### Building for Distribution

```powershell
# Create production build
cd backend
dotnet publish -c Release -o publish

# Package extension (create ZIP)
cd D:\CODING\oc\wallet
# Exclude backend folder
Compress-Archive -Path manifest.json,background,content,inpage,offscreen,popup,permission,sign,icons,*.html -DestinationPath wallet-extension.zip
```

---

## 📚 Additional Resources

### Documentation
- [DIDComm Messaging Specification](https://identity.foundation/didcomm-messaging/spec/)
- [W3C Decentralized Identifiers (DIDs)](https://www.w3.org/TR/did-core/)
- [EIP-1193: Ethereum Provider JavaScript API](https://eips.ethereum.org/EIPS/eip-1193)
- [Chrome Extension Manifest V3](https://developer.chrome.com/docs/extensions/mv3/)
- [ASP.NET Core SignalR](https://docs.microsoft.com/en-us/aspnet/core/signalr/)
- [Apache Kafka Documentation](https://kafka.apache.org/documentation/)

### Related Projects
- [ethers.js](https://github.com/ethers-io/ethers.js/) - Ethereum library for signing
- [Universal Resolver](https://github.com/decentralized-identity/universal-resolver) - DID resolution
- [DIDComm v2 Libraries](https://github.com/sicpa-dlab/didcomm-rust) - Production DIDComm implementations

---

## 📄 License

This is a demonstration project for educational purposes. Use at your own risk.

**Not recommended for production use without significant security enhancements.**

---

## 🤝 Contributing

This is a demo project, but improvements are welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/improvement`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/improvement`)
5. Create a Pull Request

### Suggested Improvements

- [ ] Implement proper secp256k1 signing with `ethers.js`
- [ ] Add DIDComm v2 encryption (JWE)
- [ ] Implement DID resolution (Universal Resolver integration)
- [ ] Add database persistence (PostgreSQL, MongoDB)
- [ ] Implement JWT-based API authentication
- [ ] Add rate limiting and abuse prevention
- [ ] Create automated tests (unit, integration, E2E)
- [ ] Support multiple accounts per wallet
- [ ] Implement transaction signing and broadcasting
- [ ] Add support for ERC-20 tokens and NFTs

---

## 📞 Support

For questions or issues:

1. Check the [Troubleshooting](#troubleshooting) section
2. Review browser console and backend logs
3. Check Kafka logs in `C:\kafka\logs`
4. Verify all prerequisites are installed correctly

---

## 🎓 Learning Resources

### Decentralized Identity
- [DID Primer](https://github.com/WebOfTrustInfo/rwot7-toronto/blob/master/topics-and-advance-readings/did-primer.md) - Introduction to DIDs
- [Self-Sovereign Identity](https://www.manning.com/books/self-sovereign-identity) - Book on SSI principles

### Web3 Development
- [Ethereum.org Developers](https://ethereum.org/en/developers/) - Ethereum development guides
- [Web3 Provider Pattern](https://eips.ethereum.org/EIPS/eip-1193) - Understanding provider pattern

### Real-Time Communication
- [SignalR Tutorial](https://docs.microsoft.com/en-us/aspnet/core/tutorials/signalr) - Building real-time apps
- [WebSocket vs SignalR](https://blog.logrocket.com/websocket-vs-signalr/) - Understanding differences

### Message Brokers
- [Kafka Use Cases](https://kafka.apache.org/uses) - Real-world applications
- [Event-Driven Architecture](https://martinfowler.com/articles/201701-event-driven.html) - Design patterns

---

**Built with ❤️ for the decentralized web**

*Last updated: December 16, 2025*
