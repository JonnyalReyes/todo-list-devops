// Configuración base de la API
// Por defecto se asume que existe un reverse proxy / ALB que enruta /api hacia el backend.
// Si se ejecuta en local o sin ALB, se puede cambiar a http://localhost:5000 o mediante el input en pantalla.
let API_BASE_URL = localStorage.getItem('DEVOPS_API_URL') || '';

// DOM Elements
const backendDot = document.getElementById('backend-dot');
const backendStatusText = document.getElementById('backend-status-text');
const metaHostname = document.getElementById('meta-hostname');
const metaVersion = document.getElementById('meta-version');
const metaUptime = document.getElementById('meta-uptime');
const metaLatency = document.getElementById('meta-latency');
const taskCounter = document.getElementById('task-counter');
const taskForm = document.getElementById('task-form');
const taskInput = document.getElementById('task-input');
const tasksContainer = document.getElementById('tasks-container');
const btnRefresh = document.getElementById('btn-refresh');
const currentApiUrl = document.getElementById('current-api-url');
const customApiInput = document.getElementById('custom-api-input');
const btnSaveApi = document.getElementById('btn-save-api');

// Initialize API URL display
function updateApiUrlDisplay() {
  currentApiUrl.textContent = API_BASE_URL || '/api (Relativo / ALB)';
  customApiInput.value = API_BASE_URL;
}

// Format seconds to human readable
function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return h > 0 ? `${h}h ${remM}m` : `${m}m ${s}s`;
}

// Fetch Telemetry & Health
async function fetchTelemetry() {
  const start = performance.now();
  try {
    const url = `${API_BASE_URL}/api/info`;
    const res = await fetch(url, { cache: 'no-store' });
    const latency = Math.round(performance.now() - start);

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    // Update UI with telemetry
    backendDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-400';
    backendStatusText.textContent = `Backend Conectado (${data.environment})`;
    backendStatusText.className = 'text-xs font-medium text-emerald-400';

    metaHostname.textContent = data.hostname || 'Desconocido';
    metaVersion.textContent = data.version || '1.0.0';
    metaUptime.textContent = formatUptime(data.uptimeSeconds);
    metaLatency.textContent = `${latency} ms`;

    return true;
  } catch (err) {
    console.warn('Error conectando al backend:', err);
    backendDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    backendStatusText.textContent = 'Backend Desconectado';
    backendStatusText.className = 'text-xs font-medium text-rose-400';

    metaHostname.textContent = 'Sin conexión';
    metaUptime.textContent = '-';
    metaLatency.textContent = '-';
    return false;
  }
}

// Fetch and render tasks
async function loadTasks() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const result = await res.json();
    renderTasks(result.data || []);
  } catch (err) {
    tasksContainer.innerHTML = `
      <div class="bg-rose-900/30 border border-rose-800 rounded-lg p-4 text-center text-rose-300 text-xs">
        <i class="fa-solid fa-triangle-exclamation text-base mb-1"></i>
        <p>No se pudo conectar con el backend en: <code class="font-mono">${API_BASE_URL || window.location.origin}/api/tasks</code></p>
        <p class="mt-1 text-slate-400">Verifica que el contenedor de backend esté ejecutándose o configura la URL en la barra inferior.</p>
      </div>
    `;
    taskCounter.textContent = 'Error';
  }
}

// Render Tasks List
function renderTasks(tasks) {
  taskCounter.textContent = `${tasks.length} ${tasks.length === 1 ? 'tarea' : 'tareas'}`;

  if (tasks.length === 0) {
    tasksContainer.innerHTML = `
      <div class="text-center py-8 text-slate-500 text-xs">
        <i class="fa-regular fa-clipboard text-2xl mb-2 text-slate-600"></i>
        <p>No hay tareas registradas. Agrega una nueva arriba para probar la API.</p>
      </div>
    `;
    return;
  }

  tasksContainer.innerHTML = tasks.map(task => `
    <div class="task-item flex items-center justify-between p-3 bg-slate-900/70 border border-slate-700/70 rounded-lg group hover:border-slate-600">
      <div class="flex items-center gap-3 flex-1 cursor-pointer" onclick="toggleTask(${task.id}, ${!task.done})">
        <input 
          type="checkbox" 
          ${task.done ? 'checked' : ''} 
          class="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-600 focus:ring-0 cursor-pointer pointer-events-none"
        >
        <span class="text-xs sm:text-sm ${task.done ? 'task-done text-slate-400' : 'text-slate-200'}">
          ${escapeHtml(task.title)}
        </span>
      </div>
      <div class="flex items-center gap-3">
        <span class="text-[10px] text-slate-500 hidden sm:inline">
          ${new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button 
          onclick="deleteTask(${task.id})" 
          class="text-slate-500 hover:text-rose-400 p-1.5 transition text-xs opacity-80 group-hover:opacity-100"
          title="Eliminar tarea"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `).join('');
}

// Helper: Escape HTML
function escapeHtml(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// Add Task
taskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });

    if (!res.ok) throw new Error('Error al crear tarea');
    taskInput.value = '';
    await loadTasks();
    await fetchTelemetry();
  } catch (err) {
    alert('No se pudo guardar la tarea. Revisa la consola o la conexión del backend.');
    console.error(err);
  }
});

// Toggle Task
window.toggleTask = async function(id, done) {
  try {
    await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done })
    });
    await loadTasks();
  } catch (err) {
    console.error('Error al actualizar tarea:', err);
  }
};

// Delete Task
window.deleteTask = async function(id) {
  try {
    await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'DELETE'
    });
    await loadTasks();
  } catch (err) {
    console.error('Error al eliminar tarea:', err);
  }
};

// Refresh Button
btnRefresh.addEventListener('click', async () => {
  btnRefresh.classList.add('animate-pulse');
  await Promise.all([fetchTelemetry(), loadTasks()]);
  setTimeout(() => btnRefresh.classList.remove('animate-pulse'), 500);
});

// Save Custom API URL
btnSaveApi.addEventListener('click', () => {
  const val = customApiInput.value.trim();
  API_BASE_URL = val.replace(/\/+$/, ''); // quitar trailing slash
  localStorage.setItem('DEVOPS_API_URL', API_BASE_URL);
  updateApiUrlDisplay();
  fetchTelemetry();
  loadTasks();
});

// Initial boot
updateApiUrlDisplay();
fetchTelemetry();
loadTasks();

// Auto refresh telemetry every 15s
setInterval(fetchTelemetry, 15000);
