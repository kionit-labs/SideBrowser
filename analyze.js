const fs = require('fs');
const code = fs.readFileSync('C:\\Users\\ismail\\AppData\\Local\\Programs\\Slide Browser\\resources\\acik_kodlar\\dist-electron\\main\\index.js', 'utf8');

const queries = [
  'new Zt({',
  'handleBlur',
  'ElectronBlocker',
  'electron-datastore',
  'transparent:',
  'vibrancy:',
  'backgroundMaterial:'
];

queries.forEach(q => {
  let idx = code.indexOf(q);
  if (idx > -1) {
    console.log(`\n--- Match for ${q} ---`);
    console.log(code.substring(Math.max(0, idx - 50), idx + 800));
  }
});
