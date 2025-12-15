// Removed obsolete connectBtn listener (button no longer exists)
// Note: popup now gets account/network via background messages (not window.ethereum)
(function(){
  const accountEl = document.getElementById('account');
  const networkEl = document.getElementById('network');
  const sitesEl = document.getElementById('sites');
  function short(a){ return a ? a.slice(0,6)+'...'+a.slice(-4) : '—'; }
  function bgRequest(method, params){
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ method, params }, (res) => resolve(res));
    });
  }
  async function load(){
    if (!accountEl || !networkEl){ console.warn('[popup] Missing DOM'); return; }
    try {
      const chainId = await bgRequest('eth_chainId');
      networkEl.textContent = typeof chainId === 'string' ? chainId : '—';
      const accounts = await bgRequest('eth_accounts');
      accountEl.textContent = (Array.isArray(accounts) && accounts.length) ? short(accounts[0]) : '—';
      // Load approved origins
      if (sitesEl){
        const resp = await bgRequest('mywallet_getApprovedOrigins');
        const list = resp && Array.isArray(resp.origins) ? resp.origins : [];
        sitesEl.innerHTML = '';
        if (!list.length){
          sitesEl.innerHTML = '<li style="opacity:.6">None</li>';
        } else {
          list.forEach(o => {
            const li = document.createElement('li');
            li.textContent = o;
            sitesEl.appendChild(li);
          });
        }
      }
      // Load DIDComm messages
      await loadDidCommMessages();
    } catch(e){
      accountEl.textContent = '—';
      networkEl.textContent = '—';
      if (sitesEl) sitesEl.innerHTML = '<li style="opacity:.6">Error</li>';
    }
  }
  
  async function loadDidCommMessages(){
    const messagesEl = document.getElementById('didcommMessages');
    if (!messagesEl) return;
    
    try {
      const resp = await bgRequest('didcomm_getMessages');
      const messages = resp && Array.isArray(resp.messages) ? resp.messages : [];
      messagesEl.innerHTML = '';
      
      if (!messages.length) {
        messagesEl.innerHTML = '<li style="opacity:.6">No messages</li>';
        return;
      }
      
      messages.slice(-5).forEach(msg => { // Show last 5 messages
        const li = document.createElement('li');
        li.style.cssText = 'padding:6px; border-radius:4px; margin-bottom:4px; font-size:11px; ' + 
                          (msg.read ? 'opacity:0.7;' : 'background:#2d3748;');
        li.innerHTML = `
          <div style="font-weight:600; color:#7c9ad4;">${msg.from}</div>
          <div style="margin-top:2px;">${msg.body.text || JSON.stringify(msg.body)}</div>
          <div style="opacity:0.6; font-size:10px; margin-top:2px;">${new Date(msg.created_time).toLocaleString()}</div>
        `;
        li.onclick = () => markMessageAsRead(msg.id);
        messagesEl.appendChild(li);
      });
    } catch(e) {
      messagesEl.innerHTML = '<li style="opacity:.6; color:#ef4444;">Error loading messages</li>';
    }
  }
  
  async function markMessageAsRead(messageId){
    await bgRequest('didcomm_markAsRead', [messageId]);
    loadDidCommMessages(); // Refresh display
  }
  
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
