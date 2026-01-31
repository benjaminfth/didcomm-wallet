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
    sendDidCommMessage(to, body) {
      return this.request({ method: 'didcomm_send', params: [to, body] });
    },
    
    getDidCommMessages() {
      return this.request({ method: 'didcomm_getMessages' });
    },
    
    getSentDidCommMessages() {
      return this.request({ method: 'didcomm_getSentMessages' });
    },
    
    getMessageAckStatus(messageId) {
      return this.request({ method: 'didcomm_getMessageStatus', params: [messageId] });
    },
    
    markDidCommMessageAsRead(messageId) {
      return this.request({ method: 'didcomm_markAsRead', params: [messageId] });
    },
    
    // Wallet identity methods
    getWalletDid() {
      return this.request({ method: 'wallet_getDid' });
    },
    
    getWalletAddress() {
      return this.request({ method: 'wallet_getAddress' });
    },
  };

  Object.defineProperty(window, 'ethereum', { value: provider, writable: false });
  window.dispatchEvent(new Event('ethereum#initialized'));

  // Initialize baseline state
  provider.request({ method: 'eth_chainId' }).catch(() => {});
  provider.request({ method: 'eth_accounts' }).catch(() => {});
})();
