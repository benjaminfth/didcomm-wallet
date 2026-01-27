// Import signing module
import { 
  canonicalize, 
  createSigningPayload, 
  ecdsaSign, 
  ecdsaVerify, 
  derivePublicKey 
} from './signing.js';

// Import DIDComm message builder
import {
  DIDCOMM_TYPES,
  buildDidCommMessage,
  buildAckMessage,
  buildBasicMessage,
  buildApprovalRequest,
  buildApprovalResponse,
  validateDidCommMessage,
  isAckMessage,
  isApprovalRequest,
  isApprovalResponse,
  getPrimaryRecipient,
} from './didcomm-message.js';

// Maintain approved origins and pending requests
const approvedOrigins = new Set();
const pending = new Map(); // id -> { origin, sendResponse }
const pendingSignatures = new Map(); // id -> { message, origin, sendResponse }
let nextId = 1;

// ============================================================================
// WALLET IDENTITY CONFIGURATION
// ============================================================================
// Wallet Profile: ALICE (default)
const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
const DUMMY_PRIVATE_KEY = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';

// 🔐 secp256k1 SIGNING KEY PAIR (for message authentication)
// These are derived from DUMMY_PRIVATE_KEY for demo purposes
// In production: use proper key derivation or separate signing keys
const SIGNING_PRIVATE_KEY = DUMMY_PRIVATE_KEY; // 32 bytes hex
const SIGNING_PUBLIC_KEY = '02a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1'; // Compressed pubkey placeholder

// 🔐 ENCRYPTION KEY PAIR (P-256 ECDH for Web Crypto API)
// Alice's P-256 key pair
const ENCRYPTION_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3MJ6wzmCO7MIC7X1ARmiwXFFgNpkMeRzMOtbvoi7FewOggZMj0kACobXLx+22Pycd7/tGz91Y6FqXyt+WHy7xA==';
const ENCRYPTION_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgGzkRAogLNTD6ahm+DqODy054lm41lP8N8+CmTJ/mcUyhRANCAATcwnrDOYI7swgLtfUBGaLBcUWA2mQx5HMw61u+iLsV7A6CBkyPSQAKhtcvH7bY/Jx3v+0bP3VjoWpfK35YfLvE';

// Wallet Profile: BOB (use this in second browser/profile)
// const WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';
// const DUMMY_PRIVATE_KEY = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';
// const ENCRYPTION_PUBLIC_KEY = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP06TUHqL1ea3y3NPWk2yBooB7FkhPLj0nRhXDu226iV4Xvr+fGVCPgQyglPdbMOYgey66BZeRzt/RMmAsQ6VCQ==';
// const ENCRYPTION_PRIVATE_KEY = 'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgB6bStmlXvU27nob/9Xt+cFh/FC/s1DR8OdFFDHFdkeShRANCAAQ/TpNQeovV5rfLc09aTbIGigHsWSE8uPSdGFcO7bbqJXhe+v58ZUI+BDKCU91sw5iB7LroFl5HO39EyYCxDpUJ';

// Derive DID from wallet address
const WALLET_DID = 'did:example:' + WALLET_ADDRESS;

// 🔐 Store public keys for DID resolution (simplified - in production use DID Document)
const PUBLIC_KEY_REGISTRY = {
  'did:example:0x1111111111111111111111111111111111111111': 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE3MJ6wzmCO7MIC7X1ARmiwXFFgNpkMeRzMOtbvoi7FewOggZMj0kACobXLx+22Pycd7/tGz91Y6FqXyt+WHy7xA==',
  'did:example:0x2222222222222222222222222222222222222222': 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEP06TUHqL1ea3y3NPWk2yBooB7FkhPLj0nRhXDu226iV4Xvr+fGVCPgQyglPdbMOYgey66BZeRzt/RMmAsQ6VCQ=='
};

// 🔐 Store SIGNING public keys for signature verification (secp256k1)
const SIGNING_KEY_REGISTRY = {
  'did:example:0x1111111111111111111111111111111111111111': '02a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1',
  'did:example:0x2222222222222222222222222222222222222222': '02b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2'
};

console.log('[Wallet] Identity initialized:', WALLET_DID);
console.log('[Wallet] 🔐 Encryption enabled (P-256 ECDH)');
// ============================================================================

// Load persisted approvals
chrome.storage.local.get(['approvedOrigins'], (res) => {
  const list = res.approvedOrigins || [];
  list.forEach(o => approvedOrigins.add(o));
});

function persistApprovals(){
  chrome.storage.local.set({ approvedOrigins: Array.from(approvedOrigins) });
}

function openPermissionWindow(id, origin){
  const url = chrome.runtime.getURL(`permission/permission.html?id=${id}&origin=${encodeURIComponent(origin)}`);
  chrome.windows.create({ url, type: 'popup', width: 380, height: 480 });
}

function openSignWindow(id, message, origin){
  const url = chrome.runtime.getURL(`sign/sign.html?id=${id}&message=${encodeURIComponent(message)}&origin=${encodeURIComponent(origin)}`);
  chrome.windows.create({ url, type: 'popup', width: 420, height: 520 });
}

// ============================================================================
// 🔐 REAL ECDSA SIGNING (replaces dummy signing)
// ============================================================================
// ACK message type (DIDComm v2 style)
const ACK_MESSAGE_TYPE = 'https://didcomm.org/notification/ack/2.0';

/**
 * Sign a DIDComm message using ECDSA secp256k1
 * Signs the canonical form of the encrypted message
 */
async function signDidCommMessage(messageWithoutSig) {
  // Create deterministic signing payload
  const signingPayload = createSigningPayload(messageWithoutSig);
  const canonicalMessage = canonicalize(signingPayload);
  
  console.log('[Signing] Canonical payload length:', canonicalMessage.length);
  
  // Sign using ECDSA secp256k1
  const signature = await ecdsaSign(canonicalMessage, SIGNING_PRIVATE_KEY);
  
  return {
    alg: 'ES256K', // ECDSA with secp256k1 and SHA-256
    value: `${signature.r}${signature.s}`, // Compact format: r || s
    r: signature.r,
    s: signature.s
  };
}

/**
 * Verify DIDComm message signature
 */
async function verifyDidCommMessageSignature(didcommMessage) {
  try {
    // Check signature exists
    if (!didcommMessage.signature || !didcommMessage.signature.value) {
      console.warn('[Verify] No signature found');
      return false;
    }
    
    // Get sender's signing public key
    const senderPublicKey = SIGNING_KEY_REGISTRY[didcommMessage.from];
    if (!senderPublicKey) {
      console.warn('[Verify] Unknown sender DID:', didcommMessage.from);
      return false;
    }
    
    // Reconstruct signing payload (without signature field)
    const signingPayload = createSigningPayload(didcommMessage);
    const canonicalMessage = canonicalize(signingPayload);
    
    // Parse signature
    const sigValue = didcommMessage.signature.value;
    let signature;
    
    if (didcommMessage.signature.r && didcommMessage.signature.s) {
      // Structured format
      signature = {
        r: didcommMessage.signature.r,
        s: didcommMessage.signature.s
      };
    } else if (sigValue.length === 128) {
      // Compact format: r (64 hex chars) || s (64 hex chars)
      signature = {
        r: sigValue.slice(0, 64),
        s: sigValue.slice(64, 128)
      };
    } else {
      console.warn('[Verify] Invalid signature format');
      return false;
    }
    
    // Verify signature
    const isValid = await ecdsaVerify(canonicalMessage, signature, senderPublicKey);
    console.log('[Verify] Signature valid:', isValid);
    return isValid;
  } catch (error) {
    console.error('[Verify] Signature verification failed:', error);
    return false;
  }
}

// Legacy signMessage function (keep for personal_sign compatibility)
async function signMessage(message, privateKeyHex){
  // Convert message to bytes
  const msgBytes = new TextEncoder().encode(message);
  // Hash the message with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Dummy signature: concatenate privateKey + hash (NOT secure, for demo only)
  const signature = '0x' + privateKeyHex.slice(0, 64) + hashHex.slice(0, 64);
  return signature;
}

// DIDComm configuration
const DIDCOMM_BACKEND_URL = 'https://localhost:7001';
const SIGNALR_HUB_URL = `${DIDCOMM_BACKEND_URL}/didcommhub`;

// DIDComm message storage and SignalR connection
let signalRConnection = null;
let receivedMessages = [];
let offscreenDocumentCreated = false;

// Initialize SignalR connection for receiving DIDComm messages
async function initializeSignalR() {
  if (offscreenDocumentCreated) {
    console.log('[SignalR] Already initialized');
    return;
  }
  
  try {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL('offscreen/signalr.html')]
    });

    if (existingContexts.length > 0) {
      console.log('[SignalR] Offscreen document already exists');
      offscreenDocumentCreated = true;
      return;
    }

    // Create offscreen document for SignalR
    const offscreenUrl = chrome.runtime.getURL('offscreen/signalr.html');
    await chrome.offscreen.createDocument({
      url: offscreenUrl,
      reasons: ['DOM_SCRAPING'],
      justification: 'SignalR connection for DIDComm messaging'
    });
    
    offscreenDocumentCreated = true;
    console.log('[SignalR] Offscreen document created successfully');
    
    // Send wallet DID to offscreen document
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'INIT_SIGNALR',
        walletDid: WALLET_DID
      }).catch(err => console.warn('[SignalR] Could not send init message:', err));
    }, 1000);
    
  } catch (error) {
    console.error('[SignalR] Failed to initialize:', error);
    offscreenDocumentCreated = false;
  }
}

// ============================================================================
// 🔐 ENCRYPTION UTILITIES (E2EE with Web Crypto API)
// ============================================================================

/**
 * Normalize a base64 / base64url string so `atob` can decode it.
 */
function normalizeBase64(input) {
  if (typeof input !== 'string') {
    throw new Error('Expected base64 string but got ' + typeof input);
  }
  let s = input.replace(/[\r\n\s]/g, '');
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad === 1) {
    throw new Error('Invalid base64 length for value: ' + s);
  } else if (pad === 2) {
    s += '==';
  } else if (pad === 3) {
    s += '=';
  }
  return s;
}

/**
 * Convert base64 string to ArrayBuffer {
 */
function base64ToArrayBuffer(base64) {
  try {
    const normalized = normalizeBase64(base64);
    const binaryString = atob(normalized);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error('[Base64] Failed to decode value:', base64, e);
    throw e;
  }
}

/**
 * Convert ArrayBuffer to base64 string const bytes = new Uint8Array(buffer);
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Resolve recipient's public key from DID
 */
function resolvePublicKey(did) {
  const publicKeyBase64 = PUBLIC_KEY_REGISTRY[did];
  if (!publicKeyBase64) {
    throw new Error(`Public key not found for DID: ${did}`);
  }
  return publicKeyBase64;
}

/**
 * Encrypt message using hybrid encryption (ECDH + AES-GCM)
 * Flow:
 * 1. Generate ephemeral ECDH key pair
 * 2. Derive shared secret with recipient's public key (ECDH)
 * 3. Derive AES key from shared secret (HKDF)
 * 4. Encrypt message with AES-GCM
 * 5. Return: ephemeral public key, IV, ciphertext, auth tag
 */
async function encryptMessage(plaintext, recipientDid) {
  try {
    // 1. Generate ephemeral ECDH key pair
    const ephemeralKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    );

    const recipientPublicKeyBase64 = resolvePublicKey(recipientDid);
    const recipientPublicKeyBuffer = base64ToArrayBuffer(recipientPublicKeyBase64);
    
    let recipientPublicKey;
    try {
      recipientPublicKey = await crypto.subtle.importKey(
        'spki',
        recipientPublicKeyBuffer,
        { name: 'ECDH', namedCurve: 'P-256' },
        false,
        []
      );
    } catch (importError) {
      console.error('[Encryption] Failed to import recipient public key:', importError);
      throw new Error(`Invalid public key for ${recipientDid}: ${importError.message}`);
    }

    const sharedSecret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: recipientPublicKey },
      ephemeralKeyPair.privateKey,
      256
    );

    const aesKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encoder = new TextEncoder();
    const plaintextBuffer = encoder.encode(JSON.stringify(plaintext));
    const ciphertextBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv, tagLength: 128 },
      aesKey,
      plaintextBuffer
    );

    const ephemeralPublicKeyBuffer = await crypto.subtle.exportKey('spki', ephemeralKeyPair.publicKey);

    const ciphertext = ciphertextBuffer.slice(0, -16);
    const tag = ciphertextBuffer.slice(-16);

    return {
      alg: 'ECDH-ES+A256GCM',
      ephemeralPublicKey: arrayBufferToBase64(ephemeralPublicKeyBuffer),
      iv: arrayBufferToBase64(iv),
      ciphertext: arrayBufferToBase64(ciphertext),
      tag: arrayBufferToBase64(tag)
    };
  } catch (error) {
    console.error('[Encryption] Failed to encrypt message:', error);
    throw new Error('Encryption failed: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Decrypt message using hybrid decryption (ECDH + AES-GCM)
 * Flow:
 * 1. Import sender's ephemeral public key
 * 2. Derive shared secret with our private key (ECDH)
 * 3. Derive AES key from shared secret
 * 4. Decrypt ciphertext with AES-GCM
 * 5. Return plaintext
 */
async function decryptMessage(encryptionData) {
  try {
    console.log('[Decrypt] 🔐 encryptionData payload:', encryptionData);

    const ephB64 = encryptionData.ephemeralPublicKey ?? encryptionData.ephemeral_public_key;
    const ivB64 = encryptionData.iv;
    const ctB64 = encryptionData.ciphertext;
    const tagB64 = encryptionData.tag;

    if (!ephB64 || !ivB64 || !ctB64 || !tagB64) {
      throw new Error('Missing encryption fields (ephemeralPublicKey/iv/ciphertext/tag)');
    }

    const ephemeralPublicKeyBuffer = base64ToArrayBuffer(ephB64);
    const ephemeralPublicKey = await crypto.subtle.importKey(
      'spki',
      ephemeralPublicKeyBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    const privateKeyBuffer = base64ToArrayBuffer(ENCRYPTION_PRIVATE_KEY);
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      ['deriveBits']
    );

    const sharedSecret = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: ephemeralPublicKey },
      privateKey,
      256
    );

    const aesKey = await crypto.subtle.importKey(
      'raw',
      sharedSecret,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const ciphertextBuffer = base64ToArrayBuffer(ctB64);
    const tagBuffer = base64ToArrayBuffer(tagB64);
    const fullCiphertext = new Uint8Array(ciphertextBuffer.byteLength + tagBuffer.byteLength);
    fullCiphertext.set(new Uint8Array(ciphertextBuffer), 0);
    fullCiphertext.set(new Uint8Array(tagBuffer), ciphertextBuffer.byteLength);

    const ivBuffer = base64ToArrayBuffer(ivB64);
    const plaintextBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer, tagLength: 128 },
      aesKey,
      fullCiphertext
    );

    const decoder = new TextDecoder();
    const plaintextJson = decoder.decode(plaintextBuffer);
    return JSON.parse(plaintextJson);
  } catch (error) {
    console.error('[Decryption] Failed to decrypt message:', error);
    throw new Error('Decryption failed: ' + error.message);
  }
}

// ============================================================================
// 🔐 ACK HANDLING (UPDATED to use DIDComm builder)
// ============================================================================
/**
 * Send acknowledgement for a received message.
 * Uses DIDComm v2 ACK format with proper threading.
 */
async function sendAcknowledgement(originalMessage) {
  try {
    console.log('[ACK] 📤 Sending ACK for message:', originalMessage.id);
    
    // Build DIDComm v2 compliant ACK message
    const ackPlaintext = buildAckMessage(originalMessage, WALLET_DID);
    
    console.log('[ACK] Built DIDComm ACK:', ackPlaintext);
    
    // Encrypt, sign, and send (reuse existing flow)
    const recipientDid = originalMessage.from;
    const encryptionData = await encryptMessage(ackPlaintext.body, recipientDid);
    
    // Construct the wire message (encrypted DIDComm)
    const ackMessage = {
      id: ackPlaintext.id,
      type: ackPlaintext.type,
      from: ackPlaintext.from,
      to: getPrimaryRecipient(ackPlaintext), // Backend expects string, not array
      created_time: new Date(ackPlaintext.created_time * 1000).toISOString(),
      thid: ackPlaintext.thid, // Thread reference to original message
      encryption: encryptionData,
    };
    
    // Sign the encrypted message
    const signature = await signDidCommMessage(ackMessage);
    ackMessage.signature = signature;
    
    // Send to backend
    const response = await fetch(`${DIDCOMM_BACKEND_URL}/api/SendDidCommMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ackMessage),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    console.log('[ACK] ✅ ACK sent successfully');
  } catch (error) {
    console.error('[ACK] ❌ Failed to send ACK:', error);
  }
}

/**
 * Handle received ACK message.
 * Updates the corresponding sent message with ACK status.
 */
function handleReceivedAck(ackMessage, decryptedBody) {
  // thid contains the original message ID
  const originalMessageId = ackMessage.thid;
  
  if (!originalMessageId) {
    console.warn('[ACK] ACK missing thid (thread reference)');
    return;
  }
  
  // Find and update the sent message
  const sentMessage = sentMessages.find(m => m.id === originalMessageId);
  if (sentMessage) {
    sentMessage.ackReceived = true;
    sentMessage.ackTimestamp = new Date().toISOString();
    sentMessage.ackStatus = decryptedBody.status || 'received';
    console.log('[ACK] ✅ Updated sent message with ACK:', originalMessageId);
  } else {
    console.warn('[ACK] No matching sent message for ACK:', originalMessageId);
  }
}

// Handle received DIDComm message from SignalR (UPDATED with DIDComm v2 routing)
async function handleReceivedDidCommMessage(didcommMessage) {
  console.log('[DIDComm] 🔐 Encrypted message received. ID:', didcommMessage.id);
  console.log('[DIDComm] Type:', didcommMessage.type);

  // Filter: Only accept messages addressed to this wallet
  // Handle both array (DIDComm v2) and string (legacy) formats
  const recipients = Array.isArray(didcommMessage.to) ? didcommMessage.to : [didcommMessage.to];
  if (!recipients.includes(WALLET_DID)) {
    console.log('[DIDComm] Message not for this wallet. To:', didcommMessage.to, 'This wallet:', WALLET_DID);
    return;
  }
  
  // Check for duplicates (by message ID)
  if (receivedMessages.some(m => m.id === didcommMessage.id)) {
    console.log('[DIDComm] Duplicate message ignored:', didcommMessage.id);
    return;
  }
  
  // 🔐 Verify signature cryptographically
  const signatureValid = await verifyDidCommMessageSignature(didcommMessage);
  if (!signatureValid) {
    console.warn('[DIDComm] ❌ Invalid signature, message rejected');
    return;
  }
  console.log('[DIDComm] ✅ Signature verified');
  
  // Decrypt message
  try {
    const decryptedBody = await decryptMessage(didcommMessage.encryption);
    console.log('[DIDComm] ✅ Message decrypted successfully');

    // Route based on DIDComm message type
    switch (didcommMessage.type) {
      case DIDCOMM_TYPES.ACK:
        console.log('[DIDComm] 📨 Received ACK message');
        handleReceivedAck(didcommMessage, decryptedBody);
        return; // Don't store ACKs or send ACKs for ACKs
        
      case DIDCOMM_TYPES.APPROVAL_REQUEST:
        console.log('[DIDComm] 📋 Received approval request');
        handleApprovalRequest(didcommMessage, decryptedBody);
        break;
        
      case DIDCOMM_TYPES.APPROVAL_RESPONSE:
        console.log('[DIDComm] ✅ Received approval response');
        handleApprovalResponse(didcommMessage, decryptedBody);
        break;
        
      case DIDCOMM_TYPES.BASIC_MESSAGE:
      default:
        // Store as regular message
        receivedMessages.push({
          ...didcommMessage,
          body: decryptedBody,
          receivedAt: new Date().toISOString(),
          read: false,
        });
        
        // Update badge
        const unreadCount = receivedMessages.filter(m => !m.read).length;
        chrome.action.setBadgeText({ text: unreadCount.toString() });
        chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
        
        console.log('[DIDComm] Message stored. Total:', receivedMessages.length);
        
        // Send ACK for non-ACK messages
        await sendAcknowledgement(didcommMessage);
        break;
    }
    
  } catch (err) {
    console.error('[DIDComm] ❌ Failed to decrypt message:', err);
  }
}

/**
 * Handle approval request (placeholder - extend as needed)
 */
function handleApprovalRequest(message, body) {
  // Store with specific type for UI filtering
  receivedMessages.push({
    ...message,
    body: body,
    receivedAt: new Date().toISOString(),
    read: false,
    isApprovalRequest: true,
  });
  
  // Update badge
  const unreadCount = receivedMessages.filter(m => !m.read).length;
  chrome.action.setBadgeText({ text: unreadCount.toString() });
  chrome.action.setBadgeBackgroundColor({ color: '#f59e0b' }); // Orange for requests
  
  // Send ACK
  sendAcknowledgement(message);
}

/**
 * Handle approval response (placeholder - extend as needed)
 */
function handleApprovalResponse(message, body) {
  // Find the original request using thid
  const originalRequestId = message.thid;
  
  console.log('[Approval] Response for request:', originalRequestId, 'Approved:', body.approved);
  
  // Could update UI, trigger callbacks, etc.
  receivedMessages.push({
    ...message,
    body: body,
    receivedAt: new Date().toISOString(),
    read: false,
    isApprovalResponse: true,
  });
  
  // Send ACK
  sendAcknowledgement(message);
}

// Create and sign DIDComm message (UPDATED to use DIDComm v2 builder)
async function createSignedDidCommMessage(to, body, options = {}) {
  try {
    // Determine message type
    const messageType = options.type || DIDCOMM_TYPES.BASIC_MESSAGE;
    
    // Build DIDComm v2 compliant plaintext message
    const plaintextMessage = buildDidCommMessage({
      type: messageType,
      from: WALLET_DID,
      to: to,
      body: body,
      thid: options.thid, // For responses/ACKs
    });
    
    // Validate before proceeding
    const validation = validateDidCommMessage(plaintextMessage);
    if (!validation.valid) {
      throw new Error(`Invalid DIDComm message: ${validation.errors.join(', ')}`);
    }
    
    console.log('[DIDComm] Built plaintext message:', plaintextMessage);
    
    // 🔐 Encrypt the message body
    const recipientDid = getPrimaryRecipient(plaintextMessage);
    const encryptionData = await encryptMessage(body, recipientDid);
    
    // Construct wire message (what gets sent over the network)
    const wireMessage = {
      id: plaintextMessage.id,
      type: plaintextMessage.type,
      from: plaintextMessage.from,
      to: recipientDid, // Backend currently expects string
      created_time: new Date(plaintextMessage.created_time * 1000).toISOString(),
      encryption: encryptionData,
    };
    
    // Add thid if present (for threading)
    if (plaintextMessage.thid) {
      wireMessage.thid = plaintextMessage.thid;
    }
    
    // 🔐 Sign the entire wire message
    const signature = await signDidCommMessage(wireMessage);
    
    return {
      ...wireMessage,
      signature: signature,
      // Store original for tracking
      _plaintext: plaintextMessage,
    };
  } catch (error) {
    console.error('[DIDComm] Failed to create signed message:', error);
    throw new Error(error.message || 'Failed to create signed DIDComm message');
  }
}

// Send DIDComm message to backend (UPDATED)
async function sendDidCommMessage(to, body, options = {}) {
  try {
    const signedMessage = await createSignedDidCommMessage(to, body, options);
    
    // Remove internal plaintext before sending
    const { _plaintext, ...wireMessage } = signedMessage;
    
    const response = await fetch(`${DIDCOMM_BACKEND_URL}/api/SendDidCommMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wireMessage),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }
    
    const result = await response.json();
    
    // Track sent message for ACK correlation (not for ACKs)
    if (wireMessage.type !== DIDCOMM_TYPES.ACK) {
      sentMessages.push({
        ...wireMessage,
        body: body,
        sentAt: new Date().toISOString(),
        ackReceived: false,
        ackTimestamp: null,
        ackStatus: null,
      });
      
      if (sentMessages.length > 50) {
        sentMessages = sentMessages.slice(-50);
      }
    }
    
    return { ...result, messageId: wireMessage.id };
  } catch (error) {
    console.error('[DIDComm] Failed to send message:', error);
    throw new Error(error.message || 'Failed to send DIDComm message');
  }
}

// Initialize SignalR when extension starts
initializeSignalR();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const method = msg && msg.method;
  const origin = sender && sender.url ? new URL(sender.url).origin : null;
  
  // Handle messages from offscreen SignalR client (UPDATED for async)
  if (msg.type === 'DIDCOMM_MESSAGE_RECEIVED') {
    handleReceivedDidCommMessage(msg.payload)
      .then(() => sendResponse({ ok: true }))
      .catch(err => {
        console.error('[DIDComm] Error handling message:', err);
        sendResponse({ ok: false, error: err.message });
      });
    return true; // async response
  }
  
  if (msg.type === 'SIGNALR_CONNECTED') {
    console.log('[SignalR] Connection confirmed from offscreen document');
    sendResponse({ ok: true });
    return false;
  }
  
  if (msg.type === 'SIGNALR_SUBSCRIBED') {
    console.log('[SignalR] ✅ Subscribed to DID group:', msg.walletDid);
    sendResponse({ ok: true });
    return false;
  }
  
  if (msg.type === 'SIGNALR_ERROR') {
    console.error('[SignalR] Error from offscreen:', msg.error);
    sendResponse({ ok: true });
    return false;
  }

  switch (method) {
    case 'eth_requestAccounts': {
      if (origin && approvedOrigins.has(origin)) {
        sendResponse([WALLET_ADDRESS]);
        return false;
      }
      // Gate: open permission UI
      const id = nextId++;
      pending.set(id, { origin, sendResponse });
      openPermissionWindow(id, origin);
      return true; // async response
    }
    case 'eth_accounts': {
      // Allow extension pages to always see the dummy account; pages must be approved
      if (origin && (approvedOrigins.has(origin) || origin.startsWith('chrome-extension://'))){
        sendResponse([WALLET_ADDRESS]);
      } else {
        sendResponse([]);
      }
      return false;
    }
    case 'eth_chainId': {
      sendResponse('0x1');
      return false;
    }
    case 'mywallet_permissionResult': {
      const { id, approved } = msg;
      const entry = pending.get(id);
      if (!entry) { sendResponse({ ok: false }); return false; }
      pending.delete(id);
      if (approved) {
        if (entry.origin) { approvedOrigins.add(entry.origin); persistApprovals(); }
        const accounts = [WALLET_ADDRESS];
        entry.sendResponse(accounts);
        // Notify all tabs of account change
        chrome.runtime.sendMessage({ method: 'mywallet_internal_accountsChanged', accounts });
      } else {
        entry.sendResponse({ error: { code: 4001, message: 'User rejected request' } });
      }
      sendResponse({ ok: true });
      return false;
    }
    case 'mywallet_getApprovedOrigins': {
      sendResponse({ origins: Array.from(approvedOrigins) });
      return false;
    }
    case 'personal_sign': {
      // params: [message, address]
      const message = msg.params && msg.params[0];
      const address = msg.params && msg.params[1];
      if (!message) {
        sendResponse({ error: { code: -32602, message: 'Invalid params: message required' } });
        return false;
      }
      // Check if origin is approved
      if (!origin || !approvedOrigins.has(origin)) {
        sendResponse({ error: { code: 4100, message: 'Unauthorized: connect wallet first' } });
        return false;
      }
      // Create pending signature request
      const id = nextId++;
      pendingSignatures.set(id, { message, origin, sendResponse });
      openSignWindow(id, message, origin);
      return true; // async response
    }
    case 'mywallet_signResult': {
      const { id, approved } = msg;
      const entry = pendingSignatures.get(id);
      if (!entry) {
        sendResponse({ ok: false });
        return false;
      }
      pendingSignatures.delete(id);
      if (approved) {
        // Sign the message
        signMessage(entry.message, DUMMY_PRIVATE_KEY).then(signature => {
          entry.sendResponse(signature);
        }).catch(err => {
          entry.sendResponse({ error: { code: -32603, message: 'Signing failed: ' + err.message } });
        });
      } else {
        entry.sendResponse({ error: { code: 4001, message: 'User rejected signature request' } });
      }
      sendResponse({ ok: true });
      return false;
    }
    case 'didcomm_send': {
      // params: [to, body]
      const to = msg.params && msg.params[0];
      const body = msg.params && msg.params[1];
      if (!to || !body) {
        sendResponse({ error: { code: -32602, message: 'Invalid params: to and body required' } });
        return false;
      }
      
      // Validate and normalize DID format
      const normalizedTo = typeof to === 'string' ? to.trim().replace(/\s+/g, '') : to;
      if (!normalizedTo || !normalizedTo.startsWith('did:')) {
        sendResponse({ error: { code: -32602, message: 'Invalid DID format' } });
        return false;
      }
      
      // Check if origin is approved
      if (!origin || !approvedOrigins.has(origin)) {
        sendResponse({ error: { code: 4100, message: 'Unauthorized: connect wallet first' } });
        return false;
      }
      
      sendDidCommMessage(normalizedTo, body)
        .then(result => sendResponse(result))
        .catch(error => {
          sendResponse({ 
            error: { 
              code: -32603, 
              message: error?.message || String(error) || 'Unknown error'
            } 
          });
        });
      return true; // async response
    }
    case 'didcomm_getMessages': {
      sendResponse({ messages: receivedMessages });
      return false;
    }
    case 'didcomm_getSentMessages': {
      sendResponse({ messages: sentMessages });
      return false;
    }
    case 'didcomm_getMessageStatus': {
      const messageId = msg.params && msg.params[0];
      const sentMessage = sentMessages.find(m => m.id === messageId);
      if (sentMessage) {
        sendResponse({
          id: messageId,
          ackReceived: sentMessage.ackReceived,
          ackTimestamp: sentMessage.ackTimestamp,
          ackStatus: sentMessage.ackStatus
        });
      } else {
        sendResponse({ id: messageId, ackReceived: false });
      }
      return false;
    }
    case 'wallet_getDid': {
      // Return the wallet's DID
      sendResponse(WALLET_DID);
      return false;
    }
    case 'wallet_getAddress': {
      // Return the wallet's address
      sendResponse(WALLET_ADDRESS);
      return false;
    }
    default: {
      sendResponse({ error: { code: -32601, message: 'Method not found' } });
      return false;
    }
  }
});

// Listen for internal broadcast of accountsChanged
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.method === 'mywallet_internal_accountsChanged') {
    // Could forward to content scripts if needed
    // (Simplified: page already updates after direct response.)
  }
});
