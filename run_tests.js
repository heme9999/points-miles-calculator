const express = require('express');
const app = express();
app.use(express.static('_site'));
const server = app.listen(8083, () => {
  console.log('Server running on 8083');
  const { exec } = require('child_process');
  exec('node test_production.js', (err, stdout, stderr) => {
    console.log(stdout);
    if (stderr) console.error(stderr);
    server.close();
    process.exit(err ? 1 : 0);
  });
});
