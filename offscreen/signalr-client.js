// SignalR client for DIDComm messages (runs in offscreen document)
const SIGNALR_HUB_URL = 'https://localhost:7001/didcommhub';

let connection = null;
let walletDid = null;
let isConnecting = false;

// Listen for initialization message from background script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'INIT_SIGNALR') {
    walletDid = msg.walletDid;
    console.log('[SignalR Offscreen] Received wallet DID:', walletDid);
    initConnection();
    sendResponse({ ok: true });
    return false;
  }
});

async function initConnection() {
  // Check if signalR library is loaded
  if (typeof signalR === 'undefined') {
    console.error('[SignalR Offscreen] signalR library not loaded, retrying in 2s...');
    setTimeout(initConnection, 2000);
    return;
  }
  
  if (isConnecting || (connection && connection.state === 'Connected')) {
    console.log('[SignalR Offscreen] Already connected or connecting');
    return;
  }
  
  isConnecting = true;
  
  try {
    console.log('[SignalR Offscreen] Building connection to', SIGNALR_HUB_URL);
    
    connection = new signalR.HubConnectionBuilder()
      .withUrl(SIGNALR_HUB_URL, {
        withCredentials: false,
        skipNegotiation: false
      })
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: (retryContext) => {
          // Exponential backoff: 0, 2, 10, 30 seconds, then 30 seconds
          if (retryContext.elapsedMilliseconds < 60000) {
            return Math.min(1000 * Math.pow(2, retryContext.previousRetryCount), 30000);
          }
          return 30000;
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Handle incoming DIDComm messages
    connection.on('DidCommMessageReceived', (payload) => {
      console.log('[SignalR Offscreen] Received DIDComm message:', payload);
      // Forward to background script
      chrome.runtime.sendMessage({
        type: 'DIDCOMM_MESSAGE_RECEIVED',
        payload: payload
      }).catch(err => console.error('[SignalR Offscreen] Failed to forward message:', err));
    });

    // Handle reconnection
    connection.onreconnecting((error) => {
      console.warn('[SignalR Offscreen] Connection lost, reconnecting...', error);
      chrome.runtime.sendMessage({
        type: 'SIGNALR_ERROR',
        error: 'Reconnecting'
      }).catch(() => {});
    });

    connection.onreconnected((connectionId) => {
      console.log('[SignalR Offscreen] Reconnected with ID:', connectionId);
      // Rejoin DID group after reconnection
      if (walletDid) {
        joinDidGroup();
      }
    });

    // Handle connection close
    connection.onclose((error) => {
      isConnecting = false;
      console.error('[SignalR Offscreen] Connection closed:', error);
      chrome.runtime.sendMessage({
        type: 'SIGNALR_ERROR',
        error: error ? error.message : 'Connection closed'
      }).catch(() => {});
      
      // Retry after 5 seconds
      setTimeout(initConnection, 5000);
    });

    // Start the connection
    await connection.start();
    isConnecting = false;
    console.log('[SignalR Offscreen] Connected successfully!');
    
    // Join DID-specific group
    if (walletDid) {
      await joinDidGroup();
    }
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SIGNALR_CONNECTED'
    }).catch(err => console.warn('[SignalR Offscreen] Could not notify background:', err));
    
  } catch (error) {
    isConnecting = false;
    console.error('[SignalR Offscreen] Connection failed:', error);
    chrome.runtime.sendMessage({
      type: 'SIGNALR_ERROR',
      error: error.message
    }).catch(() => {});
    
    // Retry after 5 seconds
    setTimeout(initConnection, 5000);
  }
}

async function joinDidGroup() {
  if (!connection || connection.state !== 'Connected') {
    console.warn('[SignalR Offscreen] Cannot join group, not connected. State:', connection?.state);
    return;
  }
  
  if (!walletDid) {
    console.warn('[SignalR Offscreen] Cannot join group, wallet DID not set');
    return;
  }
  
  try {
    console.log('[SignalR Offscreen] Invoking JoinDid with DID:', walletDid);
    await connection.invoke('JoinDid', walletDid);
    console.log('[SignalR Offscreen] ✅ Successfully joined DID group:', walletDid);
    
    // Notify background that we're subscribed
    chrome.runtime.sendMessage({
      type: 'SIGNALR_SUBSCRIBED',
      walletDid: walletDid
    }).catch(err => console.warn('[SignalR Offscreen] Could not notify subscription:', err));
    
  } catch (error) {
    console.error('[SignalR Offscreen] ❌ Failed to join DID group:', error);
    console.error('[SignalR Offscreen] Error details:', error.message, error.stack);
    
    // Retry after 3 seconds
    setTimeout(() => {
      console.log('[SignalR Offscreen] Retrying JoinDid...');
      joinDidGroup();
    }, 3000);
  }
}

// Auto-init if wallet DID is already available (shouldn't happen, but defensive)
if (walletDid) {
  initConnection();
} else {
  console.log('[SignalR Offscreen] Waiting for INIT_SIGNALR message from background...');
}