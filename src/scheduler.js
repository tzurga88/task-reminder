const cron = require('node-cron');
const db = require('./db');
const { sendReminder } = require('./telegram');

function startScheduler() {
  // Verifie toutes les minutes si des rappels doivent etre envoyes
  cron.schedule('* * * * *', async () => {
    const now = new Date().toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM

    const tasks = db.prepare(`
      SELECT * FROM tasks
      WHERE is_done = 0
        AND telegram_notified = 0
        AND reminder_time IS NOT NULL
        AND substr(reminder_time, 1, 16) <= ?
    `).all(now);

    for (const task of tasks) {
      await sendReminder(task);
      db.prepare('UPDATE tasks SET telegram_notified = 1 WHERE id = ?').run(task.id);
    }

    if (tasks.length > 0) {
      console.log(`[Scheduler] ${tasks.length} rappel(s) envoye(s).`);
    }
  });

  console.log('[Scheduler] Planificateur de rappels demarre.');
}

module.exports = { startScheduler };
