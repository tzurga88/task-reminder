require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initBot } = require('./telegram');
const { startScheduler } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/tasks', require('./routes/tasks'));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Capturer les erreurs non gerees pour eviter les crashs
process.on('uncaughtException', (err) => {
  console.error('[Erreur non geree]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Promesse rejetee]', reason);
});

initBot();
startScheduler();

app.listen(PORT, () => {
  console.log(`Serveur demarre sur http://localhost:${PORT}`);
});
