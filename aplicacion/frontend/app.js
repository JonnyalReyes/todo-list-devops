// Configuración base de la API:
// En AWS ALB usa ruta relativa '/api'. En local (file:// o puertos de dev), apunta a http://localhost:5000 por defecto.
const defaultLocalApi = (window.location.protocol === 'file:' || window.location.port === '8080' || window.location.port === '3000') 
  ? 'http://localhost:5000' 
  : '';
let API_BASE_URL = localStorage.getItem('DEVOPS_API_URL') ?? defaultLocalApi;

// Estado local de tareas y filtro activo
let allTasks = [];
let currentFilter = 'all';

// DOM Elements - App
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const todoList = document.getElementById('todo-list');
const tasksCount = document.getElementById('tasks-count');
const filterBtns = document.querySelectorAll('.filter-btn');
const headerStatusDot = document.getElementById('header-status-dot');

// DOM Elements - Modal DevOps
const devopsModal = document.getElementById('devops-modal');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCloseModalFooter = document.getElementById('btn-close-modal-footer');
const btnRefreshTelemetry = document.getElementById('btn-refresh-telemetry');
const modalStatusText = document.getElementById('modal-status-text');
const modalHostname = document.getElementById('modal-hostname');
const modalLatency = document.getElementById('modal-latency');
const modalUptime = document.getElementById('modal-uptime');
const apiUrlInput = document.getElementById('api-url-input');
const btnSaveApi = document.getElementById('btn-save-api');

// --- Modal Handlers ---
function openModal() {
  devopsModal.classList.remove('hidden');
  fetchTelemetry();
}

function closeModal() {
  devopsModal.classList.add('hidden');
}

btnOpenModal.addEventListener('click', openModal);
btnCloseModal.addEventListener('click', closeModal);
btnCloseModalFooter.addEventListener('click', closeModal);
devopsModal.addEventListener('click', (e) => {
  if (e.target === devopsModal) closeModal();
});

// Helper: Formato de segundos a tiempo legible
function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return h > 0 ? `${h}h ${remM}m` : `${m}m ${s}s`;
}

// --- Fetch Telemetría (DevOps) ---
async function fetchTelemetry() {
  const start = performance.now();
  try {
    const res = await fetch(`${API_BASE_URL}/api/info`, { cache: 'no-store' });
    const latency = Math.round(performance.now() - start);

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    // Actualizar indicador en el header
    headerStatusDot.className = 'w-2 h-2 rounded-full bg-emerald-500';
    headerStatusDot.title = 'Backend Conectado';

    // Actualizar datos en el modal
    modalStatusText.textContent = 'En Línea (ECS Fargate)';
    modalStatusText.className = 'font-bold text-emerald-600 mt-0.5 inline-block';
    modalHostname.textContent = data.hostname || 'Desconocido';
    modalLatency.textContent = `${latency} ms`;
    modalUptime.textContent = formatUptime(data.uptimeSeconds);
  } catch (err) {
    headerStatusDot.className = 'w-2 h-2 rounded-full bg-rose-500';
    headerStatusDot.title = 'Backend Desconectado';

    modalStatusText.textContent = 'Desconectado';
    modalStatusText.className = 'font-bold text-rose-600 mt-0.5 inline-block';
    modalHostname.textContent = 'Sin conexión';
    modalLatency.textContent = '-';
    modalUptime.textContent = '-';
  }
}

// --- Cargar Tareas desde el Backend ---
async function loadTasks() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const result = await res.json();
    allTasks = result.data || [];
    renderTasks();
  } catch (err) {
    todoList.innerHTML = `
      <div class="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center text-xs space-y-1">
        <p class="font-semibold"><i class="fa-solid fa-circle-exclamation mr-1"></i> No se pudo conectar con el backend</p>
        <p class="text-slate-500">Asegúrate de que el servidor Node.js esté corriendo en <code class="font-mono text-slate-700">${API_BASE_URL || 'localhost:5000'}</code></p>
      </div>
    `;
    tasksCount.textContent = 'Error';
  }
}

// --- Renderizar Lista de Tareas ---
function renderTasks() {
  let filtered = allTasks;
  if (currentFilter === 'pending') {
    filtered = allTasks.filter(t => !t.done);
  } else if (currentFilter === 'completed') {
    filtered = allTasks.filter(t => t.done);
  }

  const pendingCount = allTasks.filter(t => !t.done).length;
  tasksCount.textContent = `${pendingCount} ${pendingCount === 1 ? 'pendiente' : 'pendientes'}`;

  if (filtered.length === 0) {
    todoList.innerHTML = `
      <div class="text-center py-10 text-slate-400 text-sm">
        <i class="fa-regular fa-clipboard text-3xl mb-2 text-slate-300"></i>
        <p>No hay tareas ${currentFilter === 'completed' ? 'completadas' : 'en esta lista'}.</p>
      </div>
    `;
    return;
  }

  todoList.innerHTML = filtered.map(task => `
    <div class="task-item flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-slate-200 group ${task.done ? 'task-completed bg-slate-50/60' : 'bg-white'}">
      <label class="flex items-center gap-2.5 sm:gap-3 flex-1 cursor-pointer select-none min-w-0 mr-2">
        <input 
          type="checkbox" 
          ${task.done ? 'checked' : ''} 
          onchange="toggleTask(${task.id}, this.checked)"
          class="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-pointer shrink-0"
        >
        <span class="text-xs sm:text-sm font-medium ${task.done ? 'text-slate-400' : 'text-slate-700'} break-words">
          ${escapeHtml(task.title)}
        </span>
      </label>
      <button 
        onclick="deleteTask(${task.id})" 
        class="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg transition shrink-0 active:scale-90"
        title="Eliminar tarea"
      >
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
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

// --- Agregar Tarea ---
todoForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = todoInput.value.trim();
  if (!title) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });

    if (!res.ok) throw new Error('Error al agregar');
    todoInput.value = '';
    await loadTasks();
    fetchTelemetry();
  } catch (err) {
    alert('No se pudo guardar la tarea. Revisa la conexión con el backend.');
  }
});

// --- Marcar Tarea como Hecha / Pendiente ---
window.toggleTask = async function(id, done) {
  // Optimistic update
  const task = allTasks.find(t => t.id === id);
  if (task) task.done = done;
  renderTasks();

  try {
    await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done })
    });
  } catch (err) {
    console.error('Error al actualizar tarea:', err);
    loadTasks();
  }
};

// --- Eliminar Tarea ---
window.deleteTask = async function(id) {
  allTasks = allTasks.filter(t => t.id !== id);
  renderTasks();

  try {
    await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'DELETE'
    });
  } catch (err) {
    console.error('Error al eliminar tarea:', err);
    loadTasks();
  }
};

// --- Filtros ---
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => {
      b.className = 'filter-btn px-2.5 py-1 rounded-md font-medium text-slate-600 hover:text-slate-900';
    });
    btn.className = 'filter-btn px-2.5 py-1 rounded-md font-medium bg-white text-indigo-600 shadow-xs';
    currentFilter = btn.dataset.filter;
    renderTasks();
  });
});

// --- Guardar API URL personalizada ---
btnSaveApi.addEventListener('click', () => {
  const val = apiUrlInput.value.trim().replace(/\/+$/, '');
  API_BASE_URL = val;
  localStorage.setItem('DEVOPS_API_URL', API_BASE_URL);
  fetchTelemetry();
  loadTasks();
  alert('Configuración guardada.');
});

btnRefreshTelemetry.addEventListener('click', () => {
  btnRefreshTelemetry.classList.add('animate-pulse');
  fetchTelemetry();
  setTimeout(() => btnRefreshTelemetry.classList.remove('animate-pulse'), 500);
});

// Inicializar
apiUrlInput.value = API_BASE_URL;
fetchTelemetry();
loadTasks();

// Auto refrescar telemetría cada 20s
setInterval(fetchTelemetry, 20000);
