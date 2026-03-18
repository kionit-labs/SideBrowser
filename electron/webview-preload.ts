// This script is injected into every <webview> to customize its appearance and behavior.
window.addEventListener('load', () => {
  addCustomScrollbarStyle();
  initAutofill();
});

async function initAutofill() {
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI || !electronAPI.getCredentialsForUrl) return;

  let attempts = 0;
  const maxAttempts = 20; // 10 seconds total (500ms intervals)
  
  const attemptAutofill = async () => {
    attempts++;
    const credentials = await electronAPI.getCredentialsForUrl(window.location.href);
    if (!credentials || credentials.length === 0) {
      if (attempts < maxAttempts) setTimeout(attemptAutofill, 500);
      return;
    }

    const cred = credentials[0];
    let filledAny = false;
    
    // Selectors optimized for Google, GitHub, and general sites
    const passInput = document.querySelector('input[type="password"]') as HTMLInputElement;
    const userInput = document.querySelector('input[name*="login" i], input[id*="login" i], input[type="text"], input[type="email"], input[name*="user" i], input[id*="user" i], input[name*="identifier" i]') as HTMLInputElement;

    if (passInput && cred.password && !passInput.value) {
      passInput.value = cred.password;
      passInput.style.backgroundColor = 'rgba(255, 255, 0, 0.05)';
      passInput.dispatchEvent(new Event('input', { bubbles: true }));
      passInput.dispatchEvent(new Event('change', { bubbles: true }));
      filledAny = true;
    }
    
    if (userInput && cred.username && !userInput.value) {
      // Don't fill password field as username
      if (userInput.type !== 'password') {
        userInput.value = cred.username;
        userInput.style.backgroundColor = 'rgba(255, 255, 0, 0.05)';
        userInput.dispatchEvent(new Event('input', { bubbles: true }));
        userInput.dispatchEvent(new Event('change', { bubbles: true }));
        filledAny = true;
      }
    }

    // If we haven't found or filled everything, keep checking
    if ((!passInput || !userInput) && attempts < maxAttempts) {
        setTimeout(attemptAutofill, 500);
    }
  };

  attemptAutofill();
}

function addCustomScrollbarStyle() {
  const style = document.createElement('style');
  style.id = 'slide-browser-custom-scrollbar';
  style.innerHTML = `
    ::-webkit-scrollbar {
      width: 10px !important;
      height: 10px !important;
      background-color: transparent !important;
    }
    ::-webkit-scrollbar-track {
      background: transparent !important;
    }
    ::-webkit-scrollbar-thumb {
      background-color: rgba(120, 120, 120, 0.4) !important;
      border-radius: 10px !important;
      border: 2px solid transparent !important;
      background-clip: padding-box !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background-color: rgba(120, 120, 120, 0.7) !important;
    }
  `;
  document.head.appendChild(style);
}
