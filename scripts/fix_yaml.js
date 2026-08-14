const fs = require('fs');
const path = require('path');

const dirs = ['./src/en/guides', './src/guides', './src/en/examples', './src/examples'];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    if (file.endsWith('.md')) {
      const filePath = path.join(dir, file);
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Fix unquoted titles/descriptions containing colons
      content = content.replace(/^title: (.+:.+)$/gm, (match, p1) => {
        if (!p1.startsWith('"') && !p1.startsWith("'")) {
          return `title: "${p1.replace(/"/g, '\\"')}"`;
        }
        return match;
      });
      content = content.replace(/^description: (.+:.+)$/gm, (match, p1) => {
        if (!p1.startsWith('"') && !p1.startsWith("'")) {
          return `description: "${p1.replace(/"/g, '\\"')}"`;
        }
        return match;
      });

      fs.writeFileSync(filePath, content);
      console.log(`Fixed frontmatter in ${filePath}`);
    }
  });
});
