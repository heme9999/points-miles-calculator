const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.resolve(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getFiles(fullPath, files);
    } else if (fullPath.endsWith('.njk')) {
      files.push(fullPath);
    }
  }
  return files;
}

const files = getFiles(path.resolve(__dirname, 'src'));

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let changed = false;
  
  const faqRegex = /(<h[23][^>]*>.*?(?:FAQ|常见问题|常见问题解答).*?<\/h[23]>)\s*<div>\s*<details/g;
  if (faqRegex.test(content)) {
    content = content.replace(faqRegex, '$1\n  <div class="faq">\n    <details');
    changed = true;
  }
  
  if (content.includes('style="margin-bottom: 15px;"')) {
    content = content.replace(/<details style="margin-bottom: 15px;">/g, '<details>');
    changed = true;
  }
  
  if (content.includes('style="font-weight: bold; cursor: pointer; padding: 10px; background: #f8fafc; border-radius: 8px;"')) {
    content = content.replace(/<summary style="font-weight: bold; cursor: pointer; padding: 10px; background: #f8fafc; border-radius: 8px;">/g, '<summary>');
    changed = true;
  }
  
  if (content.includes('style="padding: 10px;"')) {
    content = content.replace(/<div style="padding: 10px;">/g, '<div>');
    changed = true;
  }

  if (content.includes('class="article-content"')) {
    content = content.replace(/class="article-content"/g, 'class="article-content prose"');
    content = content.replace(/class="article-content prose prose"/g, 'class="article-content prose"');
    changed = true;
  }

  if (content.includes('class="article-content prose" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;"')) {
    content = content.replace(/class="article-content prose" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid #e2e8f0;"/g, 'class="article-content prose" style="margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--line);"');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(f, content, 'utf8');
    console.log('Updated', f);
  }
});
