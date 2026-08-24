const express = require('express');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 8083;
const siteDir = path.join(__dirname, '_site');

app.use(express.static(siteDir));
app.use((req, res) => {
  res.status(404).sendFile(path.join(siteDir, '404.html'));
});

const server = app.listen(PORT, () => {
  console.log(`Local audit server running on ${PORT}`);
  const child = spawn('node', ['scripts/audit_production_seo.js', `http://localhost:${PORT}`], {
    stdio: 'inherit'
  });

  child.on('close', (code) => {
    server.close(() => {
      process.exit(code);
    });
  });
});
