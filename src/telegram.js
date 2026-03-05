const TelegramBot = require('node-telegram-bot-api');

let bot = null;

function initBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || token === 'your_bot_token_here') {
    console.warn('[Telegram] TELEGRAM_BOT_TOKEN non configure. Les notifications sont desactivees.');
    return null;
  }

  bot = new TelegramBot(token, { polling: false });
  console.log('[Telegram] Bot initialise avec succes.');
  return bot;
}

async function sendReminder(task) {
  if (!bot) return;

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId || chatId === 'your_chat_id_here') {
    console.warn('[Telegram] TELEGRAM_CHAT_ID non configure.');
    return;
  }

  const priorityEmoji = { low: 'v', medium: '!', high: '!!' };
  const emoji = priorityEmoji[task.priority] || '!';

  const message = [
    `[RAPPEL] ${emoji} ${task.title}`,
    task.description ? `\n${task.description}` : '',
    task.category ? `\nCategorie: ${task.category}` : '',
    task.due_date ? `\nEcheance: ${formatDate(task.due_date)}` : '',
  ].filter(Boolean).join('');

  try {
    await bot.sendMessage(chatId, message);
    console.log(`[Telegram] Rappel envoye pour la tache: ${task.title}`);
  } catch (err) {
    console.error('[Telegram] Erreur envoi message:', err.message);
  }
}

async function sendTestMessage() {
  if (!bot) return { success: false, error: 'Bot non initialise' };

  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId || chatId === 'your_chat_id_here') {
    return { success: false, error: 'TELEGRAM_CHAT_ID non configure' };
  }

  try {
    await bot.sendMessage(chatId, 'Test de connexion reussi ! Vos rappels Telegram fonctionnent correctement.');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('fr-FR', { timeZone: process.env.TIMEZONE || 'Europe/Paris' });
}

module.exports = { initBot, sendReminder, sendTestMessage };
