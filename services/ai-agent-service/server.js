require('dotenv').config();

const app = require('./src/app');
const { port } = require('./src/config/env');

app.listen(port, () => {
  console.log(`AI Agent Service listening on port ${port}`);
});