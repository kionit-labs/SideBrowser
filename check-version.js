const { app } = require('electron');
app.whenReady().then(() => {
  console.log('Electron Version:', process.versions.electron);
  console.log('Chrome Version:', process.versions.chrome);
  process.exit(0);
});
