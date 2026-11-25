// Configuración de API
const defaultLocalApi = (window.location.protocol === 'file:' || window.location.port === '8080' || window.location.port === '3000') 
  ? 'http://localhost:5000' 
  : '';
let API_BASE_URL = localStorage.getItem('DEVOPS_API_URL') ?? defaultLocalApi;

// Estado Global
let allFolders = [];
let allTasks = [];
let currentView = 'all'; // 'all', 'status-pendiente', 'status-en_curso', 'status-completado', 'priority-high', o 'folder-<id>'
let activeFolderId = null;
let searchTerm = '';
let selectedFolderColor = '#4f46e5';

// Tarea activa en el modal de edición detallada
let activeEditingTask = null;

// DOM Elements - Sidebar & Layout
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');
const currentViewTitle = document.getElementById('current-view-title');
const currentViewSubtitle = document.getElementById('current-view-subtitle');
const filterDisplayLabel = document.getElementById('filter-display-label');
const statusTaskCount = document.getElementById('status-task-count');
const searchInput = document.getElementById('search-input');
const foldersList = document.getElementById('folders-list');
const tasksContainer = document.getElementById('tasks-container');

// Badges de conteo en Sidebar
const badgeAllCount = document.getElementById('badge-all-count');
const badgePendingCount = document.getElementById('badge-pending-count');
const badgeInProgressCount = document.getElementById('badge-in-progress-count');
const badgeCompletedCount = document.getElementById('badge-completed-count');
const badgeHighCount = document.getElementById('badge-high-count');

// DOM Elements - Formulario Rápido de Tarea
const createTaskForm = document.getElementById('create-task-form');
const taskTitleInput = document.getElementById('task-title-input');
const taskFolderSelect = document.getElementById('task-folder-select');
const taskStatusSelect = document.getElementById('task-status-select');
const taskPrioritySelect = document.getElementById('task-priority-select');
const taskDueDateInput = document.getElementById('task-due-date-input');
const taskDescInput = document.getElementById('task-desc-input');
const btnToggleDescription = document.getElementById('btn-toggle-description');
const descriptionFieldContainer = document.getElementById('description-field-container');
const descToggleText = document.getElementById('desc-toggle-text');
const btnQuickNewTask = document.getElementById('btn-quick-new-task');

// DOM Elements - Modal Detalle & Edición de Tarea (Mini Tareas)
const modalTaskDetail = document.getElementById('modal-task-detail');
const btnCloseDetailModal = document.getElementById('btn-close-detail-modal');
const btnCloseDetailModalBtn = document.getElementById('btn-close-detail-modal-btn');
const btnSaveTaskDetail = document.getElementById('btn-save-task-detail');
const btnDeleteTaskModal = document.getElementById('btn-delete-task-modal');
const detailStatusPill = document.getElementById('detail-status-pill');
const detailPriorityPill = document.getElementById('detail-priority-pill');
const detailTitleInput = document.getElementById('detail-title-input');
const detailStatusSelect = document.getElementById('detail-status-select');
const detailFolderSelect = document.getElementById('detail-folder-select');
const detailPrioritySelect = document.getElementById('detail-priority-select');
const detailDueDateInput = document.getElementById('detail-due-date-input');
const detailDescInput = document.getElementById('detail-desc-input');
const detailSubtasksList = document.getElementById('detail-subtasks-list');
const detailSubtasksProgressText = document.getElementById('detail-subtasks-progress-text');
const detailSubtasksProgressBar = document.getElementById('detail-subtasks-progress-bar');
const newSubtaskInput = document.getElementById('new-subtask-input');
const btnAddSubtask = document.getElementById('btn-add-subtask');

// DOM Elements - Modal Crear Carpeta
const modalNewFolder = document.getElementById('modal-new-folder');
const btnOpenNewFolder = document.getElementById('btn-open-new-folder');
const btnCloseFolderModal = document.getElementById('btn-close-folder-modal');
const btnCancelFolder = document.getElementById('btn-cancel-folder');
const createFolderForm = document.getElementById('create-folder-form');
const folderNameInput = document.getElementById('folder-name-input');
const folderIconSelect = document.getElementById('folder-icon-select');
const colorChoices = document.querySelectorAll('.color-choice');

// DOM Elements - Modal DevOps
const devopsModal = document.getElementById('devops-modal');
const btnOpenDevops = document.getElementById('btn-open-devops');
const btnCloseDevopsModal = document.getElementById('btn-close-devops-modal');
const btnCloseDevopsModalFooter = document.getElementById('btn-close-devops-modal-footer');
const btnRefreshTelemetry = document.getElementById('btn-refresh-telemetry');
const sidebarStatusDot = document.getElementById('sidebar-status-dot');
const modalStatusText = document.getElementById('modal-status-text');
const modalHostname = document.getElementById('modal-hostname');
const modalLatency = document.getElementById('modal-latency');
const modalUptime = document.getElementById('modal-uptime');
const apiUrlInput = document.getElementById('api-url-input');
const btnSaveApi = document.getElementById('btn-save-api');

// ==========================================================
// CONTROL DEL SIDEBAR EN MÓVIL
// ==========================================================
function openSidebar() {
  sidebar.classList.remove('-translate-x-full');
  sidebarOverlay.classList.remove('hidden');
}

function closeSidebar() {
  sidebar.classList.add('-translate-x-full');
  sidebarOverlay.classList.add('hidden');
}

btnToggleSidebar.addEventListener('click', openSidebar);
btnCloseSidebar.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);

// Expandir / Ocultar descripción en creación rápida
let descExpanded = false;
btnToggleDescription.addEventListener('click', () => {
  descExpanded = !descExpanded;
  if (descExpanded) {
    descriptionFieldContainer.classList.remove('hidden');
    descToggleText.textContent = '- Ocultar nota / detalle';
    taskDescInput.focus();
  } else {
    descriptionFieldContainer.classList.add('hidden');
    descToggleText.textContent = '+ Agregar nota / detalle';
  }
});

btnQuickNewTask.addEventListener('click', () => {
  taskTitleInput.focus();
  taskTitleInput.scrollIntoView({ behavior: 'smooth' });
});

// ==========================================================
// MODAL DETALLE / EDICIÓN COMPLETA DE TAREA (MINI TAREAS)
// ==========================================================
function openTaskDetailModal(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  // Clonar para edición en memoria
  activeEditingTask = JSON.parse(JSON.stringify(task));
  if (!Array.isArray(activeEditingTask.subtasks)) {
    activeEditingTask.subtasks = [];
  }

  // Cargar datos en los inputs del modal
  detailTitleInput.value = activeEditingTask.title || '';
  detailDescInput.value = activeEditingTask.description || '';
  detailStatusSelect.value = activeEditingTask.status || 'pendiente';
  detailPrioritySelect.value = activeEditingTask.priority || 'media';
  detailDueDateInput.value = activeEditingTask.dueDate || '';
  newSubtaskInput.value = '';

  // Actualizar opciones del selector de carpetas
  detailFolderSelect.innerHTML = allFolders.map(f => `
    <option value="${f.id}" ${activeEditingTask.folderId === f.id ? 'selected' : ''}>
      ${escapeHtml(f.name)}
    </option>
  `).join('');

  updateDetailBadges();
  renderModalSubtasks();

  modalTaskDetail.classList.remove('hidden');
}

function closeTaskDetailModal() {
  modalTaskDetail.classList.add('hidden');
  activeEditingTask = null;
}

btnCloseDetailModal.addEventListener('click', closeTaskDetailModal);
btnCloseDetailModalBtn.addEventListener('click', closeTaskDetailModal);
modalTaskDetail.addEventListener('click', (e) => {
  if (e.target === modalTaskDetail) closeTaskDetailModal();
});

// Actualizar badges visuales en el modal según selección
function updateDetailBadges() {
  const status = detailStatusSelect.value;
  const priority = detailPrioritySelect.value;

  if (status === 'completado') {
    detailStatusPill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800';
    detailStatusPill.textContent = 'Completado ✅';
  } else if (status === 'en_curso') {
    detailStatusPill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800';
    detailStatusPill.textContent = 'En Curso 🚀';
  } else {
    detailStatusPill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800';
    detailStatusPill.textContent = 'Pendiente ⏳';
  }

  if (priority === 'alta') {
    detailPriorityPill.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700';
    detailPriorityPill.textContent = 'Prioridad Alta 🔥';
  } else if (priority === 'media') {
    detailPriorityPill.className = 'px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700';
    detailPriorityPill.textContent = 'Prioridad Media';
  } else {
    detailPriorityPill.className = 'px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-600';
    detailPriorityPill.textContent = 'Prioridad Baja';
  }
}

detailStatusSelect.addEventListener('change', updateDetailBadges);
detailPrioritySelect.addEventListener('change', updateDetailBadges);

// Renderizar mini tareas dentro del modal
function renderModalSubtasks() {
  if (!activeEditingTask) return;
  const subtasks = activeEditingTask.subtasks || [];
  const total = subtasks.length;
  const completed = subtasks.filter(st => st.done).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  detailSubtasksProgressText.textContent = `${completed}/${total} completadas (${percentage}%)`;
  detailSubtasksProgressBar.style.width = `${percentage}%`;
  detailSubtasksProgressBar.className = percentage === 100 
    ? 'bg-emerald-500 h-1.5 rounded-full transition-all duration-300' 
    : 'bg-indigo-600 h-1.5 rounded-full transition-all duration-300';

  if (subtasks.length === 0) {
    detailSubtasksList.innerHTML = `
      <p class="text-[11px] text-slate-400 italic py-2">No hay mini tareas aún. Agrega una abajo para dividir esta tarea en pasos.</p>
    `;
    return;
  }

  detailSubtasksList.innerHTML = subtasks.map((st, index) => `
    <div class="subtask-item flex items-center justify-between p-2 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 transition group ${st.done ? 'subtask-completed' : ''}">
      <label class="flex items-center gap-2.5 flex-1 cursor-pointer select-none min-w-0 mr-2">
        <input 
          type="checkbox" 
          ${st.done ? 'checked' : ''} 
          onchange="toggleModalSubtask(${index}, this.checked)"
          class="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-pointer shrink-0"
        >
        <span class="text-xs font-medium ${st.done ? 'text-slate-400' : 'text-slate-700'} break-words">
          ${escapeHtml(st.title)}
        </span>
      </label>
      <button 
        type="button" 
        onclick="deleteModalSubtask(${index})" 
        class="text-slate-300 hover:text-rose-500 p-1 rounded transition opacity-0 group-hover:opacity-100 shrink-0"
        title="Eliminar mini tarea"
      >
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  `).join('');
}

// Toggle subtask inside modal
window.toggleModalSubtask = function(index, done) {
  if (activeEditingTask && activeEditingTask.subtasks[index]) {
    activeEditingTask.subtasks[index].done = done;
    renderModalSubtasks();
  }
};

// Delete subtask inside modal
window.deleteModalSubtask = function(index) {
  if (activeEditingTask && activeEditingTask.subtasks) {
    activeEditingTask.subtasks.splice(index, 1);
    renderModalSubtasks();
  }
};

// Add subtask inside modal
function handleAddSubtask() {
  const text = newSubtaskInput.value.trim();
  if (!text || !activeEditingTask) return;

  const newId = activeEditingTask.subtasks.length > 0 
    ? Math.max(...activeEditingTask.subtasks.map(s => s.id || 0)) + 1 
    : 1;

  activeEditingTask.subtasks.push({
    id: newId,
    title: text,
    done: false
  });

  newSubtaskInput.value = '';
  renderModalSubtasks();
  newSubtaskInput.focus();
}

btnAddSubtask.addEventListener('click', handleAddSubtask);
newSubtaskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    handleAddSubtask();
  }
});

// Guardar cambios del modal en el Backend
btnSaveTaskDetail.addEventListener('click', async () => {
  if (!activeEditingTask) return;
  const newTitle = detailTitleInput.value.trim();
  if (!newTitle) {
    alert('El título de la tarea no puede estar vacío.');
    return;
  }

  const updatedPayload = {
    title: newTitle,
    description: detailDescInput.value.trim(),
    status: detailStatusSelect.value,
    folderId: detailFolderSelect.value,
    priority: detailPrioritySelect.value,
    dueDate: detailDueDateInput.value || null,
    subtasks: activeEditingTask.subtasks
  };

  btnSaveTaskDetail.disabled = true;
  btnSaveTaskDetail.textContent = 'Guardando...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${activeEditingTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPayload)
    });

    if (!res.ok) throw new Error('Error al actualizar tarea');

    closeTaskDetailModal();
    await fetchTasks();
    await fetchFolders();
  } catch (err) {
    alert('No se pudieron guardar los cambios. Revisa la conexión.');
  } finally {
    btnSaveTaskDetail.disabled = false;
    btnSaveTaskDetail.textContent = 'Guardar Cambios';
  }
});

// Eliminar tarea desde el modal
btnDeleteTaskModal.addEventListener('click', async () => {
  if (!activeEditingTask) return;
  if (!confirm(`¿Eliminar la tarea "${activeEditingTask.title}"?`)) return;

  const id = activeEditingTask.id;
  closeTaskDetailModal();
  await deleteTask(id);
});

// ==========================================================
// MODAL DE CARPETAS
// ==========================================================
function openFolderModal() {
  modalNewFolder.classList.remove('hidden');
  folderNameInput.value = '';
  folderNameInput.focus();
}

function closeFolderModal() {
  modalNewFolder.classList.add('hidden');
}

btnOpenNewFolder.addEventListener('click', openFolderModal);
btnCloseFolderModal.addEventListener('click', closeFolderModal);
btnCancelFolder.addEventListener('click', closeFolderModal);
modalNewFolder.addEventListener('click', (e) => {
  if (e.target === modalNewFolder) closeFolderModal();
});

colorChoices.forEach(choice => {
  choice.addEventListener('click', () => {
    colorChoices.forEach(c => c.classList.remove('selected'));
    choice.classList.add('selected');
    selectedFolderColor = choice.dataset.color;
  });
});

createFolderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = folderNameInput.value.trim();
  if (!name) return;

  const icon = folderIconSelect.value;
  const color = selectedFolderColor;

  try {
    const res = await fetch(`${API_BASE_URL}/api/folders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color, icon })
    });

    if (!res.ok) throw new Error('Error al crear carpeta');
    closeFolderModal();
    await fetchFolders();
    const created = await res.json();
    if (created.data && created.data.id) {
      selectFolder(created.data.id);
    }
  } catch (err) {
    alert('No se pudo crear la carpeta.');
  }
});

// ==========================================================
// MODAL DEVOPS
// ==========================================================
function openDevopsModal() {
  devopsModal.classList.remove('hidden');
  fetchTelemetry();
}

function closeDevopsModal() {
  devopsModal.classList.add('hidden');
}

btnOpenDevops.addEventListener('click', openDevopsModal);
btnCloseDevopsModal.addEventListener('click', closeDevopsModal);
btnCloseDevopsModalFooter.addEventListener('click', closeDevopsModal);
devopsModal.addEventListener('click', (e) => {
  if (e.target === devopsModal) closeDevopsModal();
});

function formatUptime(seconds) {
  if (!seconds && seconds !== 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  const remM = m % 60;
  return h > 0 ? `${h}h ${remM}m` : `${m}m ${s}s`;
}

async function fetchTelemetry() {
  const start = performance.now();
  try {
    const res = await fetch(`${API_BASE_URL}/api/info`, { cache: 'no-store' });
    const latency = Math.round(performance.now() - start);

    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const data = await res.json();

    sidebarStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-emerald-500';
    sidebarStatusDot.title = 'Backend Conectado en AWS ECS';

    modalStatusText.textContent = 'En Línea (AWS Fargate)';
    modalStatusText.className = 'font-bold text-emerald-600 mt-0.5 inline-block text-xs';
    modalHostname.textContent = data.hostname || 'Desconocido';
    modalLatency.textContent = `${latency} ms`;
    modalUptime.textContent = formatUptime(data.uptimeSeconds);
  } catch (err) {
    sidebarStatusDot.className = 'w-2.5 h-2.5 rounded-full bg-rose-500';
    sidebarStatusDot.title = 'Backend Desconectado';

    modalStatusText.textContent = 'Desconectado';
    modalStatusText.className = 'font-bold text-rose-600 mt-0.5 inline-block text-xs';
    modalHostname.textContent = 'Sin conexión';
    modalLatency.textContent = '-';
    modalUptime.textContent = '-';
  }
}

btnRefreshTelemetry.addEventListener('click', () => {
  btnRefreshTelemetry.classList.add('animate-pulse');
  fetchTelemetry();
  setTimeout(() => btnRefreshTelemetry.classList.remove('animate-pulse'), 500);
});

btnSaveApi.addEventListener('click', () => {
  const val = apiUrlInput.value.trim().replace(/\/+$/, '');
  API_BASE_URL = val;
  localStorage.setItem('DEVOPS_API_URL', API_BASE_URL);
  fetchTelemetry();
  fetchFolders();
  fetchTasks();
  alert('Configuración guardada.');
});

// ==========================================================
// CARPETAS
// ==========================================================
async function fetchFolders() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/folders`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al obtener carpetas');
    const result = await res.json();
    allFolders = result.data || [];
    renderFoldersList();
    renderFolderSelectOptions();
  } catch (err) {
    console.error('Error cargando carpetas:', err);
  }
}

function renderFoldersList() {
  if (allFolders.length === 0) {
    foldersList.innerHTML = `<p class="px-3 py-2 text-xs text-slate-400 italic">No hay carpetas creadas.</p>`;
    return;
  }

  foldersList.innerHTML = allFolders.map(folder => {
    const isActive = activeFolderId === folder.id;
    return `
      <div class="folder-item group flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${isActive ? 'active' : 'text-slate-600 hover:bg-slate-100'}" onclick="selectFolder('${folder.id}')">
        <div class="flex items-center gap-2.5 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${folder.color};"></span>
          <i class="fa-solid ${folder.icon || 'fa-folder'} text-slate-400 w-3.5 text-center text-xs"></i>
          <span class="truncate">${escapeHtml(folder.name)}</span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 group-hover:text-slate-600">
            ${folder.pendingCount > 0 ? folder.pendingCount : ''}
          </span>
          <button 
            onclick="event.stopPropagation(); deleteFolder('${folder.id}', '${escapeHtml(folder.name)}')" 
            class="text-slate-300 hover:text-rose-500 p-1 rounded transition opacity-0 group-hover:opacity-100"
            title="Eliminar carpeta"
          >
            <i class="fa-solid fa-trash-can text-[11px]"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function renderFolderSelectOptions() {
  taskFolderSelect.innerHTML = allFolders.map(f => `
    <option value="${f.id}" ${activeFolderId === f.id ? 'selected' : ''}>
      ${escapeHtml(f.name)}
    </option>
  `).join('');
}

window.selectFolder = function(folderId) {
  activeFolderId = folderId;
  currentView = `folder-${folderId}`;

  document.querySelectorAll('.nav-view-btn').forEach(btn => btn.classList.remove('active'));
  renderFoldersList();

  const folder = allFolders.find(f => f.id === folderId);
  if (folder) {
    currentViewTitle.innerHTML = `
      <span class="w-3 h-3 rounded-full inline-block mr-1" style="background-color: ${folder.color};"></span>
      <span>${escapeHtml(folder.name)}</span>
    `;
    currentViewSubtitle.textContent = `Tareas clasificadas en la carpeta ${folder.name}`;
    filterDisplayLabel.textContent = `Carpeta: ${folder.name}`;
  }

  closeSidebar();
  renderTasks();
};

window.deleteFolder = async function(id, name) {
  if (!confirm(`¿Eliminar la carpeta "${name}"? Las tareas asociadas se conservarán.`)) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/folders/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar');

    if (activeFolderId === id) {
      activeFolderId = null;
      currentView = 'all';
      updateViewHeaders('all');
    }

    await fetchFolders();
    await fetchTasks();
  } catch (err) {
    alert('No se pudo eliminar la carpeta.');
  }
};

// ==========================================================
// VISTAS RÁPIDAS
// ==========================================================
document.querySelectorAll('.nav-view-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-view-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFolderId = null;
    currentView = btn.dataset.view;

    updateViewHeaders(currentView);
    renderFoldersList();
    closeSidebar();
    renderTasks();
  });
});

function updateViewHeaders(view) {
  if (view === 'all') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-inbox text-indigo-600 text-xs sm:text-sm"></i><span>Todas las tareas</span>`;
    currentViewSubtitle.textContent = `Visualizando todo el registro de tareas y notas`;
    filterDisplayLabel.textContent = `Todas las tareas`;
  } else if (view === 'status-pendiente') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-clock text-amber-500 text-xs sm:text-sm"></i><span>Tareas Pendientes</span>`;
    currentViewSubtitle.textContent = `Tareas que requieren tu atención`;
    filterDisplayLabel.textContent = `Pendientes ⏳`;
  } else if (view === 'status-en_curso') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-spinner fa-spin-pulse text-sky-500 text-xs sm:text-sm"></i><span>Tareas En Curso</span>`;
    currentViewSubtitle.textContent = `Actividades en progreso actualmente`;
    filterDisplayLabel.textContent = `En Curso 🚀`;
  } else if (view === 'status-completado') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-xs sm:text-sm"></i><span>Tareas Completadas</span>`;
    currentViewSubtitle.textContent = `Historial de actividades finalizadas`;
    filterDisplayLabel.textContent = `Completadas ✅`;
  } else if (view === 'priority-high') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-fire text-rose-500 text-xs sm:text-sm"></i><span>Prioridad Alta</span>`;
    currentViewSubtitle.textContent = `Tareas críticas y urgentes`;
    filterDisplayLabel.textContent = `Alta Prioridad 🔥`;
  }
}

searchInput.addEventListener('input', (e) => {
  searchTerm = e.target.value.trim().toLowerCase();
  renderTasks();
});

// ==========================================================
// TAREAS / NOTAS
// ==========================================================
async function fetchTasks() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Error al cargar tareas');
    const result = await res.json();
    allTasks = result.data || [];

    updateBadges();
    renderTasks();
  } catch (err) {
    tasksContainer.innerHTML = `
      <div class="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs text-center space-y-1">
        <p class="font-semibold"><i class="fa-solid fa-triangle-exclamation mr-1"></i> No se pudo sincronizar con el backend</p>
        <p class="text-slate-500">Verifica que el servicio esté corriendo en ECS o localmente.</p>
      </div>
    `;
  }
}

function updateBadges() {
  const allCount = allTasks.length;
  const pendingCount = allTasks.filter(t => t.status === 'pendiente').length;
  const inProgressCount = allTasks.filter(t => t.status === 'en_curso').length;
  const completedCount = allTasks.filter(t => t.status === 'completado').length;
  const highCount = allTasks.filter(t => t.priority === 'alta' && t.status !== 'completado').length;

  badgeAllCount.textContent = allCount;
  badgePendingCount.textContent = pendingCount;
  badgeInProgressCount.textContent = inProgressCount;
  badgeCompletedCount.textContent = completedCount;
  badgeHighCount.textContent = highCount;
}

function renderTasks() {
  let filtered = [...allTasks];

  // Filtro por Vista o Carpeta
  if (currentView === 'status-pendiente') {
    filtered = filtered.filter(t => t.status === 'pendiente');
  } else if (currentView === 'status-en_curso') {
    filtered = filtered.filter(t => t.status === 'en_curso');
  } else if (currentView === 'status-completado') {
    filtered = filtered.filter(t => t.status === 'completado');
  } else if (currentView === 'priority-high') {
    filtered = filtered.filter(t => t.priority === 'alta');
  } else if (currentView.startsWith('folder-')) {
    const fId = currentView.replace('folder-', '');
    filtered = filtered.filter(t => t.folderId === fId);
  }

  // Filtro por Búsqueda
  if (searchTerm) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(searchTerm) || 
      (t.description && t.description.toLowerCase().includes(searchTerm)) ||
      (t.subtasks && t.subtasks.some(st => st.title.toLowerCase().includes(searchTerm)))
    );
  }

  statusTaskCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'tarea' : 'tareas'}`;

  if (filtered.length === 0) {
    tasksContainer.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 space-y-2">
        <i class="fa-regular fa-folder-open text-3xl text-slate-300"></i>
        <p class="text-xs font-medium">No se encontraron tareas en esta sección.</p>
        <p class="text-[11px] text-slate-400">Agrega una nueva tarea arriba para comenzar.</p>
      </div>
    `;
    return;
  }

  tasksContainer.innerHTML = filtered.map(task => {
    const folder = allFolders.find(f => f.id === task.folderId);
    const folderName = folder ? folder.name : 'General';
    const folderColor = folder ? folder.color : '#6366f1';

    // Badge de Estado
    let statusBadge = '';
    if (task.status === 'completado') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1"><i class="fa-solid fa-check text-[9px]"></i>Completada</span>`;
    } else if (task.status === 'en_curso') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200/60 flex items-center gap-1"><i class="fa-solid fa-spinner fa-spin-pulse text-[9px]"></i>En Curso</span>`;
    } else {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center gap-1"><i class="fa-solid fa-clock text-[9px]"></i>Pendiente</span>`;
    }

    // Badge de Prioridad
    let priorityBadge = '';
    if (task.priority === 'alta') {
      priorityBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100"><i class="fa-solid fa-fire text-[9px] mr-1"></i>Alta</span>`;
    } else if (task.priority === 'media') {
      priorityBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">Media</span>`;
    } else {
      priorityBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">Baja</span>`;
    }

    // Badge de Fecha de Vencimiento
    let dueDatePill = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate + 'T00:00:00');
      const isPast = due < new Date().setHours(0,0,0,0);
      dueDatePill = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${isPast && task.status !== 'completado' ? 'bg-rose-100 text-rose-800 font-semibold' : 'bg-slate-100 text-slate-600'}">
          <i class="fa-regular fa-calendar text-[9px]"></i>
          <span>Vence: ${due.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </span>
      `;
    }

    // Resumen de Mini Tareas
    let subtasksBadge = '';
    const subtasks = task.subtasks || [];
    if (subtasks.length > 0) {
      const compCount = subtasks.filter(s => s.done).length;
      const pct = Math.round((compCount / subtasks.length) * 100);
      subtasksBadge = `
        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-medium border border-indigo-100">
          <i class="fa-solid fa-list-check text-[9px]"></i>
          <span>${compCount}/${subtasks.length} mini tareas</span>
          <div class="w-10 bg-indigo-200 rounded-full h-1 overflow-hidden ml-1">
            <div class="bg-indigo-600 h-1 rounded-full" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }

    const isDone = task.status === 'completado';

    return `
      <div 
        class="task-card bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-4 flex items-start gap-3 ${isDone ? 'task-completed bg-slate-50/70' : ''}" 
        onclick="openTaskDetailModal(${task.id})"
      >
        <!-- Checkbox Rápido de Completar -->
        <input 
          type="checkbox" 
          ${isDone ? 'checked' : ''} 
          onclick="event.stopPropagation()"
          onchange="toggleTaskQuick(${task.id}, this.checked)"
          class="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-0 cursor-pointer shrink-0"
        >

        <!-- Contenido Central de la Tarea -->
        <div class="flex-1 min-w-0 space-y-1.5">
          
          <!-- Badges de Carpeta, Estado, Prioridad y Fecha -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-white shadow-2xs" style="background-color: ${folderColor};">
              <i class="fa-solid ${folder ? folder.icon : 'fa-folder'} text-[9px]"></i>
              <span>${escapeHtml(folderName)}</span>
            </span>
            ${statusBadge}
            ${priorityBadge}
            ${dueDatePill}
            ${subtasksBadge}
          </div>

          <!-- Título -->
          <h4 class="task-title text-sm font-semibold text-slate-800 break-words leading-snug">
            ${escapeHtml(task.title)}
          </h4>

          <!-- Descripción / Detalle de Nota -->
          ${task.description ? `
            <p class="text-xs text-slate-500 break-words line-clamp-2 leading-relaxed bg-slate-50/80 p-2 rounded-xl border border-slate-100 font-sans">
              ${escapeHtml(task.description)}
            </p>
          ` : ''}

          <div class="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
            <span><i class="fa-regular fa-clock mr-1 text-[9px]"></i>${new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span class="text-indigo-600 font-medium hover:underline flex items-center gap-1">
              <span>Editar & pasos</span> <i class="fa-solid fa-chevron-right text-[8px]"></i>
            </span>
          </div>
        </div>

        <!-- Botón Eliminar Rápido -->
        <button 
          onclick="event.stopPropagation(); deleteTask(${task.id})" 
          class="text-slate-300 hover:text-rose-500 p-1.5 rounded-lg transition shrink-0 active:scale-90"
          title="Eliminar tarea"
        >
          <i class="fa-solid fa-trash-can text-xs"></i>
        </button>

      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

// ==========================================================
// CREAR TAREA RÁPIDA
// ==========================================================
createTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = taskTitleInput.value.trim();
  if (!title) return;

  const folderId = taskFolderSelect.value;
  const status = taskStatusSelect.value;
  const priority = taskPrioritySelect.value;
  const dueDate = taskDueDateInput.value || null;
  const description = taskDescInput.value.trim();

  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, folderId, status, priority, dueDate, subtasks: [] })
    });

    if (!res.ok) throw new Error('Error al crear tarea');

    taskTitleInput.value = '';
    taskDescInput.value = '';
    taskDueDateInput.value = '';
    if (descExpanded) {
      descExpanded = false;
      descriptionFieldContainer.classList.add('hidden');
      descToggleText.textContent = '+ Agregar nota / detalle';
    }

    await fetchTasks();
    await fetchFolders();
    fetchTelemetry();
  } catch (err) {
    alert('No se pudo guardar la tarea.');
  }
});

// Toggle Rápido de Completado
window.toggleTaskQuick = async function(id, isChecked) {
  const newStatus = isChecked ? 'completado' : 'pendiente';
  const task = allTasks.find(t => t.id === id);
  if (task) {
    task.status = newStatus;
    task.done = isChecked;
  }
  renderTasks();
  updateBadges();

  try {
    await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, done: isChecked })
    });
    fetchFolders();
  } catch (err) {
    fetchTasks();
  }
};

// Eliminar Tarea
window.deleteTask = async function(id) {
  allTasks = allTasks.filter(t => t.id !== id);
  renderTasks();
  updateBadges();

  try {
    await fetch(`${API_BASE_URL}/api/tasks/${id}`, { method: 'DELETE' });
    fetchFolders();
  } catch (err) {
    fetchTasks();
  }
};

// ==========================================================
// INICIALIZACIÓN
// ==========================================================
apiUrlInput.value = API_BASE_URL;
fetchTelemetry();
fetchFolders().then(() => {
  fetchTasks();
});

setInterval(fetchTelemetry, 25000);
