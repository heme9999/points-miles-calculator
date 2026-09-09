const fs = require('fs');

let f1 = 'src/index.njk';
let content1 = fs.readFileSync(f1, 'utf8');
content1 = content1.replace(
  '// Wait, the preset options are in CNY',
  '// Note: the preset options are in CNY'
);
fs.writeFileSync(f1, content1);
