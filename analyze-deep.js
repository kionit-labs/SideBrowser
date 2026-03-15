const fs = require('fs');

const mainCode = fs.readFileSync('C:\\Users\\ismail\\AppData\\Local\\Programs\\Slide Browser\\resources\\acik_kodlar\\dist-electron\\main\\index.js', 'utf8');
const rendererCode = fs.readFileSync('C:\\Users\\ismail\\AppData\\Local\\Programs\\Slide Browser\\resources\\acik_kodlar\\dist\\assets\\index-nfbEmsOJ.js', 'utf8');

function extractAround(str, keyword, padding = 150) {
  let idx = str.indexOf(keyword);
  let results = [];
  while (idx !== -1) {
    results.push(str.substring(Math.max(0, idx - padding), Math.min(str.length, idx + padding)));
    idx = str.indexOf(keyword, idx + 1);
  }
  return results;
}

console.log('--- TRANSPARENCY IN MAIN ---');
console.log(extractAround(mainCode, 'transparent:').map(s => s.trim().replace(/\n/g, ' ')));

console.log('--- SET OPACITY IN MAIN ---');
console.log(extractAround(mainCode, 'setOpacity').map(s => s.trim().replace(/\n/g, ' ')));

console.log('--- BACKGROUND MATERIAL IN MAIN ---');
console.log(extractAround(mainCode, 'backgroundMaterial:').map(s => s.trim().replace(/\n/g, ' ')));

console.log('--- HANDLE BLUR EXACT ---');
console.log(extractAround(mainCode, 'handleBlur', 250).map(s => s.trim().replace(/\n/g, ' ')));

console.log('--- ADBLOCK EXACT ---');
console.log(extractAround(mainCode, 'enableBlockingInSession', 150).map(s => s.trim().replace(/\n/g, ' ')));
