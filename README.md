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
- ✅ **🔐 End-to-End Encryption (E2EE)** - Messages encrypted with recipient's public key
- ✅ **Message Signature** - Messages signed with sender's private key
- ✅ **Message Verification** - Validate sender signatures
- ✅ **Inbox Management** - View received messages in extension popup
- ✅ **Unread Count Badge** - Visual notification for new messages
- ✅ **Message Filtering** - Only receive messages addressed to your DID
- ✅ **🔐 Backend Blind to Content** - Server cannot read message plaintext

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

2. **Docker & Docker Compose**
   - Download: [Docker Desktop](https://www.docker.com/products/docker-desktop)
   - Includes both Docker and Docker Compose

3. **.NET SDK**
   - Version: 6.0 or higher
   - Download: [.NET Downloads](https://dotnet.microsoft.com/download)

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

### 2. Start Apache Kafka with Docker

#### Start Kafka (KRaft Mode - No ZooKeeper Needed)
```powershell
docker-compose up -d
```

#### Verify Kafka is Running
```powershell
docker-compose ps
# Should show: kafka container in "running" state
```

#### Create Kafka Topic
```bash
docker exec wallet-kafka-1 /opt/kafka/bin/kafka-topics.sh --create \
  --topic didcomm-messages \
  --bootstrap-server localhost:9092 \
  --partitions 1 \
  --replication-factor 1
```

#### Verify Topic Creation
```bash
docker exec wallet-kafka-1 /opt/kafka/bin/kafka-topics.sh --list --bootstrap-server localhost:9092
# Should output: didcomm-messages
```

#### View Kafka Logs (Optional)
```bash
docker-compose logs -f kafka
```

#### Stop Kafka When Done
```bash
docker-compose down
```

**Benefits of Docker**:
- ✅ No Java installation required
- ✅ No ZooKeeper needed (KRaft mode)
- ✅ Single command to start/stop
- ✅ Isolated environment
- ✅ Easy cleanup with `docker-compose down`

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

🔐 **Encrypted Message** (sent to backend):

```json
{
  "id": "unique-message-id-12345",
  "type": "https://didcomm.org/basicmessage/2.0/message",
  "from": "did:example:0x1111111111111111111111111111111111111111",
  "to": "did:example:0x2222222222222222222222222222222222222222",
  "createdTime": "2025-12-16T10:30:00Z",
  "encryption": {
    "alg": "ECDH-ES+A256GCM",
    "ephemeralPublicKey": "MCowBQYDK2VuAyEA...",
    "iv": "3q2+7w==",
    "ciphertext": "a8sj3ls...",
    "tag": "ZGVhZGJlZWY="
  },
  "signature": {
    "alg": "ES256K",
    "value": "0xa1a1a1a1...hashvalue..."
  }
}
```

**Decrypted Body** (only visible to sender and receiver):

```json
{
  "text": "Hello Bob from Alice!"
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

🔐 **Note**: Signature is over the **encrypted** payload, ensuring:
- Backend cannot forge messages
- Tampering is detected
- Sender's identity is verified

---

## 🔒 Security Architecture

### 🔐 End-to-End Encryption (E2EE)

This wallet implements **hybrid encryption** for maximum security:

#### Encryption Flow (Sender)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Sender encrypts message with recipient's public key       │
│    - Generate ephemeral ECDH key pair                        │
│    - Derive shared secret (ECDH with recipient's public key) │
│    - Derive AES-256-GCM key from shared secret               │
│    - Encrypt message with AES-GCM                            │
│    - Result: { ephemeral_pub_key, iv, ciphertext, tag }     │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Sign encrypted message with sender's private key          │
│    - Hash entire message (including encryption data)         │
│    - Sign with secp256k1 (Ethereum standard)                 │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Send to backend → Kafka → SignalR                         │
│    ⚠️ Backend only sees encrypted payload                   │
└──────────────────────────────────────────────────────────────┘
```

#### Decryption Flow (Receiver)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Receive encrypted message via SignalR                     │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. Verify signature with sender's public key                 │
│    - Resolve sender's DID to get public key                  │
│    - Verify signature over entire message                    │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Decrypt message with receiver's private key               │
│    - Import sender's ephemeral public key                    │
│    - Derive shared secret (ECDH with our private key)        │
│    - Derive AES-256-GCM key from shared secret               │
│    - Decrypt ciphertext with AES-GCM                         │
│    - Result: plaintext message body                          │
└──────────────────────────────────────────────────────────────┘
```

#### Cryptographic Algorithms

| Purpose | Algorithm | Key Size | Notes |
|---------|-----------|----------|-------|
| **Key Exchange** | ECDH (P-256) | 256-bit | Derive shared secret |
| **Symmetric Encryption** | AES-GCM | 256-bit | Authenticated encryption |
| **Digital Signature** | ECDSA (secp256k1) | 256-bit | Ethereum-compatible, RFC 6979 |
| **Hash Function** | SHA-256 | 256-bit | For signing payload |
| **DID Method** | did:example | - | Simplified (use did:key in production) |

#### Security Properties

✅ **Confidentiality**: Only recipient can decrypt  
✅ **Authenticity**: Receiver verifies sender's identity  
✅ **Integrity**: Tampering detected via AEAD (GCM) and signature  
✅ **Forward Secrecy**: Ephemeral keys used for each message  
✅ **Backend Blind**: Server cannot read message content  

---

## 🔒 Security Considerations

### ⚠️ **THIS IS A DEMO PROJECT - NOT PRODUCTION READY**

#### Known Security Limitations

1. **Weak Private Key Storage**:
   - Private keys are hardcoded in `background.js`
   - No encryption or secure storage
   - **Production**: Use encrypted storage, hardware wallets, or key derivation

2. **Real ECDSA Signing**:
   - ✅ Uses ECDSA with secp256k1 (Ethereum-compatible)
   - ✅ Deterministic signing (RFC 6979)
   - ✅ Canonical message format for reproducible signatures
   - **Production**: Consider using `@noble/secp256k1` for full compatibility

3. **No DID Resolution**:
   - DIDs are simple `did:example:<address>` format
   - Public keys hardcoded in `PUBLIC_KEY_REGISTRY`
   - **Production**: Implement DID resolver (Universal Resolver, DID:Web, etc.)

4. **✅ E2EE Implemented**:
   - Messages encrypted end-to-end
   - Hybrid encryption (ECDH + AES-GCM)
   - Backend cannot read plaintext
   - **Note**: Demo uses Web Crypto API with P-256; production should use X25519

5. **No Message Encryption**:
   - Messages sent in plaintext
   - SignalR connection is encrypted (HTTPS), but messages are not
   - **Production**: Implement DIDComm v2 encryption (JWE)

6. **No Rate Limiting**:
   - Backend has no rate limiting or abuse prevention
   - **Production**: Implement rate limiting, authentication, quotas

7. **Self-Signed Certificate**:
   - Backend uses development HTTPS certificate
   - Browser trust required for local development
   - **Production**: Use proper TLS certificates (Let's Encrypt, etc.)

8. **No Authentication**:
   - Backend API endpoint is public
   - Anyone can send messages via HTTP POST
   - **Production**: Implement API authentication (JWT, OAuth, DID Auth)

9. **Local Storage Only**:
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
   - Use X25519 for key exchange (instead of P-256 ECDH)
   - Implement perfect forward secrecy with ephemeral keys

3. **DID Standards**:
   - Use standard DID methods (did:key, did:web, did:ethr)
   - Implement DID Document resolution
   - Store public keys in DID Documents
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
- [DIDComm v2 Encryption](https://identity.foundation/didcomm-messaging/spec/#encryption) - Official spec

### Cryptography
- [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) - Browser crypto standard
- [libsodium](https://libsodium.gitbook.io/) - Modern crypto library (X25519, Ed25519)
- [Signal Protocol](https://signal.org/docs/) - E2EE messaging protocol

---

**Built with ❤️ for the decentralized web**

*Last updated: December 16, 2025*
