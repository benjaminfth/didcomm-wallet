// Sign popup logic
(function(){
  function init(){
    const signBtn = document.getElementById('signBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const originEl = document.getElementById('origin');
    const messageEl = document.getElementById('message');
    if (!signBtn || !rejectBtn || !originEl || !messageEl){
      console.warn('[sign] Missing expected DOM elements');
      return;
    }
    const params = new URLSearchParams(location.search);
    const id = Number(params.get('id'));
    const origin = params.get('origin') || 'Unknown';
    const message = params.get('message') || '';
    
    originEl.textContent = `From: ${origin}`;
    messageEl.textContent = message;
    
    function respond(approved){
      chrome.runtime.sendMessage({ method: 'mywallet_signResult', id, approved }, () => {
        window.close();
      });
    }
    signBtn.addEventListener('click', () => respond(true));
    rejectBtn.addEventListener('click', () => respond(false));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
