// This script runs in the web page context
if (!document.documentElement.hasAttribute('data-mywallet-injected')) {
  document.documentElement.setAttribute('data-mywallet-injected', 'true');
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inpage/inpage.js');
  script.onload = () => script.remove();
  (document.head || document.documentElement).appendChild(script);

  // Bridge messages between the page and the extension
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data || {};
    if (data.type === 'MYWALLET_REQUEST') {
      // Validate extension context before sending message
      if (!chrome.runtime || !chrome.runtime.id) {
        window.postMessage({
          type: 'MYWALLET_RESPONSE',
          id: data.id,
          error: { code: -32603, message: 'Extension disconnected. Please reload the page.' },
          result: undefined
        }, '*');
        return;
      }

      try {
        chrome.runtime.sendMessage({ method: data.method, params: data.params }, (response) => {
          // Check if extension context is still valid
          if (chrome.runtime.lastError) {
            const err = { 
              code: -32000, 
              message: chrome.runtime.lastError.message 
            };
            window.postMessage({
              type: 'MYWALLET_RESPONSE',
              id: data.id,
              error: err,
              result: undefined
            }, '*');
            return;
          }
          
          // ✅ Preserve full error details (including nested errors)
          const err = (response && response.error) || null;
          window.postMessage({
            type: 'MYWALLET_RESPONSE',
            id: data.id,
            error: err ? {
              code: err.code || -32603,
              message: err.message || String(err),
              data: err.data // ✅ Preserve additional error data
            } : undefined,
            result: err ? undefined : response
          }, '*');
        });
      } catch (e) {
        // Extension context invalidated (reload/update) - send error back to page
        window.postMessage({
          type: 'MYWALLET_RESPONSE',
          id: data.id,
          error: { 
            code: -32603, 
            message: `Extension error: ${e.message}` // ✅ Include actual error
          },
          result: undefined
        }, '*');
      }
    }
  });
}
