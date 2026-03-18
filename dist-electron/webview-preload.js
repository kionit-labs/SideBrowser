let electron = require("electron");
//#region electron/webview-preload.ts
electron.contextBridge.exposeInMainWorld("electronAPI", { getCredentialsForUrl: (url) => electron.ipcRenderer.invoke("get-credentials-for-url", url) });
window.addEventListener("load", () => {
	addCustomScrollbarStyle();
	initAutofill();
});
async function initAutofill() {
	const electronAPI = window.electronAPI;
	if (!electronAPI || !electronAPI.getCredentialsForUrl) {
		console.warn("[Autofill] electronAPI not found in webview");
		return;
	}
	let attempts = 0;
	const maxAttempts = 20;
	const attemptAutofill = async () => {
		attempts++;
		try {
			const credentials = await electronAPI.getCredentialsForUrl(window.location.href);
			if (!credentials || credentials.length === 0) {
				if (attempts < maxAttempts) setTimeout(attemptAutofill, 500);
				return;
			}
			const cred = credentials[0];
			const passInput = document.querySelector("input[type=\"password\"]");
			const userInput = document.querySelector("input[name*=\"login\" i], input[id*=\"login\" i], input[type=\"text\"], input[type=\"email\"], input[name*=\"user\" i], input[id*=\"user\" i], input[name*=\"identifier\" i]");
			if (passInput && cred.password && (!passInput.value || passInput.value === "")) {
				passInput.value = cred.password;
				passInput.style.backgroundColor = "rgba(255, 255, 0, 0.05)";
				passInput.dispatchEvent(new Event("input", { bubbles: true }));
				passInput.dispatchEvent(new Event("change", { bubbles: true }));
			}
			if (userInput && cred.username && (!userInput.value || userInput.value === "")) {
				if (userInput.type !== "password") {
					userInput.value = cred.username;
					userInput.style.backgroundColor = "rgba(255, 255, 0, 0.05)";
					userInput.dispatchEvent(new Event("input", { bubbles: true }));
					userInput.dispatchEvent(new Event("change", { bubbles: true }));
				}
			}
			if ((!passInput || !userInput) && attempts < maxAttempts) setTimeout(attemptAutofill, 500);
		} catch (err) {
			console.error("[Autofill] Error:", err);
		}
	};
	attemptAutofill();
}
function addCustomScrollbarStyle() {
	const style = document.createElement("style");
	style.id = "slide-browser-custom-scrollbar";
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
	if (document.head) document.head.appendChild(style);
	else document.addEventListener("DOMContentLoaded", () => document.head.appendChild(style));
}
//#endregion
