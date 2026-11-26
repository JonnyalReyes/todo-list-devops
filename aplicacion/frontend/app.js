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

// Sesión y Autenticación
let currentUser = null; // { id, username, role, isAdmin, token }
let authMode = 'login'; // 'login' o 'register'

// Headers de autenticación para aislar notas por usuario
function getAuthHeaders(includeContentType = true) {
  const headers = {};
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  if (currentUser) {
    headers['x-user-name'] = currentUser.username;
    headers['x-user-id'] = currentUser.id;
    if (currentUser.token) {
      headers['Authorization'] = `Bearer ${currentUser.token}`;
    }
  }
  return headers;
}

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

// DOM Elements - Modal Nueva Tarea
const modalNewTask = document.getElementById('modal-new-task');
const btnCloseNewTaskModal = document.getElementById('btn-close-new-task-modal');
const btnCancelNewTaskModal = document.getElementById('btn-cancel-new-task-modal');
const btnHeaderNewTask = document.getElementById('btn-header-new-task');
const btnFabNewTask = document.getElementById('btn-fab-new-task');
const newTaskForm = document.getElementById('new-task-form');
const newTaskTitleInput = document.getElementById('new-task-title-input');
const newTaskFolderSelect = document.getElementById('new-task-folder-select');
const newTaskStatusSelect = document.getElementById('new-task-status-select');
const newTaskPrioritySelect = document.getElementById('new-task-priority-select');
const newTaskDueDateInput = document.getElementById('new-task-due-date-input');
const newTaskDescInput = document.getElementById('new-task-desc-input');
const btnSubmitNewTask = document.getElementById('btn-submit-new-task');

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

// DOM Elements - Autenticación & Sesión
const modalAuth = document.getElementById('modal-auth');
const btnOpenLogin = document.getElementById('btn-open-login');
const btnCloseAuthModal = document.getElementById('btn-close-auth-modal');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const authForm = document.getElementById('auth-form');
const authModalTitle = document.getElementById('auth-modal-title');
const authModalSubtitle = document.getElementById('auth-modal-subtitle');
const authErrorBox = document.getElementById('auth-error-box');
const authErrorText = document.getElementById('auth-error-text');
const authUsernameInput = document.getElementById('auth-username-input');
const authPasswordInput = document.getElementById('auth-password-input');
const btnAuthSubmitLabel = document.getElementById('btn-auth-submit-label');
const btnTogglePasswordVisibility = document.getElementById('btn-toggle-password-visibility');

// Topbar User Elements
const topbarLoggedInView = document.getElementById('topbar-logged-in-view');
const topbarAvatarInitial = document.getElementById('topbar-avatar-initial');
const topbarUserName = document.getElementById('topbar-user-name');
const topbarUserRoleBadge = document.getElementById('topbar-user-role-badge');
const btnTopbarLogout = document.getElementById('btn-topbar-logout');

// Sidebar User Elements
const sidebarAvatarInitial = document.getElementById('sidebar-avatar-initial');
const sidebarUserName = document.getElementById('sidebar-user-name');
const sidebarUserRole = document.getElementById('sidebar-user-role');
const btnSidebarAuth = document.getElementById('btn-sidebar-auth');
const sidebarAuthIcon = document.getElementById('sidebar-auth-icon');

// DOM Elements - Modo Oscuro / Claro
const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const themeToggleIconWrap = document.getElementById('theme-toggle-icon-wrap');
const themeToggleLabel = document.getElementById('theme-toggle-label');
const themeToggleSwitch = document.getElementById('theme-toggle-switch');
const themeToggleDot = document.getElementById('theme-toggle-dot');

function updateThemeUI(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-sun text-xs text-amber-400';
    if (themeToggleIconWrap) themeToggleIconWrap.className = 'w-6 h-6 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center shrink-0 transition';
    if (themeToggleLabel) themeToggleLabel.textContent = 'Modo Claro';
    if (themeToggleSwitch) themeToggleSwitch.className = 'w-8 h-4.5 bg-indigo-600 rounded-full p-0.5 transition flex items-center';
    if (themeToggleDot) themeToggleDot.className = 'w-3.5 h-3.5 rounded-full bg-white shadow-xs transform transition duration-200 translate-x-3.5';
    if (btnThemeToggle) btnThemeToggle.title = 'Cambiar a Modo Claro';
  } else {
    document.documentElement.classList.remove('dark');
    if (themeToggleIcon) themeToggleIcon.className = 'fa-solid fa-moon text-xs text-indigo-600';
    if (themeToggleIconWrap) themeToggleIconWrap.className = 'w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 transition';
    if (themeToggleLabel) themeToggleLabel.textContent = 'Modo Oscuro';
    if (themeToggleSwitch) themeToggleSwitch.className = 'w-8 h-4.5 bg-slate-200 rounded-full p-0.5 transition flex items-center';
    if (themeToggleDot) themeToggleDot.className = 'w-3.5 h-3.5 rounded-full bg-white shadow-xs transform transition duration-200 translate-x-0';
    if (btnThemeToggle) btnThemeToggle.title = 'Cambiar a Modo Oscuro';
  }
}

function initTheme() {
  const savedTheme = localStorage.getItem('TASKFLOW_THEME');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
  updateThemeUI(isDark);
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const newTheme = isDark ? 'light' : 'dark';
  localStorage.setItem('TASKFLOW_THEME', newTheme);
  updateThemeUI(!isDark);
}

if (btnThemeToggle) {
  btnThemeToggle.addEventListener('click', toggleTheme);
}

// DOM Elements - Modal de Confirmación y Alertas Personalizado
const modalConfirm = document.getElementById('modal-confirm');
const confirmModalTitle = document.getElementById('confirm-modal-title');
const confirmModalMessage = document.getElementById('confirm-modal-message');
const confirmModalIcon = document.getElementById('confirm-modal-icon');
const confirmModalIconContainer = document.getElementById('confirm-modal-icon-container');
const btnConfirmCancel = document.getElementById('btn-confirm-cancel');
const btnConfirmAccept = document.getElementById('btn-confirm-accept');

function showConfirm(messageOrOptions, options = {}) {
  return new Promise((resolve) => {
    let title = 'Confirmar acción';
    let message = '';
    let confirmText = 'Aceptar';
    let cancelText = 'Cancelar';
    let isDanger = false;
    let showCancel = true;
    let icon = null;

    if (typeof messageOrOptions === 'string') {
      message = messageOrOptions;
      if (options.title) title = options.title;
      else if (message.toLowerCase().includes('eliminar')) title = 'Eliminar';
      else if (message.toLowerCase().includes('cerrar')) title = 'Cerrar Sesión';

      if (options.confirmText) confirmText = options.confirmText;
      if (options.cancelText) cancelText = options.cancelText;
      if (options.showCancel !== undefined) showCancel = options.showCancel;
      if (options.icon) icon = options.icon;
      isDanger = options.isDanger !== undefined ? options.isDanger : (message.toLowerCase().includes('eliminar') || message.toLowerCase().includes('cerrar'));
    } else if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      const opts = messageOrOptions;
      message = opts.message || '';
      title = opts.title || (message.toLowerCase().includes('eliminar') ? 'Eliminar' : (message.toLowerCase().includes('cerrar') ? 'Cerrar Sesión' : 'Confirmar acción'));
      confirmText = opts.confirmText || 'Aceptar';
      cancelText = opts.cancelText || 'Cancelar';
      if (opts.showCancel !== undefined) showCancel = opts.showCancel;
      icon = opts.icon || null;
      isDanger = opts.isDanger !== undefined ? opts.isDanger : (message.toLowerCase().includes('eliminar') || message.toLowerCase().includes('cerrar'));
    }

    confirmModalTitle.textContent = title;
    confirmModalMessage.textContent = message;
    btnConfirmAccept.textContent = confirmText;
    btnConfirmCancel.textContent = cancelText;

    if (showCancel) {
      btnConfirmCancel.classList.remove('hidden');
    } else {
      btnConfirmCancel.classList.add('hidden');
    }

    if (isDanger) {
      btnConfirmAccept.className = 'px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs shadow-rose-200 transition active:scale-95';
      confirmModalIconContainer.className = 'w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-lg shrink-0';
      confirmModalIcon.className = icon || (message.toLowerCase().includes('cerrar') ? 'fa-solid fa-right-from-bracket' : 'fa-solid fa-trash-can');
    } else {
      btnConfirmAccept.className = 'px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-200 transition active:scale-95';
      confirmModalIconContainer.className = 'w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg shrink-0';
      confirmModalIcon.className = icon || 'fa-solid fa-circle-question';
    }

    function cleanup() {
      modalConfirm.classList.add('hidden');
      btnConfirmCancel.removeEventListener('click', onCancel);
      btnConfirmAccept.removeEventListener('click', onAccept);
      modalConfirm.removeEventListener('click', onBackdrop);
      window.removeEventListener('keydown', onKeyDown);
    }

    function onCancel() {
      cleanup();
      resolve(false);
    }

    function onAccept() {
      cleanup();
      resolve(true);
    }

    function onBackdrop(e) {
      if (e.target === modalConfirm) {
        cleanup();
        resolve(false);
      }
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        cleanup();
        resolve(false);
      } else if (e.key === 'Enter') {
        cleanup();
        resolve(true);
      }
    }

    btnConfirmCancel.addEventListener('click', onCancel);
    btnConfirmAccept.addEventListener('click', onAccept);
    modalConfirm.addEventListener('click', onBackdrop);
    window.addEventListener('keydown', onKeyDown);

    modalConfirm.classList.remove('hidden');
    setTimeout(() => {
      if (showCancel) {
        btnConfirmCancel.focus();
      } else {
        btnConfirmAccept.focus();
      }
    }, 50);
  });
}

function showAlert(message, title = 'Atención', icon = null) {
  return showConfirm(message, {
    title,
    confirmText: 'Entendido',
    showCancel: false,
    isDanger: false,
    icon: icon || 'fa-solid fa-circle-info'
  });
}

// ==========================================================
// SISTEMA DE DROPDOWNS MODERNOS
// ==========================================================
function setupDropdown(containerId, onSelectCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const trigger = container.querySelector('.dropdown-trigger');
  const menu = container.querySelector('.dropdown-menu');
  const hiddenInput = container.querySelector('input[type="hidden"]');
  const label = container.querySelector('.trigger-label');

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = menu.classList.contains('hidden');

    // Cerrar otros dropdowns abiertos
    document.querySelectorAll('.dropdown-menu').forEach(m => {
      if (m !== menu) m.classList.add('hidden');
    });

    if (willOpen) {
      menu.classList.remove('hidden');
      adjustDropdownPosition(menu, trigger);
    } else {
      menu.classList.add('hidden');
    }
  });

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item');
    if (!item) return;
    e.stopPropagation();

    const value = item.dataset.value;
    const itemText = item.querySelector('span:last-child') ? item.querySelector('span:last-child').textContent : item.textContent.trim();

    if (hiddenInput) hiddenInput.value = value;
    if (label) label.textContent = itemText;

    // Actualizar indicador de color/estado si aplica
    const itemDot = item.querySelector('.status-dot, .folder-dot, .priority-dot, span[style*="background-color"]');
    const triggerDot = container.querySelector('.status-dot, .folder-dot, .priority-dot');
    if (itemDot && triggerDot) {
      if (itemDot.style.backgroundColor) {
        triggerDot.style.backgroundColor = itemDot.style.backgroundColor;
      } else {
        triggerDot.className = itemDot.className;
      }
    }

    // Actualizar icono FontAwesome si tiene indicador de icono
    const itemIcon = item.querySelector('i');
    const triggerIcon = container.querySelector('.folder-icon-indicator');
    if (itemIcon && triggerIcon) {
      triggerIcon.className = itemIcon.className + ' folder-icon-indicator w-4 text-center shrink-0';
    }

    menu.classList.add('hidden');
    if (typeof onSelectCallback === 'function') {
      onSelectCallback(value, itemText);
    }
  });
}

function adjustDropdownPosition(menu, trigger) {
  if (!menu) return;

  // Restaurar estilos inline para medir su tamaño y posición natural
  menu.style.left = '';
  menu.style.right = '';
  menu.style.top = '';
  menu.style.bottom = '';
  menu.style.marginTop = '';
  menu.style.marginBottom = '';
  menu.style.transform = '';

  let menuRect = menu.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

  // 1. Si se sale o corta por el borde izquierdo (< 8px)
  if (menuRect.left < 8) {
    menu.style.left = '0px';
    menu.style.right = 'auto';
    menuRect = menu.getBoundingClientRect();
    if (menuRect.left < 8) {
      menu.style.transform = `translateX(${8 - menuRect.left}px)`;
    }
  }

  // 2. Si se sale o corta por el borde derecho (> viewport - 8px)
  menuRect = menu.getBoundingClientRect();
  if (menuRect.right > viewportWidth - 8) {
    menu.style.right = '0px';
    menu.style.left = 'auto';
    menuRect = menu.getBoundingClientRect();
    if (menuRect.right > viewportWidth - 8) {
      menu.style.transform = `translateX(${viewportWidth - 8 - menuRect.right}px)`;
    }
    // Asegurar que no se corte por la izquierda al corregir hacia la izquierda
    menuRect = menu.getBoundingClientRect();
    if (menuRect.left < 8) {
      menu.style.left = '0px';
      menu.style.transform = `translateX(${8 - menuRect.left}px)`;
    }
  }

  // 3. Si se sale por abajo de la pantalla, abrir hacia arriba si hay espacio
  menuRect = menu.getBoundingClientRect();
  if (menuRect.bottom > viewportHeight - 8 && trigger) {
    const triggerRect = trigger.getBoundingClientRect();
    if (triggerRect.top > menuRect.height + 8) {
      menu.style.top = 'auto';
      menu.style.bottom = '100%';
      menu.style.marginBottom = '4px';
      menu.style.marginTop = '0px';
    }
  }
}

// Cerrar todos los dropdowns y calendarios al hacer clic fuera o redimensionar pantalla
document.addEventListener('click', () => {
  document.querySelectorAll('.dropdown-menu, .datepicker-menu').forEach(menu => menu.classList.add('hidden'));
});

window.addEventListener('resize', () => {
  document.querySelectorAll('.dropdown-menu:not(.hidden), .datepicker-menu:not(.hidden)').forEach(menu => {
    menu.classList.add('hidden');
  });
});

// Helper para asignar valor programáticamente a cualquier dropdown moderno
function setDropdownValue(containerId, value) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const hiddenInput = container.querySelector('input[type="hidden"]');
  const label = container.querySelector('.trigger-label');
  const matchingItem = container.querySelector(`.dropdown-item[data-value="${value}"]`);

  if (hiddenInput) hiddenInput.value = value;
  if (matchingItem && label) {
    const itemText = matchingItem.querySelector('span:last-child') ? matchingItem.querySelector('span:last-child').textContent : matchingItem.textContent.trim();
    label.textContent = itemText;

    const itemDot = matchingItem.querySelector('.status-dot, .folder-dot, .priority-dot, span[style*="background-color"]');
    const triggerDot = container.querySelector('.status-dot, .folder-dot, .priority-dot');
    if (itemDot && triggerDot) {
      if (itemDot.style.backgroundColor) {
        triggerDot.style.backgroundColor = itemDot.style.backgroundColor;
      } else {
        triggerDot.className = itemDot.className;
      }
    }

    const itemIcon = matchingItem.querySelector('i');
    const triggerIcon = container.querySelector('.folder-icon-indicator');
    if (itemIcon && triggerIcon) {
      triggerIcon.className = itemIcon.className + ' folder-icon-indicator w-4 text-center shrink-0';
    }
  }
}

// Inicializar dropdowns de Modal Nueva Tarea
setupDropdown('dropdown-new-task-status', (val) => {
  const dot = document.querySelector('#dropdown-new-task-status .status-dot');
  if (!dot) return;
  if (val === 'pendiente') dot.className = 'w-2 h-2 rounded-full bg-amber-400 status-dot';
  if (val === 'en_curso') dot.className = 'w-2 h-2 rounded-full bg-sky-500 status-dot';
  if (val === 'completado') dot.className = 'w-2 h-2 rounded-full bg-emerald-500 status-dot';
});

setupDropdown('dropdown-new-task-priority', (val) => {
  const dot = document.querySelector('#dropdown-new-task-priority .priority-dot');
  if (!dot) return;
  if (val === 'alta') dot.className = 'w-2 h-2 rounded-full bg-rose-500 priority-dot';
  if (val === 'media') dot.className = 'w-2 h-2 rounded-full bg-amber-400 priority-dot';
  if (val === 'baja') dot.className = 'w-2 h-2 rounded-full bg-slate-400 priority-dot';
});

setupDropdown('dropdown-new-task-folder');

// Inicializar dropdowns de Modal Detalle de Tarea
setupDropdown('dropdown-detail-status', (val) => {
  updateDetailBadges();
});

setupDropdown('dropdown-detail-priority', (val) => {
  updateDetailBadges();
});

setupDropdown('dropdown-detail-folder');

// Inicializar dropdown de Modal Crear Carpeta
setupDropdown('dropdown-folder-icon');

// ==========================================================
// SISTEMA DE CALENDARIO Y SELECTOR DE FECHA PERSONALIZADO
// ==========================================================
function formatDisplayDate(dateStr) {
  if (!dateStr) return 'dd/mm/aaaa';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

function setCustomDatePickerValue(containerId, dateStr) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const hiddenInput = container.querySelector('input[type="hidden"]');
  const label = container.querySelector('.datepicker-label');
  const clearBtn = container.querySelector('.datepicker-clear-btn');

  const val = dateStr || '';
  if (hiddenInput) hiddenInput.value = val;

  if (label) {
    if (val) {
      label.textContent = formatDisplayDate(val);
      label.classList.remove('text-slate-400', 'font-normal');
      label.classList.add('text-slate-800', 'dark:text-slate-100', 'font-semibold');
    } else {
      label.textContent = 'dd/mm/aaaa';
      label.classList.add('text-slate-400', 'font-normal');
      label.classList.remove('text-slate-800', 'dark:text-slate-100', 'font-semibold');
    }
  }

  if (clearBtn) {
    if (val) {
      clearBtn.classList.remove('hidden');
    } else {
      clearBtn.classList.add('hidden');
    }
  }
}

function setupDatePicker(containerId, onSelectCallback) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const trigger = container.querySelector('.datepicker-trigger');
  const menu = container.querySelector('.datepicker-menu');
  const hiddenInput = container.querySelector('input[type="hidden"]');
  const clearBtn = container.querySelector('.datepicker-clear-btn');
  const monthYearEl = container.querySelector('.datepicker-month-year');
  const prevBtn = container.querySelector('.datepicker-prev-btn');
  const nextBtn = container.querySelector('.datepicker-next-btn');
  const daysGrid = container.querySelector('.datepicker-days-grid');
  const actionClear = container.querySelector('.datepicker-action-clear');
  const actionToday = container.querySelector('.datepicker-action-today');

  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();

  function renderCalendar() {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    if (monthYearEl) {
      monthYearEl.textContent = `${monthNames[viewMonth]} de ${viewYear}`;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const selectedVal = hiddenInput ? hiddenInput.value : '';

    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    let daysHtml = '';

    // Días del mes anterior
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dayNum);
      const prevDateStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(prevDate.getDate()).padStart(2, '0')}`;
      daysHtml += `
        <button type="button" class="datepicker-day datepicker-day-other-month w-8 h-8 mx-auto flex items-center justify-center rounded-xl text-xs text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer" data-date="${prevDateStr}">
          ${dayNum}
        </button>
      `;
    }

    // Días del mes actual
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isSelected = selectedVal === dateStr;
      const isToday = todayStr === dateStr;

      let classes = 'datepicker-day w-8 h-8 mx-auto flex items-center justify-center rounded-xl text-xs transition cursor-pointer select-none ';
      if (isSelected) {
        classes += 'bg-indigo-600 text-white font-bold shadow-xs hover:bg-indigo-700 datepicker-day-selected';
      } else if (isToday) {
        classes += 'border border-indigo-500 font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-800';
      } else {
        classes += 'text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-800 font-medium';
      }

      daysHtml += `
        <button type="button" class="${classes}" data-date="${dateStr}">
          ${day}
        </button>
      `;
    }

    // Días del mes siguiente
    const totalCells = firstDayIndex + daysInCurrentMonth;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let day = 1; day <= remainingCells; day++) {
      const nextDate = new Date(viewYear, viewMonth + 1, day);
      const nextDateStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
      daysHtml += `
        <button type="button" class="datepicker-day datepicker-day-other-month w-8 h-8 mx-auto flex items-center justify-center rounded-xl text-xs text-slate-300 dark:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition cursor-pointer" data-date="${nextDateStr}">
          ${day}
        </button>
      `;
    }

    if (daysGrid) daysGrid.innerHTML = daysHtml;
  }

  function selectDate(dateStr) {
    setCustomDatePickerValue(containerId, dateStr);
    menu.classList.add('hidden');
    if (typeof onSelectCallback === 'function') onSelectCallback(dateStr);
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = menu.classList.contains('hidden');

    document.querySelectorAll('.dropdown-menu, .datepicker-menu').forEach(m => {
      if (m !== menu) m.classList.add('hidden');
    });

    if (willOpen) {
      if (hiddenInput && hiddenInput.value) {
        const [y, m] = hiddenInput.value.split('-').map(Number);
        if (!isNaN(y) && !isNaN(m)) {
          viewYear = y;
          viewMonth = m - 1;
        }
      } else {
        viewYear = new Date().getFullYear();
        viewMonth = new Date().getMonth();
      }
      renderCalendar();
      menu.classList.remove('hidden');
      adjustDropdownPosition(menu, trigger);
    } else {
      menu.classList.add('hidden');
    }
  });

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewMonth--;
      if (viewMonth < 0) {
        viewMonth = 11;
        viewYear--;
      }
      renderCalendar();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      viewMonth++;
      if (viewMonth > 11) {
        viewMonth = 0;
        viewYear++;
      }
      renderCalendar();
    });
  }

  if (daysGrid) {
    daysGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.datepicker-day');
      if (!btn) return;
      e.stopPropagation();
      selectDate(btn.dataset.date);
    });
  }

  if (actionClear) {
    actionClear.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDate('');
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      selectDate('');
    });
  }

  if (actionToday) {
    actionToday.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = new Date();
      const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
      selectDate(todayStr);
    });
  }
}

// Inicializar selectores de fecha personalizados
setupDatePicker('datepicker-new-task');
setupDatePicker('datepicker-detail-due-date');

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

// ==========================================================
// MODAL DETALLE / EDICIÓN COMPLETA DE TAREA (MINI TAREAS)
// ==========================================================
function openTaskDetailModal(taskId) {
  const task = allTasks.find(t => t.id === taskId);
  if (!task) return;

  activeEditingTask = JSON.parse(JSON.stringify(task));
  if (!Array.isArray(activeEditingTask.subtasks)) {
    activeEditingTask.subtasks = [];
  }

  // Cargar datos
  detailTitleInput.value = activeEditingTask.title || '';
  detailDescInput.value = activeEditingTask.description || '';
  setCustomDatePickerValue('datepicker-detail-due-date', activeEditingTask.dueDate || '');
  newSubtaskInput.value = '';

  // Actualizar Dropdown de Estado en Modal
  const statusVal = activeEditingTask.status || 'pendiente';
  detailStatusSelect.value = statusVal;
  const statusTriggerLabel = document.querySelector('#dropdown-detail-status .trigger-label');
  const statusDot = document.querySelector('#dropdown-detail-status .status-dot');
  if (statusVal === 'completado') {
    statusTriggerLabel.textContent = '✅ Completado';
    statusDot.className = 'w-2 h-2 rounded-full bg-emerald-500 status-dot';
  } else if (statusVal === 'en_curso') {
    statusTriggerLabel.textContent = '🚀 En Curso';
    statusDot.className = 'w-2 h-2 rounded-full bg-sky-500 status-dot';
  } else {
    statusTriggerLabel.textContent = '⏳ Pendiente';
    statusDot.className = 'w-2 h-2 rounded-full bg-amber-400 status-dot';
  }

  // Actualizar Dropdown de Prioridad en Modal
  const priorityVal = activeEditingTask.priority || 'media';
  detailPrioritySelect.value = priorityVal;
  const priorityTriggerLabel = document.querySelector('#dropdown-detail-priority .trigger-label');
  const priorityDot = document.querySelector('#dropdown-detail-priority .priority-dot');
  if (priorityVal === 'alta') {
    priorityTriggerLabel.textContent = 'Prioridad Alta 🔥';
    priorityDot.className = 'w-2 h-2 rounded-full bg-rose-500 priority-dot';
  } else if (priorityVal === 'media') {
    priorityTriggerLabel.textContent = 'Prioridad Media';
    priorityDot.className = 'w-2 h-2 rounded-full bg-amber-400 priority-dot';
  } else {
    priorityTriggerLabel.textContent = 'Prioridad Baja';
    priorityDot.className = 'w-2 h-2 rounded-full bg-slate-400 priority-dot';
  }

  // Actualizar Dropdown de Carpeta en Modal
  const folder = allFolders.find(f => f.id === activeEditingTask.folderId);
  detailFolderSelect.value = activeEditingTask.folderId || (allFolders[0] ? allFolders[0].id : '');
  const folderTriggerLabel = document.querySelector('#dropdown-detail-folder .trigger-label');
  const folderDot = document.querySelector('#dropdown-detail-folder .folder-dot');
  if (folder) {
    folderTriggerLabel.textContent = folder.name;
    folderDot.style.backgroundColor = folder.color;
  }

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

function updateDetailBadges() {
  const status = detailStatusSelect.value;
  const priority = detailPrioritySelect.value;

  if (status === 'completado') {
    detailStatusPill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400';
    detailStatusPill.textContent = 'Completado ✅';
  } else if (status === 'en_curso') {
    detailStatusPill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-400';
    detailStatusPill.textContent = 'En Curso 🚀';
  } else {
    detailStatusPill.className = 'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400';
    detailStatusPill.textContent = 'Pendiente ⏳';
  }

  if (priority === 'alta') {
    detailPriorityPill.className = 'px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400';
    detailPriorityPill.textContent = 'Prioridad Alta 🔥';
  } else if (priority === 'media') {
    detailPriorityPill.className = 'px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400';
    detailPriorityPill.textContent = 'Prioridad Media';
  } else {
    detailPriorityPill.className = 'px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300';
    detailPriorityPill.textContent = 'Prioridad Baja';
  }
}

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
      <p class="text-[11px] text-slate-400 dark:text-slate-400 italic py-2">No hay mini tareas aún. Agrega una abajo para dividir esta tarea en pasos.</p>
    `;
    return;
  }

  detailSubtasksList.innerHTML = subtasks.map((st, index) => `
    <div class="subtask-item flex items-center justify-between p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition group ${st.done ? 'subtask-completed' : ''}">
      <label class="flex items-center gap-2.5 flex-1 cursor-pointer select-none min-w-0 mr-2">
        <input 
          type="checkbox" 
          ${st.done ? 'checked' : ''} 
          onchange="toggleModalSubtask(${index}, this.checked)"
          class="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-0 cursor-pointer shrink-0"
        >
        <span class="text-xs font-medium ${st.done ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'} break-words">
          ${escapeHtml(st.title)}
        </span>
      </label>
      <button 
        type="button" 
        onclick="deleteModalSubtask(${index})" 
        class="text-slate-300 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 p-1 rounded transition opacity-0 group-hover:opacity-100 shrink-0"
        title="Eliminar mini tarea"
      >
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  `).join('');
}

window.toggleModalSubtask = function(index, done) {
  if (activeEditingTask && activeEditingTask.subtasks[index]) {
    activeEditingTask.subtasks[index].done = done;
    renderModalSubtasks();
  }
};

window.deleteModalSubtask = function(index) {
  if (activeEditingTask && activeEditingTask.subtasks) {
    activeEditingTask.subtasks.splice(index, 1);
    renderModalSubtasks();
  }
};

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

btnSaveTaskDetail.addEventListener('click', async () => {
  if (!activeEditingTask) return;
  const newTitle = detailTitleInput.value.trim();
  if (!newTitle) {
    showAlert('El título de la tarea no puede estar vacío.', 'Campo requerido');
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
      headers: getAuthHeaders(true),
      body: JSON.stringify(updatedPayload)
    });

    if (!res.ok) throw new Error('Error al actualizar tarea');

    closeTaskDetailModal();
    await fetchTasks();
    await fetchFolders();
  } catch (err) {
    showAlert('No se pudieron guardar los cambios.', 'Error');
  } finally {
    btnSaveTaskDetail.disabled = false;
    btnSaveTaskDetail.textContent = 'Guardar Cambios';
  }
});

btnDeleteTaskModal.addEventListener('click', async () => {
  if (!activeEditingTask) return;
  const confirmed = await showConfirm(`¿Eliminar la tarea "${activeEditingTask.title}"?`, {
    title: 'Eliminar Tarea',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    isDanger: true,
    icon: 'fa-solid fa-trash-can'
  });
  if (!confirmed) return;

  const id = activeEditingTask.id;
  closeTaskDetailModal();
  await deleteTask(id, true);
});

// ==========================================================
// MODAL DE CARPETAS
// ==========================================================
function openFolderModal() {
  modalNewFolder.classList.remove('hidden');
  folderNameInput.value = '';
  setDropdownValue('dropdown-folder-icon', 'fa-folder');
  const triggerIcon = document.querySelector('#dropdown-folder-icon .folder-icon-indicator');
  if (triggerIcon) triggerIcon.style.color = selectedFolderColor || '#4f46e5';
  folderNameInput.focus();
}

function closeFolderModal() {
  modalNewFolder.classList.add('hidden');
  document.querySelectorAll('#dropdown-folder-icon .dropdown-menu').forEach(m => m.classList.add('hidden'));
}

btnOpenNewFolder.addEventListener('click', openFolderModal);
btnCloseFolderModal.addEventListener('click', closeFolderModal);
btnCancelFolder.addEventListener('click', closeFolderModal);
modalNewFolder.addEventListener('click', (e) => {
  if (e.target === modalNewFolder) closeFolderModal();
});

colorChoices.forEach(choice => {
  choice.addEventListener('click', () => {
    colorChoices.forEach(c => c.classList.remove('selected', 'ring-2', 'ring-offset-2', 'ring-indigo-400'));
    choice.classList.add('selected', 'ring-2', 'ring-offset-2', 'ring-indigo-400');
    selectedFolderColor = choice.dataset.color;
    const triggerIcon = document.querySelector('#dropdown-folder-icon .folder-icon-indicator');
    if (triggerIcon) triggerIcon.style.color = selectedFolderColor;
  });
});

createFolderForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = folderNameInput.value.trim();
  if (!name) return;

  const iconInput = document.getElementById('folder-icon-select');
  const icon = iconInput ? iconInput.value : 'fa-folder';
  const color = selectedFolderColor;

  try {
    const res = await fetch(`${API_BASE_URL}/api/folders`, {
      method: 'POST',
      headers: getAuthHeaders(true),
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
    showAlert('No se pudo crear la carpeta.', 'Error');
  }
});

// ==========================================================
// MODAL DEVOPS
// ==========================================================
function openDevopsModal() {
  if (!currentUser || !currentUser.isAdmin) {
    showAlert('Acceso restringido: Esta configuración de pipelines y AWS está reservada exclusivamente para el Administrador (admin).', 'Acceso denegado', 'fa-solid fa-shield-halved');
    return;
  }
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
  showAlert('Configuración de API guardada correctamente.', 'Configuración Guardada', 'fa-solid fa-circle-check');
});

// ==========================================================
// CARPETAS
// ==========================================================
async function fetchFolders() {
  if (!currentUser) {
    allFolders = [];
    renderFoldersList();
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/folders`, {
      cache: 'no-store',
      headers: getAuthHeaders(false)
    });
    if (!res.ok) throw new Error('Error al obtener carpetas');
    const result = await res.json();
    allFolders = result.data || [];
    renderFoldersList();
    renderFolderDropdowns();
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
      <div class="folder-item group flex items-center justify-between px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer gap-2 ${isActive ? 'active' : 'text-slate-600 hover:bg-slate-100'}" onclick="selectFolder('${folder.id}')">
        <div class="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${folder.color};"></span>
          <i class="fa-solid ${folder.icon || 'fa-folder'} text-slate-400 w-3.5 text-center text-xs shrink-0"></i>
          <span class="truncate">${escapeHtml(folder.name)}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <span class="px-1.5 py-0.5 rounded-full text-[10px] font-semibold text-slate-400 group-hover:text-slate-600 shrink-0">
            ${folder.pendingCount > 0 ? folder.pendingCount : ''}
          </span>
          <button 
            onclick="event.stopPropagation(); deleteFolder('${folder.id}', '${escapeHtml(folder.name)}')" 
            class="text-slate-300 hover:text-rose-500 p-1 rounded transition opacity-0 group-hover:opacity-100 shrink-0"
            title="Eliminar carpeta"
          >
            <i class="fa-solid fa-trash-can text-[11px]"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Llenar los menús dropdowns modernos de carpeta
function renderFolderDropdowns() {
  const newTaskFolderContainer = document.querySelector('#dropdown-new-task-folder .dropdown-items-container');
  const detailFolderContainer = document.querySelector('#dropdown-detail-folder .dropdown-items-container');

  if (allFolders.length === 0) return;

  const html = allFolders.map(f => `
    <div class="dropdown-item px-3 py-2 hover:bg-indigo-50/60 rounded-xl cursor-pointer flex items-center gap-2 font-medium text-slate-700 transition" data-value="${f.id}">
      <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background-color: ${f.color};"></span>
      <span class="truncate">${escapeHtml(f.name)}</span>
    </div>
  `).join('');

  if (newTaskFolderContainer) newTaskFolderContainer.innerHTML = html;
  if (detailFolderContainer) detailFolderContainer.innerHTML = html;
}

window.selectFolder = function(folderId) {
  activeFolderId = folderId;
  currentView = `folder-${folderId}`;

  if (searchInput) {
    searchInput.value = '';
    searchTerm = '';
    const btnClearSearch = document.getElementById('btn-clear-search');
    if (btnClearSearch) btnClearSearch.classList.add('hidden');
  }

  document.querySelectorAll('.nav-view-btn').forEach(btn => btn.classList.remove('active'));
  renderFoldersList();

  const folder = allFolders.find(f => f.id === folderId);
  if (folder) {
    currentViewTitle.innerHTML = `
      <span class="w-3 h-3 rounded-full inline-block mr-1" style="background-color: ${folder.color};"></span>
      <span>${escapeHtml(folder.name)}</span>
    `;
    currentViewSubtitle.textContent = `Tareas clasificadas en la carpeta ${folder.name}`;
    if (filterDisplayLabel) filterDisplayLabel.textContent = `Carpeta: ${folder.name}`;
  }

  closeSidebar();
  renderTasks();
};

window.deleteFolder = async function(id, name) {
  const confirmed = await showConfirm(`¿Eliminar la carpeta "${name}"? Las tareas asociadas se conservarán.`, {
    title: 'Eliminar Carpeta',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    isDanger: true,
    icon: 'fa-solid fa-trash-can'
  });
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE_URL}/api/folders/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false)
    });
    if (!res.ok) throw new Error('Error al eliminar');

    if (activeFolderId === id) {
      activeFolderId = null;
      currentView = 'all';
      updateViewHeaders('all');
    }

    await fetchFolders();
    await fetchTasks();
  } catch (err) {
    showAlert('No se pudo eliminar la carpeta.', 'Error');
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

    if (searchInput) {
      searchInput.value = '';
      searchTerm = '';
      const btnClear = document.getElementById('btn-clear-search');
      if (btnClear) btnClear.classList.add('hidden');
    }

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
    if (filterDisplayLabel) filterDisplayLabel.textContent = `Todas las tareas`;
  } else if (view === 'status-pendiente') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-clock text-amber-500 text-xs sm:text-sm"></i><span>Tareas Pendientes</span>`;
    currentViewSubtitle.textContent = `Tareas que requieren tu atención`;
    if (filterDisplayLabel) filterDisplayLabel.textContent = `Pendientes ⏳`;
  } else if (view === 'status-en_curso') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-spinner fa-spin-pulse text-sky-500 text-xs sm:text-sm"></i><span>Tareas En Curso</span>`;
    currentViewSubtitle.textContent = `Actividades en progreso actualmente`;
    if (filterDisplayLabel) filterDisplayLabel.textContent = `En Curso 🚀`;
  } else if (view === 'status-completado') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500 text-xs sm:text-sm"></i><span>Tareas Completadas</span>`;
    currentViewSubtitle.textContent = `Historial de actividades finalizadas`;
    if (filterDisplayLabel) filterDisplayLabel.textContent = `Completadas ✅`;
  } else if (view === 'priority-high') {
    currentViewTitle.innerHTML = `<i class="fa-solid fa-fire text-rose-500 text-xs sm:text-sm"></i><span>Prioridad Alta</span>`;
    currentViewSubtitle.textContent = `Tareas críticas y urgentes`;
    if (filterDisplayLabel) filterDisplayLabel.textContent = `Alta Prioridad 🔥`;
  }
}

// Helper para normalizar texto (ignorar mayúsculas, minúsculas y tildes)
function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const btnClearSearch = document.getElementById('btn-clear-search');

if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim();

    if (btnClearSearch) {
      if (searchTerm) {
        btnClearSearch.classList.remove('hidden');
      } else {
        btnClearSearch.classList.add('hidden');
      }
    }

    if (searchTerm) {
      currentViewTitle.innerHTML = `<i class="fa-solid fa-magnifying-glass text-indigo-600 dark:text-indigo-400 text-xs sm:text-sm"></i><span>Búsqueda: "${escapeHtml(searchTerm)}"</span>`;
      currentViewSubtitle.textContent = `Mostrando resultados en todas tus tareas y notas`;
      if (filterDisplayLabel) filterDisplayLabel.textContent = `Búsqueda global`;
    } else {
      updateViewHeaders(currentView);
    }

    renderTasks();
  });

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      searchInput.value = '';
      searchTerm = '';
      btnClearSearch.classList.add('hidden');
      updateViewHeaders(currentView);
      renderTasks();
      searchInput.focus();
    });
  }

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      searchTerm = '';
      if (btnClearSearch) btnClearSearch.classList.add('hidden');
      updateViewHeaders(currentView);
      renderTasks();
      searchInput.blur();
    }
  });
}

// ==========================================================
// TAREAS / NOTAS
// ==========================================================
async function fetchTasks() {
  if (!currentUser) {
    allTasks = [];
    updateBadges();
    renderTasks();
    return;
  }
  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      cache: 'no-store',
      headers: getAuthHeaders(false)
    });
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
  const term = normalizeText(searchTerm);

  // 1. Si hay término de búsqueda, la búsqueda es GLOBAL en todo el registro
  if (term) {
    filtered = allTasks.filter(t => {
      const folder = allFolders.find(f => f.id === t.folderId);
      const folderName = folder ? folder.name : '';
      return (
        normalizeText(t.title).includes(term) ||
        normalizeText(t.description).includes(term) ||
        normalizeText(folderName).includes(term) ||
        (t.subtasks && t.subtasks.some(st => normalizeText(st.title).includes(term)))
      );
    });
  } else {
    // 2. Si no hay búsqueda activa, filtrar según la vista activa del menú lateral
    if (currentView.startsWith('folder-')) {
      const fId = currentView.replace('folder-', '');
      filtered = filtered.filter(t => t.folderId === fId);
    } else if (currentView === 'status-pendiente') {
      filtered = filtered.filter(t => t.status === 'pendiente');
    } else if (currentView === 'status-en_curso') {
      filtered = filtered.filter(t => t.status === 'en_curso');
    } else if (currentView === 'status-completado') {
      filtered = filtered.filter(t => t.status === 'completado');
    } else if (currentView === 'priority-high') {
      filtered = filtered.filter(t => t.priority === 'alta' && t.status !== 'completado');
    }
  }

  if (statusTaskCount) {
    statusTaskCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'tarea' : 'tareas'}`;
  }

  if (filtered.length === 0) {
    const isFiltered = currentView !== 'all' || term;
    tasksContainer.innerHTML = `
      <div class="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 space-y-3">
        <div class="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-xl">
          <i class="fa-regular fa-clipboard"></i>
        </div>
        <div class="space-y-1">
          <p class="text-xs font-bold text-slate-700 dark:text-slate-200">
            ${term ? `No se encontraron tareas que coincidan con "${escapeHtml(searchTerm)}".` : (isFiltered ? 'No hay tareas en esta sección.' : 'No tienes tareas registradas todavía.')}
          </p>
          <p class="text-[11px] text-slate-400 dark:text-slate-400">
            ${term ? 'Prueba con otro término o limpia el buscador para ver tus tareas.' : (isFiltered ? 'Puedes cambiar de vista en el menú lateral o agregar una nueva tarea.' : 'Comienza creando tu primera tarea personal o de trabajo.')}
          </p>
        </div>
        ${term ? `
          <button 
            type="button"
            onclick="document.getElementById('btn-clear-search')?.click()" 
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
          >
            <i class="fa-solid fa-xmark text-xs"></i>
            <span>Limpiar Búsqueda</span>
          </button>
        ` : `
          <button 
            onclick="openNewTaskModal()" 
            class="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition active:scale-95"
          >
            <i class="fa-solid fa-plus text-xs"></i>
            <span>Crear Nueva Tarea</span>
          </button>
        `}
      </div>
    `;
    return;
  }

  tasksContainer.innerHTML = filtered.map(task => {
    const folder = allFolders.find(f => f.id === task.folderId);
    const folderName = folder ? folder.name : 'General';
    const folderColor = folder ? folder.color : '#6366f1';

    let statusBadge = '';
    if (task.status === 'completado') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center gap-1"><i class="fa-solid fa-check text-[9px]"></i>Completada</span>`;
    } else if (task.status === 'en_curso') {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 border border-sky-200/60 dark:border-sky-800/60 flex items-center gap-1"><i class="fa-solid fa-spinner fa-spin-pulse text-[9px]"></i>En Curso</span>`;
    } else {
      statusBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/60 flex items-center gap-1"><i class="fa-solid fa-clock text-[9px]"></i>Pendiente</span>`;
    }

    let priorityBadge = '';
    if (task.priority === 'alta') {
      priorityBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-800/60"><i class="fa-solid fa-fire text-[9px] mr-1"></i>Alta</span>`;
    } else if (task.priority === 'media') {
      priorityBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800/60">Media</span>`;
    } else {
      priorityBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">Baja</span>`;
    }

    let dueDatePill = '';
    if (task.dueDate) {
      const due = new Date(task.dueDate + 'T00:00:00');
      const isPast = due < new Date().setHours(0,0,0,0);
      dueDatePill = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${isPast && task.status !== 'completado' ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-semibold' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}">
          <i class="fa-regular fa-calendar text-[9px]"></i>
          <span>Vence: ${due.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </span>
      `;
    }

    let subtasksBadge = '';
    const subtasks = task.subtasks || [];
    if (subtasks.length > 0) {
      const compCount = subtasks.filter(s => s.done).length;
      const pct = Math.round((compCount / subtasks.length) * 100);
      subtasksBadge = `
        <div class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium border border-indigo-100 dark:border-indigo-900/60">
          <i class="fa-solid fa-list-check text-[9px]"></i>
          <span>${compCount}/${subtasks.length} mini tareas</span>
          <div class="w-10 bg-indigo-200 dark:bg-slate-700 rounded-full h-1 overflow-hidden ml-1">
            <div class="bg-indigo-600 h-1 rounded-full" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }

    const isDone = task.status === 'completado';

    return `
      <div 
        class="task-card bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 sm:p-4 flex items-start gap-3 ${isDone ? 'task-completed bg-slate-50/70 dark:bg-slate-900/50' : ''}" 
        onclick="openTaskDetailModal(${task.id})"
      >
        <input 
          type="checkbox" 
          ${isDone ? 'checked' : ''} 
          onclick="event.stopPropagation()"
          onchange="toggleTaskQuick(${task.id}, this.checked)"
          class="mt-1 w-4 h-4 rounded text-indigo-600 border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-0 cursor-pointer shrink-0"
        >

        <div class="flex-1 min-w-0 space-y-1.5">
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

          <h4 class="task-title text-sm font-semibold text-slate-800 dark:text-slate-100 break-words leading-snug">
            ${escapeHtml(task.title)}
          </h4>

          ${task.description ? `
            <p class="text-xs text-slate-500 dark:text-slate-400 break-words line-clamp-2 leading-relaxed bg-slate-50/80 dark:bg-slate-800/60 p-2 rounded-xl border border-slate-100 dark:border-slate-800 font-sans">
              ${escapeHtml(task.description)}
            </p>
          ` : ''}

          <div class="text-[10px] text-slate-400 dark:text-slate-400 pt-0.5 flex items-center justify-between">
            <span><i class="fa-regular fa-clock mr-1 text-[9px]"></i>${new Date(task.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            <span class="text-indigo-600 dark:text-indigo-400 font-medium hover:underline flex items-center gap-1">
              <span>Editar & pasos</span> <i class="fa-solid fa-chevron-right text-[8px]"></i>
            </span>
          </div>
        </div>

        <button 
          onclick="event.stopPropagation(); deleteTask(${task.id})" 
          class="text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg transition shrink-0 active:scale-90"
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
// MODAL: CREAR NUEVA TAREA / NOTA
// ==========================================================
function openNewTaskModal() {
  if (!currentUser) {
    openAuthModal('login');
    return;
  }

  // Limpiar formulario previo
  newTaskTitleInput.value = '';
  newTaskDescInput.value = '';
  setCustomDatePickerValue('datepicker-new-task', '');

  // 1. Asignar Estado por defecto según la pestaña activa (currentView)
  let defaultStatus = 'pendiente';
  if (currentView === 'status-pendiente') {
    defaultStatus = 'pendiente';
  } else if (currentView === 'status-en_curso') {
    defaultStatus = 'en_curso';
  } else if (currentView === 'status-completado') {
    defaultStatus = 'completado';
  }
  setDropdownValue('dropdown-new-task-status', defaultStatus);

  // 2. Asignar Prioridad por defecto según la pestaña activa
  let defaultPriority = 'media';
  if (currentView === 'priority-high') {
    defaultPriority = 'alta';
  }
  setDropdownValue('dropdown-new-task-priority', defaultPriority);

  // 3. Asignar Carpeta por defecto según la pestaña activa
  let defaultFolderId = allFolders[0] ? allFolders[0].id : 'general';
  if (activeFolderId && allFolders.some(f => f.id === activeFolderId)) {
    defaultFolderId = activeFolderId;
  }
  setDropdownValue('dropdown-new-task-folder', defaultFolderId);

  modalNewTask.classList.remove('hidden');
  setTimeout(() => newTaskTitleInput.focus(), 80);
}

window.openNewTaskModal = openNewTaskModal;

function closeNewTaskModal() {
  modalNewTask.classList.add('hidden');
}

// Botones para abrir modal
if (btnHeaderNewTask) btnHeaderNewTask.addEventListener('click', openNewTaskModal);
if (btnFabNewTask) btnFabNewTask.addEventListener('click', openNewTaskModal);

// Botones para cerrar modal
if (btnCloseNewTaskModal) btnCloseNewTaskModal.addEventListener('click', closeNewTaskModal);
if (btnCancelNewTaskModal) btnCancelNewTaskModal.addEventListener('click', closeNewTaskModal);
if (modalNewTask) {
  modalNewTask.addEventListener('click', (e) => {
    if (e.target === modalNewTask) closeNewTaskModal();
  });
}

// Submit del formulario del modal
newTaskForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = newTaskTitleInput.value.trim();
  if (!title) return;

  const folderId = newTaskFolderSelect.value || (allFolders[0] ? allFolders[0].id : 'general');
  const status = newTaskStatusSelect.value || 'pendiente';
  const priority = newTaskPrioritySelect.value || 'media';
  const dueDate = newTaskDueDateInput.value || null;
  const description = newTaskDescInput.value.trim();

  btnSubmitNewTask.disabled = true;
  btnSubmitNewTask.textContent = 'Guardando...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify({ title, description, folderId, status, priority, dueDate, subtasks: [] })
    });

    if (!res.ok) throw new Error('Error al crear tarea');

    closeNewTaskModal();
    await fetchTasks();
    await fetchFolders();
    fetchTelemetry();
  } catch (err) {
    showAlert('No se pudo guardar la tarea.', 'Error');
  } finally {
    btnSubmitNewTask.disabled = false;
    btnSubmitNewTask.innerHTML = '<i class="fa-solid fa-plus text-xs"></i><span>Crear Tarea</span>';
  }
});

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
      headers: getAuthHeaders(true),
      body: JSON.stringify({ status: newStatus, done: isChecked })
    });
    fetchFolders();
  } catch (err) {
    fetchTasks();
  }
};

window.deleteTask = async function(id, skipConfirm = false) {
  if (!skipConfirm) {
    const task = allTasks.find(t => t.id === id);
    const title = task ? task.title : 'esta tarea';
    const confirmed = await showConfirm(`¿Eliminar la tarea "${title}"?`, {
      title: 'Eliminar Tarea',
      confirmText: 'Aceptar',
      cancelText: 'Cancelar',
      isDanger: true,
      icon: 'fa-solid fa-trash-can'
    });
    if (!confirmed) return;
  }

  allTasks = allTasks.filter(t => t.id !== id);
  renderTasks();
  updateBadges();

  try {
    await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(false)
    });
    fetchFolders();
  } catch (err) {
    fetchTasks();
  }
};

// ==========================================================
// GESTIÓN DE SESIONES Y AUTENTICACIÓN (LOGIN & REGISTRO)
// ==========================================================
function initAuth() {
  const savedUser = localStorage.getItem('TASKFLOW_USER');
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      currentUser = null;
      localStorage.removeItem('TASKFLOW_USER');
    }
  }

  updateAuthUI();

  // Si no hay sesión previa, abrimos la pantalla completa de login bloqueando el fondo
  if (!currentUser) {
    openAuthModal('login');
  } else {
    closeAuthModal();
    fetchFolders().then(() => {
      fetchTasks();
    });
  }
}

function updateAuthUI() {
  if (currentUser) {
    // Topbar
    topbarLoggedInView.classList.remove('hidden');
    btnOpenLogin.classList.add('hidden');
    topbarUserName.textContent = currentUser.username;
    topbarAvatarInitial.textContent = (currentUser.username[0] || 'U').toUpperCase();

    if (currentUser.isAdmin) {
      topbarUserRoleBadge.textContent = 'Admin';
      topbarUserRoleBadge.className = 'text-[9px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded';
    } else {
      topbarUserRoleBadge.textContent = 'Usuario';
      topbarUserRoleBadge.className = 'text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded';
    }

    // Sidebar
    sidebarUserName.textContent = currentUser.username;
    sidebarAvatarInitial.textContent = (currentUser.username[0] || 'U').toUpperCase();
    if (currentUser.isAdmin) {
      sidebarUserRole.textContent = 'Administrador';
      sidebarUserRole.className = 'text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase block leading-none';
    } else {
      sidebarUserRole.textContent = 'Usuario Estándar';
      sidebarUserRole.className = 'text-[9px] text-slate-500 dark:text-slate-400 font-semibold uppercase block leading-none';
    }
    btnSidebarAuth.title = 'Cerrar sesión';
    sidebarAuthIcon.className = 'fa-solid fa-right-from-bracket text-xs text-rose-500';

    // PERMISO EXCLUSIVO: Solo el Administrador puede ver y acceder al botón DevOps
    if (currentUser.isAdmin) {
      btnOpenDevops.classList.remove('hidden');
    } else {
      btnOpenDevops.classList.add('hidden');
    }
  } else {
    // Sin sesión activa
    topbarLoggedInView.classList.add('hidden');
    btnOpenLogin.classList.remove('hidden');

    sidebarUserName.textContent = 'Invitado';
    sidebarAvatarInitial.textContent = '?';
    sidebarUserRole.textContent = 'Sin Sesión';
    sidebarUserRole.className = 'text-[9px] text-slate-400 font-semibold uppercase block leading-none';
    btnSidebarAuth.title = 'Iniciar sesión';
    sidebarAuthIcon.className = 'fa-solid fa-arrow-right-to-bracket text-xs';

    // Ocultar botón DevOps a usuarios sin sesión
    btnOpenDevops.classList.add('hidden');
  }
}

function openAuthModal(mode = 'login') {
  authMode = mode;
  switchAuthMode(mode);
  authUsernameInput.value = '';
  authPasswordInput.value = '';
  hideAuthError();
  modalAuth.classList.remove('hidden');
  if (btnCloseAuthModal) {
    if (currentUser) {
      btnCloseAuthModal.classList.remove('hidden');
    } else {
      btnCloseAuthModal.classList.add('hidden');
    }
  }
  setTimeout(() => authUsernameInput.focus(), 80);
}

function closeAuthModal() {
  if (!currentUser) return; // Obligatorio iniciar sesión para ingresar a las notas
  modalAuth.classList.add('hidden');
}

function switchAuthMode(mode) {
  authMode = mode;
  hideAuthError();

  if (mode === 'login') {
    tabLogin.className = 'flex-1 py-1.5 rounded-lg bg-white text-indigo-600 shadow-xs transition font-semibold';
    tabRegister.className = 'flex-1 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition font-medium';
    authModalTitle.textContent = 'Iniciar Sesión';
    authModalSubtitle.textContent = 'Accede a tus tareas y notas personales';
    btnAuthSubmitLabel.textContent = 'Entrar al Sistema';
  } else {
    tabRegister.className = 'flex-1 py-1.5 rounded-lg bg-white text-indigo-600 shadow-xs transition font-semibold';
    tabLogin.className = 'flex-1 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 transition font-medium';
    authModalTitle.textContent = 'Crear Nueva Cuenta';
    authModalSubtitle.textContent = 'Regístrate para gestionar tus notas y tareas';
    btnAuthSubmitLabel.textContent = 'Crear Cuenta';
  }
}

function showAuthError(msg) {
  authErrorText.textContent = msg;
  authErrorBox.classList.remove('hidden');
}

function hideAuthError() {
  authErrorBox.classList.add('hidden');
  authErrorText.textContent = '';
}

btnOpenLogin.addEventListener('click', () => openAuthModal('login'));
if (btnCloseAuthModal) {
  btnCloseAuthModal.addEventListener('click', closeAuthModal);
}
modalAuth.addEventListener('click', (e) => {
  if (e.target === modalAuth && currentUser) closeAuthModal();
});

tabLogin.addEventListener('click', () => switchAuthMode('login'));
tabRegister.addEventListener('click', () => switchAuthMode('register'));

btnTogglePasswordVisibility.addEventListener('click', () => {
  const isPass = authPasswordInput.type === 'password';
  authPasswordInput.type = isPass ? 'text' : 'password';
  btnTogglePasswordVisibility.innerHTML = isPass ? '<i class="fa-regular fa-eye-slash text-xs"></i>' : '<i class="fa-regular fa-eye text-xs"></i>';
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthError();

  const username = authUsernameInput.value.trim();
  const password = authPasswordInput.value;

  if (!username) {
    showAuthError('Por favor ingresa un nombre de usuario.');
    return;
  }

  if (!password || password.length < 8) {
    showAuthError('La contraseña debe tener un mínimo de 8 caracteres.');
    return;
  }

  const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';

  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      showAuthError(data.error || 'Ocurrió un error en la autenticación.');
      return;
    }

    currentUser = data.data;
    localStorage.setItem('TASKFLOW_USER', JSON.stringify(currentUser));
    updateAuthUI();
    closeAuthModal();
    await fetchFolders();
    await fetchTasks();
  } catch (err) {
    showAuthError('No se pudo conectar con el backend. Verifica que el servidor esté activo.');
  }
});

async function handleLogout() {
  const confirmed = await showConfirm(`¿Cerrar la sesión de "${currentUser ? currentUser.username : 'usuario'}"?`, {
    title: 'Cerrar Sesión',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    isDanger: true,
    icon: 'fa-solid fa-right-from-bracket'
  });
  if (!confirmed) return;

  localStorage.removeItem('TASKFLOW_USER');
  currentUser = null;
  allTasks = [];
  allFolders = [];
  renderFoldersList();
  renderTasks();
  updateBadges();
  updateAuthUI();
  openAuthModal('login');
}

if (btnTopbarLogout) btnTopbarLogout.addEventListener('click', handleLogout);
btnSidebarAuth.addEventListener('click', () => {
  if (currentUser) {
    handleLogout();
  } else {
    openAuthModal('login');
  }
});

// ==========================================================
// INICIALIZACIÓN
// ==========================================================
apiUrlInput.value = API_BASE_URL;
initTheme();
initAuth();
fetchTelemetry();

setInterval(fetchTelemetry, 25000);
