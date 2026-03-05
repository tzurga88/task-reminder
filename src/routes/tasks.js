const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendTestMessage } = require('../telegram');

// GET /api/tasks - Lister toutes les taches
router.get('/', (req, res) => {
  const { category, priority, done } = req.query;

  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (category) { query += ' AND category = ?'; params.push(category); }
  if (priority) { query += ' AND priority = ?'; params.push(priority); }
  if (done !== undefined) { query += ' AND is_done = ?'; params.push(done === 'true' ? 1 : 0); }

  query += ' ORDER BY CASE priority WHEN "high" THEN 1 WHEN "medium" THEN 2 WHEN "low" THEN 3 END, due_date ASC';

  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});

// GET /api/tasks/categories - Lister les categories
router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM tasks WHERE category IS NOT NULL ORDER BY category').all();
  res.json(rows.map(r => r.category));
});

// POST /api/tasks - Creer une tache
router.post('/', (req, res) => {
  const { title, description, category, priority, due_date, reminder_time } = req.body;

  if (!title || title.trim() === '') {
    return res.status(400).json({ error: 'Le titre est obligatoire.' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, category, priority, due_date, reminder_time)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    title.trim(),
    description || '',
    category || 'General',
    priority || 'medium',
    due_date || null,
    reminder_time || null
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/tasks/:id - Modifier une tache
router.put('/:id', (req, res) => {
  const { title, description, category, priority, due_date, reminder_time, is_done } = req.body;
  const { id } = req.params;

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Tache non trouvee.' });

  // Si le reminder_time change, reset la notification
  const resetNotif = reminder_time !== undefined && reminder_time !== task.reminder_time ? 0 : task.telegram_notified;

  db.prepare(`
    UPDATE tasks SET
      title = ?,
      description = ?,
      category = ?,
      priority = ?,
      due_date = ?,
      reminder_time = ?,
      is_done = ?,
      telegram_notified = ?
    WHERE id = ?
  `).run(
    title ?? task.title,
    description ?? task.description,
    category ?? task.category,
    priority ?? task.priority,
    due_date !== undefined ? due_date : task.due_date,
    reminder_time !== undefined ? reminder_time : task.reminder_time,
    is_done !== undefined ? (is_done ? 1 : 0) : task.is_done,
    resetNotif,
    id
  );

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  res.json(updated);
});

// DELETE /api/tasks/:id - Supprimer une tache
router.delete('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Tache non trouvee.' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// POST /api/tasks/test-telegram - Tester la connexion Telegram
router.post('/test-telegram', async (req, res) => {
  const result = await sendTestMessage();
  res.json(result);
});

module.exports = router;
