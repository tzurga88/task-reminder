const API = '/api/tasks';

let currentFilter = 'pending';
let currentPriority = '';
let currentCategory = '';
let allCategories = [];

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  loadTasks();

  document.getElementById('btn-add').addEventListener('click', () => openModal());
  document.getElementById('btn-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.querySelector('.modal-backdrop').addEventListener('click', closeModal);
  document.getElementById('task-form').addEventListener('submit', saveTask);
  document.getElementById('btn-test-telegram').addEventListener('click', testTelegram);

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadTasks();
    });
  });

  document.getElementById('filter-priority').addEventListener('change', e => {
    currentPriority = e.target.value;
    loadTasks();
  });

  document.getElementById('filter-category').addEventListener('change', e => {
    currentCategory = e.target.value;
    loadTasks();
  });
});

// --- API calls ---
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur serveur');
  }
  return res.json();
}

// --- Load tasks ---
async function loadTasks() {
  const list = document.getElementById('task-list');
  const params = new URLSearchParams();
  if (currentFilter === 'pending') params.set('done', 'false');
  if (currentFilter === 'done') params.set('done', 'true');
  if (currentPriority) params.set('priority', currentPriority);
  if (currentCategory) params.set('category', currentCategory);

  try {
    const tasks = await api('GET', `${API}?${params}`);
    renderTasks(tasks);
  } catch (e) {
    list.innerHTML = `<div class="empty-state"><p>Erreur de chargement.</p></div>`;
  }
}

async function loadCategories() {
  try {
    allCategories = await api('GET', `${API}/categories`);
    const sel = document.getElementById('filter-category');
    const datalist = document.getElementById('categories-list');
    sel.innerHTML = '<option value="">Toutes les categories</option>' +
      allCategories.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
    datalist.innerHTML = allCategories.map(c => `<option value="${esc(c)}">`).join('');
  } catch {}
}

// --- Render ---
function renderTasks(tasks) {
  const list = document.getElementById('task-list');
  if (tasks.length === 0) {
    list.innerHTML = `<div class="empty-state"><p>Aucune tache ici.</p><small>Cliquez sur "+ Nouvelle tache" pour commencer.</small></div>`;
    return;
  }

  list.innerHTML = tasks.map(t => taskCard(t)).join('');

  list.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('click', () => toggleDone(cb.dataset.id, cb.classList.contains('checked')));
  });
  list.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openModal(JSON.parse(btn.dataset.task)));
  });
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
}

function taskCard(t) {
  const now = new Date();
  const due = t.due_date ? new Date(t.due_date) : null;
  const isOverdue = due && !t.is_done && due < now;

  const priorityLabel = { high: 'Haute', medium: 'Moyenne', low: 'Basse' };

  return `
    <div class="task-card ${t.is_done ? 'done' : ''} ${isOverdue ? 'overdue' : ''}">
      <div class="task-checkbox ${t.is_done ? 'checked' : ''}" data-id="${t.id}"></div>
      <div class="task-body">
        <div class="task-header">
          <span class="task-title">${esc(t.title)}</span>
          <span class="badge badge-${t.priority}">${priorityLabel[t.priority] || t.priority}</span>
          ${t.category ? `<span class="badge badge-category">${esc(t.category)}</span>` : ''}
        </div>
        ${t.description ? `<div class="task-desc">${esc(t.description)}</div>` : ''}
        <div class="task-meta">
          ${t.due_date ? `<span>Echeance: ${formatDate(t.due_date)}</span>` : ''}
          ${t.reminder_time ? `<span>Rappel: ${formatDate(t.reminder_time)}${t.telegram_notified ? ' (envoye)' : ''}</span>` : ''}
        </div>
      </div>
      <div class="task-actions">
        <button class="btn btn-secondary btn-task btn-edit" data-task='${JSON.stringify(t).replace(/'/g, "&#39;")}'>Editer</button>
        <button class="btn btn-danger btn-task btn-delete" data-id="${t.id}">Sup.</button>
      </div>
    </div>
  `;
}

// --- Modal ---
function openModal(task = null) {
  document.getElementById('modal-title').textContent = task ? 'Modifier la tache' : 'Nouvelle tache';
  document.getElementById('task-id').value = task ? task.id : '';
  document.getElementById('input-title').value = task ? task.title : '';
  document.getElementById('input-desc').value = task ? task.description : '';
  document.getElementById('input-category').value = task ? task.category : 'General';
  document.getElementById('input-priority').value = task ? task.priority : 'medium';
  document.getElementById('input-due').value = task && task.due_date ? toInputValue(task.due_date) : '';
  document.getElementById('input-reminder').value = task && task.reminder_time ? toInputValue(task.reminder_time) : '';
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('input-title').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('task-form').reset();
}

// --- Save task ---
async function saveTask(e) {
  e.preventDefault();
  const id = document.getElementById('task-id').value;

  const data = {
    title: document.getElementById('input-title').value.trim(),
    description: document.getElementById('input-desc').value.trim(),
    category: document.getElementById('input-category').value.trim() || 'General',
    priority: document.getElementById('input-priority').value,
    due_date: document.getElementById('input-due').value || null,
    reminder_time: document.getElementById('input-reminder').value || null,
  };

  try {
    if (id) {
      await api('PUT', `${API}/${id}`, data);
      toast('Tache mise a jour !', 'success');
    } else {
      await api('POST', API, data);
      toast('Tache creee !', 'success');
    }
    closeModal();
    loadTasks();
    loadCategories();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// --- Toggle done ---
async function toggleDone(id, isDone) {
  try {
    await api('PUT', `${API}/${id}`, { is_done: !isDone });
    loadTasks();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// --- Delete ---
async function deleteTask(id) {
  if (!confirm('Supprimer cette tache ?')) return;
  try {
    await api('DELETE', `${API}/${id}`);
    toast('Tache supprimee.', 'info');
    loadTasks();
    loadCategories();
  } catch (err) {
    toast(err.message, 'error');
  }
}

// --- Test Telegram ---
async function testTelegram() {
  const btn = document.getElementById('btn-test-telegram');
  btn.disabled = true;
  btn.textContent = 'Envoi...';
  try {
    const res = await api('POST', `${API}/test-telegram`);
    if (res.success) toast('Message Telegram envoye !', 'success');
    else toast('Erreur: ' + res.error, 'error');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Tester Telegram';
  }
}

// --- Helpers ---
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(str) {
  if (!str) return '';
  return new Date(str).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toInputValue(str) {
  if (!str) return '';
  // Convert to YYYY-MM-DDTHH:MM
  const d = new Date(str);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}
