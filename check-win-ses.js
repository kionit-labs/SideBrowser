const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false });
  const ses = win.webContents.session;
  console.log('--- WINDOW SESSION INFO ---');
  console.log('Has registerPreloadScript:', typeof ses.registerPreloadScript);
  console.log('Has setPreloads:', typeof ses.setPreloads);
  process.exit(0);
});
