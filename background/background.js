// Maintain approved origins and pending requests
const approvedOrigins = new Set();
const pending = new Map(); // id -> { origin, sendResponse }
const pendingSignatures = new Map(); // id -> { message, origin, sendResponse }
let nextId = 1;

// ============================================================================
// WALLET IDENTITY CONFIGURATION
// ============================================================================
// Change these values to create different wallet identities
// For testing with multiple wallets, use different values in different browser profiles

// Wallet Profile: ALICE (default)
const WALLET_ADDRESS = '0x1111111111111111111111111111111111111111';
const DUMMY_PRIVATE_KEY = 'a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1';

// Wallet Profile: BOB (use this in second browser/profile)
// const WALLET_ADDRESS = '0x2222222222222222222222222222222222222222';
// const DUMMY_PRIVATE_KEY = 'b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2';

// Derive DID from wallet address
const WALLET_DID = 'did:example:' + WALLET_ADDRESS;

console.log('[Wallet] Identity initialized:', WALLET_DID);
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

// Simple message signing using WebCrypto (ECDSA with secp256k1 not directly supported, using SHA-256 + dummy signature)
// For production: use a proper secp256k1 library or import ethers/web3
async function signMessage(message, privateKeyHex){
  // Convert message to bytes
  const msgBytes = new TextEncoder().encode(message);
  // Hash the message with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Dummy signature: concatenate privateKey + hash (NOT secure, for demo only)
  // In production: use secp256k1 signing (ethers.utils.signMessage or noble-secp256k1)
  const signature = '0x' + privateKeyHex.slice(0, 64) + hashHex.slice(0, 64);
  return signature;
}

// DIDComm configuration
const DIDCOMM_BACKEND_URL = 'https://localhost:7001'; // Update with your backend URL
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

// Handle received DIDComm message from SignalR
function handleReceivedDidCommMessage(didcommMessage) {
  console.log('[DIDComm] Message received:', didcommMessage);
  
  // Filter: Only accept messages addressed to this wallet
  if (didcommMessage.to !== WALLET_DID) {
    console.log('[DIDComm] Message not for this wallet. To:', didcommMessage.to, 'This wallet:', WALLET_DID);
    return;
  }
  
  // Check for duplicates (by message ID)
  if (receivedMessages.some(m => m.id === didcommMessage.id)) {
    console.log('[DIDComm] Duplicate message ignored:', didcommMessage.id);
    return;
  }
  
  // Verify signature (simplified - in production, resolve sender's DID for public key)
  if (verifyDidCommSignature(didcommMessage)) {
    receivedMessages.push({
      ...didcommMessage,
      receivedAt: new Date().toISOString(),
      read: false
    });
    
    // Show notification badge
    const unreadCount = receivedMessages.filter(m => !m.read).length;
    chrome.action.setBadgeText({ text: unreadCount.toString() });
    chrome.action.setBadgeBackgroundColor({ color: '#7c3aed' });
    
    console.log('[DIDComm] Message stored. Total messages:', receivedMessages.length, 'Unread:', unreadCount);
  } else {
    console.warn('[DIDComm] Invalid signature, message rejected');
  }
}

// Create and sign DIDComm message
async function createSignedDidCommMessage(to, body) {
  const didcommMessage = {
    type: 'https://didcomm.org/basicmessage/2.0/message',
    from: WALLET_DID,
    to: to,
    body: typeof body === 'string' ? { text: body } : body,
    created_time: new Date().toISOString(),
    id: crypto.randomUUID()
  };
  
  // Sign the message
  const messageStr = JSON.stringify(didcommMessage);
  const signature = await signMessage(messageStr, DUMMY_PRIVATE_KEY);
  
  return {
    ...didcommMessage,
    signature: signature
  };
}

// Send DIDComm message to backend
async function sendDidCommMessage(to, body) {
  try {
    const signedMessage = await createSignedDidCommMessage(to, body);
    
    const response = await fetch(`${DIDCOMM_BACKEND_URL}/api/SendDidCommMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signedMessage)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to send DIDComm message:', error);
    throw error;
  }
}

// Verify DIDComm message signature (simplified)
function verifyDidCommSignature(didcommMessage) {
  // In production: resolve sender DID to get public key, then verify signature
  // For demo: just check if signature field exists
  return didcommMessage.signature && didcommMessage.from && didcommMessage.body;
}

// Initialize SignalR when extension starts
initializeSignalR();

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const method = msg && msg.method;
  const origin = sender && sender.url ? new URL(sender.url).origin : null;
  
  // Handle messages from offscreen SignalR client
  if (msg.type === 'DIDCOMM_MESSAGE_RECEIVED') {
    handleReceivedDidCommMessage(msg.payload);
    sendResponse({ ok: true });
    return false;
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
      // Check if origin is approved
      if (!origin || !approvedOrigins.has(origin)) {
        sendResponse({ error: { code: 4100, message: 'Unauthorized: connect wallet first' } });
        return false;
      }
      
      sendDidCommMessage(to, body)
        .then(result => sendResponse(result))
        .catch(error => sendResponse({ error: { code: -32603, message: error.message } }));
      return true; // async response
    }
    case 'didcomm_getMessages': {
      sendResponse({ messages: receivedMessages });
      return false;
    }
    case 'didcomm_markAsRead': {
      const messageId = msg.params && msg.params[0];
      const message = receivedMessages.find(m => m.id === messageId);
      if (message) {
        message.read = true;
        const unreadCount = receivedMessages.filter(m => !m.read).length;
        chrome.action.setBadgeText({ text: unreadCount > 0 ? unreadCount.toString() : '' });
      }
      sendResponse({ ok: true });
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

// Document mywallet_getApprovedOrigins usage
// Document account broadcast mechanism
// Listen for internal broadcast of accountsChanged
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.method === 'mywallet_internal_accountsChanged') {
    // Could forward to content scripts if needed
    // (Simplified: page already updates after direct response.)
  }
});
