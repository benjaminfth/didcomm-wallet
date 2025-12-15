// Permission popup logic extracted from inline script
(function(){
  function init(){
    const approveBtn = document.getElementById('approveBtn');
    const rejectBtn = document.getElementById('rejectBtn');
    const originEl = document.getElementById('origin');
    if (!approveBtn || !rejectBtn || !originEl){
      console.warn('[permission] Missing expected DOM elements');
      return;
    }
    const params = new URLSearchParams(location.search);
    const id = Number(params.get('id'));
    const origin = params.get('origin') || 'Unknown';
    originEl.textContent = origin;
    function respond(approved){
      chrome.runtime.sendMessage({ method: 'mywallet_permissionResult', id, approved }, () => {
        window.close();
      });
    }
    approveBtn.addEventListener('click', () => respond(true));
    rejectBtn.addEventListener('click', () => respond(false));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
