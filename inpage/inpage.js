(function(){
  // Avoid clobbering another provider (e.g., MetaMask)
  if (window.ethereum) return;

  const listeners = {};
  function emit(event, payload){
    const set = listeners[event];
    if (!set) return;
    for (const fn of set) { try { fn(payload); } catch (_) {} }
  }

  // Simple request/response bridge using window.postMessage
  let nextId = 1;
  const pending = new Map(); // id -> { resolve, reject, method }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data || {};
    if (data.type === 'MYWALLET_RESPONSE') {
      const entry = pending.get(data.id);
      if (!entry) return;
      pending.delete(data.id);
      const { resolve, reject, method } = entry;
      
      // ✅ Improved error handling with full details
      if (data.error) { 
        const error = new Error(data.error.message || 'Unknown error');
        error.code = data.error.code;
        if (data.error.data) error.data = data.error.data;
        reject(error);
        return;
      }

      // Update local state for certain methods
      if (method === 'eth_requestAccounts' || method === 'eth_accounts'){
        const res = data.result;
        if (Array.isArray(res) && res.length){
          const prev = provider.selectedAddress;
          provider.selectedAddress = res[0];
          if (prev !== provider.selectedAddress) emit('accountsChanged', [provider.selectedAddress]);
        } else {
          provider.selectedAddress = null;
          emit('accountsChanged', []);
        }
      } else if (method === 'eth_chainId' && typeof data.result === 'string'){
        if (data.result !== provider.chainId){
          provider.chainId = data.result;
          emit('chainChanged', data.result);
        }
      }

      resolve(data.result);
    }
  });

  // Optional: listen for internal broadcasts (future expansion)
  window.addEventListener('message', (event) => {
    // reserved
  });

  const provider = {
    isMetaMask: false,
    isMyWallet: true,
    chainId: '0x1',
    selectedAddress: null,

    request: ({ method, params } = {}) => {
      if (!method) return Promise.reject(new Error('Invalid request: method required'));
      const id = nextId++;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject, method });
        window.postMessage({ type: 'MYWALLET_REQUEST', id, method, params }, '*');
      });
    },

    // Legacy compatibility
    enable() { return this.request({ method: 'eth_requestAccounts' }); },
    on(event, fn){ (listeners[event] ||= new Set()).add(fn); },
    removeListener(event, fn){ listeners[event]?.delete(fn); },
    send(methodOrPayload, params){
      if (typeof methodOrPayload === 'string'){
        return this.request({ method: methodOrPayload, params });
      }
      const payload = methodOrPayload || {};
      return new Promise((resolve, reject) => {
        this.request({ method: payload.method, params: payload.params })
          .then((result) => resolve({ id: payload.id, jsonrpc: '2.0', result }))
          .catch((err) => reject(err));
      });
    },
    sendAsync(payload, cb){
      this.request({ method: payload.method, params: payload.params })
        .then((result) => cb(null, { id: payload.id, jsonrpc: '2.0', result }))
        .catch((err) => cb(err));
    },

    // DIDComm messaging methods
    sendDidCommMessage: function(to, body) {
      return this.request({ method: 'didcomm_send', params: [to, body] });
    },
    
    getDidCommMessages: function() {
      return this.request({ method: 'didcomm_getMessages' });
    },
    
    markDidCommMessageAsRead: function(messageId) {
      return this.request({ method: 'didcomm_markAsRead', params: [messageId] });
    },
    
    // Wallet identity methods
    getWalletDid: function() {
      return this.request({ method: 'wallet_getDid' });
    },
    
    getWalletAddress: function() {
      return this.request({ method: 'wallet_getAddress' });
    },
  };

  Object.defineProperty(window, 'ethereum', { value: provider, writable: false });
  window.dispatchEvent(new Event('ethereum#initialized'));

  // Initialize baseline state
  provider.request({ method: 'eth_chainId' }).catch(() => {});
  provider.request({ method: 'eth_accounts' }).catch(() => {});
})();

// Custom DIDComm methods
window.ethereum.sendDidCommMessage = async (to, body) => {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    window.postMessage({ 
      type: 'FROM_PAGE', 
      method: 'didcomm_send', 
      params: [to, body], 
      id 
    }, '*');
    
    const handler = (event) => {
      if (event.source === window && event.data?.type === 'FROM_EXTENSION' && event.data.id === id) {
        window.removeEventListener('message', handler);
        if (event.data.error) reject(new Error(event.data.error.message || 'Unknown error'));
        else resolve(event.data.result);
      }
    };
    window.addEventListener('message', handler);
  });
};

window.ethereum.getDidCommMessages = async () => {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    window.postMessage({ 
      type: 'FROM_PAGE', 
      method: 'didcomm_getMessages', 
      id 
    }, '*');
    
    const handler = (event) => {
      if (event.source === window && event.data?.type === 'FROM_EXTENSION' && event.data.id === id) {
        window.removeEventListener('message', handler);
        if (event.data.error) reject(new Error(event.data.error.message || 'Unknown error'));
        else resolve(event.data.result);
      }
    };
    window.addEventListener('message', handler);
  });
};

// Add ACK-related methods
window.ethereum.getSentDidCommMessages = async () => {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    window.postMessage({ 
      type: 'FROM_PAGE', 
      method: 'didcomm_getSentMessages', 
      id 
    }, '*');
    
    const handler = (event) => {
      if (event.source === window && event.data?.type === 'FROM_EXTENSION' && event.data.id === id) {
        window.removeEventListener('message', handler);
        if (event.data.error) reject(new Error(event.data.error.message || 'Unknown error'));
        else resolve(event.data.result);
      }
    };
    window.addEventListener('message', handler);
  });
};

window.ethereum.getMessageAckStatus = async (messageId) => {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    window.postMessage({ 
      type: 'FROM_PAGE', 
      method: 'didcomm_getMessageStatus', 
      params: [messageId],
      id 
    }, '*');
    
    const handler = (event) => {
      if (event.source === window && event.data?.type === 'FROM_EXTENSION' && event.data.id === id) {
        window.removeEventListener('message', handler);
        if (event.data.error) reject(new Error(event.data.error.message || 'Unknown error'));
        else resolve(event.data.result);
      }
    };
    window.addEventListener('message', handler);
  });
};

window.ethereum.markDidCommMessageAsRead = async (messageId) => {
  return new Promise((resolve, reject) => {
    const id = Date.now() + Math.random();
    window.postMessage({ 
      type: 'FROM_PAGE', 
      method: 'didcomm_markAsRead', 
      params: [messageId], 
      id 
    }, '*');
    
    const handler = (event) => {
      if (event.source === window && event.data?.type === 'FROM_EXTENSION' && event.data.id === id) {
        window.removeEventListener('message', handler);
        if (event.data.error) reject(new Error(event.data.error.message || 'Unknown error'));
        else resolve(event.data.result);
      }
    };
    window.addEventListener('message', handler);
  });
};
