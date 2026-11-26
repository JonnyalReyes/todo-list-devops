const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = process.env.APP_VERSION || '2.1.0';
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// Middlewares
app.use(cors());
app.use(express.json());

// Request logger para CloudWatch
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - Host: ${os.hostname()}`);
  });
  next();
});

// ==========================================================
// Almacén de Usuarios y Sesiones (Autenticación Básica)
// Usuario Administrador por defecto: admin / 12345678
// ==========================================================
let users = [
  {
    id: 1,
    username: 'admin',
    password: '12345678',
    role: 'admin',
    createdAt: new Date().toISOString()
  }
];

// ==========================================================
// Almacén de Carpetas / Categorías
// ==========================================================
let folders = [
  { id: 'trabajo', name: 'Trabajo', color: '#0284c7', icon: 'fa-briefcase', userId: 1, username: 'admin', createdAt: new Date().toISOString() },
  { id: 'estudio', name: 'Estudio (UTP)', color: '#7c3aed', icon: 'fa-graduation-cap', userId: 1, username: 'admin', createdAt: new Date().toISOString() },
  { id: 'personal', name: 'Personal', color: '#059669', icon: 'fa-user', userId: 1, username: 'admin', createdAt: new Date().toISOString() },
  { id: 'ideas', name: 'Proyectos & Ideas', color: '#d97706', icon: 'fa-lightbulb', userId: 1, username: 'admin', createdAt: new Date().toISOString() }
];

// ==========================================================
// Almacén de Tareas / Notas con Mini Tareas, Estados y Fechas
// Estados permitidos: 'pendiente', 'en_curso', 'completado'
// ==========================================================
let tasks = [
  {
    id: 1,
    title: 'Preparar diapositivas de arquitectura AWS',
    description: 'Incluir diagramas de VPC, ECS Fargate, ECR y Application Load Balancer.',
    folderId: 'estudio',
    status: 'completado', // 'pendiente', 'en_curso', 'completado'
    done: true,
    priority: 'alta',
    dueDate: '2026-11-28',
    userId: 1,
    username: 'admin',
    subtasks: [
      { id: 1, title: 'Diagrama de red VPC y subredes públicas', done: true },
      { id: 2, title: 'Diagrama de ECS Fargate y Load Balancer', done: true },
      { id: 3, title: 'Capturas de evidencia de los 3 pipelines', done: true }
    ],
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 2,
    title: 'Verificar despliegue en Amazon ECS Fargate',
    description: 'Comprobar que terraform apply y el rolling update funcionen al 100%.',
    folderId: 'trabajo',
    status: 'en_curso',
    done: false,
    priority: 'alta',
    dueDate: '2026-11-26',
    userId: 1,
    username: 'admin',
    subtasks: [
      { id: 1, title: 'Crear ECR y subir imagen con commit SHA', done: true },
      { id: 2, title: 'Verificar que las tareas Fargate alcancen estado RUNNING', done: true },
      { id: 3, title: 'Comprobar respuesta HTTP 200 en el balanceador', done: false }
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 3,
    title: 'Revisar notas para la sustentación del proyecto',
    description: 'Estudiar conceptos de integración continua, seguridad IAM y costos en AWS.',
    folderId: 'estudio',
    status: 'pendiente',
    done: false,
    priority: 'media',
    dueDate: '2026-11-30',
    userId: 1,
    username: 'admin',
    subtasks: [
      { id: 1, title: 'Explicar por qué no se expone secretos en Git', done: false },
      { id: 2, title: 'Detallar ahorro de costos al evitar NAT Gateways', done: false }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Organizar archivos y entregable en carpeta compartida',
    description: 'Verificar que README.md, terraform/, aplicacion/ y pipelines/ estén completos.',
    folderId: 'personal',
    status: 'pendiente',
    done: false,
    priority: 'baja',
    dueDate: '2026-12-02',
    userId: 1,
    username: 'admin',
    subtasks: [],
    createdAt: new Date().toISOString()
  }
];

// Helper para identificar al usuario autenticado
function getAuthUser(req) {
  const username = req.headers['x-user-name'] || req.query.username;
  const userId = req.headers['x-user-id'] || req.query.userId;

  if (username) {
    const u = users.find(user => user.username.toLowerCase() === String(username).toLowerCase());
    if (u) return u;
  }
  if (userId) {
    const u = users.find(user => user.id === parseInt(userId, 10));
    if (u) return u;
  }
  return null;
}

// Health Check Endpoint (AWS ALB / ECS Target Group)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'todo-notes-backend-api',
    version: VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    hostname: os.hostname()
  });
});

// Telemetría & Metadata del contenedor (para el modal DevOps)
app.get('/api/info', (req, res) => {
  res.json({
    service: 'TaskFlow Notes & Subtasks Service',
    version: VERSION,
    environment: ENVIRONMENT,
    hostname: os.hostname(),
    platform: `${os.type()} ${os.arch()}`,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    awsRegion: process.env.AWS_REGION || 'us-east-2',
    totalTasks: tasks.length,
    totalFolders: folders.length
  });
});

// ==========================================================
// ENDPOINTS DE AUTENTICACIÓN & SESIONES
// ==========================================================

// Iniciar Sesión (Login)
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Usuario y contraseña son requeridos.' });
  }

  const cleanUser = String(username).trim().toLowerCase();
  const user = users.find(u => u.username.toLowerCase() === cleanUser && u.password === String(password));

  if (!user) {
    return res.status(401).json({ success: false, error: 'Usuario o contraseña incorrectos.' });
  }

  const token = `token-${user.id}-${Date.now().toString(36)}`;
  console.log(`[SESIÓN INICIADA] Usuario: "${user.username}" (Rol: ${user.role})`);

  res.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
      isAdmin: user.role === 'admin',
      token
    }
  });
});

// Registrar nueva cuenta de usuario
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || typeof username !== 'string' || !username.trim()) {
    return res.status(400).json({ success: false, error: 'El nombre de usuario es obligatorio.' });
  }

  const cleanUser = username.trim().toLowerCase();
  if (cleanUser.length < 3) {
    return res.status(400).json({ success: false, error: 'El usuario debe tener al menos 3 caracteres.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ success: false, error: 'La contraseña debe tener mínimo 8 caracteres.' });
  }

  const existing = users.find(u => u.username.toLowerCase() === cleanUser);
  if (existing) {
    return res.status(409).json({ success: false, error: 'Ese nombre de usuario ya está registrado. Elige otro.' });
  }

  const newUser = {
    id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
    username: username.trim(),
    password: String(password),
    role: 'user', // Los nuevos registros siempre tienen rol 'user'
    createdAt: new Date().toISOString()
  };

  users.push(newUser);

  // Crear carpetas individuales iniciales para el nuevo usuario
  const defaultUserFolders = [
    { id: `trabajo-${newUser.id}`, name: 'Trabajo', color: '#0284c7', icon: 'fa-briefcase', userId: newUser.id, username: newUser.username, createdAt: new Date().toISOString() },
    { id: `personal-${newUser.id}`, name: 'Personal', color: '#059669', icon: 'fa-user', userId: newUser.id, username: newUser.username, createdAt: new Date().toISOString() },
    { id: `estudio-${newUser.id}`, name: 'Estudio', color: '#7c3aed', icon: 'fa-graduation-cap', userId: newUser.id, username: newUser.username, createdAt: new Date().toISOString() }
  ];
  folders.push(...defaultUserFolders);

  // Crear una primera tarea de bienvenida individual para este usuario
  const welcomeTask = {
    id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
    title: `¡Bienvenido(a) a tus notas, ${newUser.username}!`,
    description: 'Este es tu espacio personal y privado de tareas. Nadie más puede ver tus notas ni carpetas.',
    folderId: defaultUserFolders[0].id,
    status: 'pendiente',
    done: false,
    priority: 'media',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
    userId: newUser.id,
    username: newUser.username,
    subtasks: [
      { id: 1, title: 'Explorar mis carpetas privadas', done: true },
      { id: 2, title: 'Crear mi primera nota o tarea personal', done: false }
    ],
    createdAt: new Date().toISOString()
  };
  tasks.unshift(welcomeTask);

  console.log(`[USUARIO REGISTRADO] ID: ${newUser.id} - "${newUser.username}" (Rol: ${newUser.role}) con espacio individual creado`);

  const token = `token-${newUser.id}-${Date.now().toString(36)}`;
  res.status(201).json({
    success: true,
    data: {
      id: newUser.id,
      username: newUser.username,
      role: newUser.role,
      isAdmin: false,
      token
    }
  });
});

// Verificar sesión actual
app.get('/api/auth/me', (req, res) => {
  const user = getAuthUser(req);
  if (user) {
    return res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        isAdmin: user.role === 'admin'
      }
    });
  }
  res.status(401).json({ success: false, error: 'No autenticado.' });
});

// ==========================================================
// ENDPOINTS DE CARPETAS / CATEGORÍAS (AISLADAS POR USUARIO)
// ==========================================================

// Obtener todas las carpetas del usuario con conteo dinámico de tareas
app.get('/api/folders', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.json({ success: true, data: [] });
  }

  const userFolders = folders.filter(f => f.userId === user.id || f.username === user.username);
  const userTasks = tasks.filter(t => t.userId === user.id || t.username === user.username);

  const foldersWithCounts = userFolders.map(f => {
    const taskCount = userTasks.filter(t => t.folderId === f.id).length;
    const pendingCount = userTasks.filter(t => t.folderId === f.id && t.status !== 'completado').length;
    return {
      ...f,
      taskCount,
      pendingCount
    };
  });

  res.json({
    success: true,
    data: foldersWithCounts
  });
});

// Crear nueva carpeta personalizada para el usuario actual
app.post('/api/folders', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Debes iniciar sesión para crear carpetas.' });
  }

  const { name, color, icon } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'El nombre de la carpeta es obligatorio.' });
  }

  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const id = `${slug}-${user.id}-${Date.now().toString(36)}`;

  const newFolder = {
    id,
    name: name.trim(),
    color: color || '#4f46e5',
    icon: icon || 'fa-folder',
    userId: user.id,
    username: user.username,
    createdAt: new Date().toISOString()
  };

  folders.push(newFolder);
  console.log(`[CARPETA CREADA] ID: ${newFolder.id} - "${newFolder.name}" [Usuario: ${user.username}]`);
  res.status(201).json({ success: true, data: { ...newFolder, taskCount: 0, pendingCount: 0 } });
});

// Eliminar carpeta (solo permitida al propietario)
app.delete('/api/folders/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }

  const { id } = req.params;
  const index = folders.findIndex(f => f.id === id && (f.userId === user.id || f.username === user.username));

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Carpeta no encontrada o sin permisos.' });
  }

  const deletedFolder = folders.splice(index, 1)[0];
  tasks.forEach(t => {
    if (t.folderId === id && (t.userId === user.id || t.username === user.username)) {
      t.folderId = 'general';
    }
  });

  console.log(`[CARPETA ELIMINADA] ID: ${deletedFolder.id} [Usuario: ${user.username}]`);
  res.json({ success: true, data: deletedFolder });
});

// ==========================================================
// ENDPOINTS DE TAREAS / NOTAS (AISLADAS POR USUARIO)
// ==========================================================

// Obtener tareas individuales del usuario con filtros avanzados
app.get('/api/tasks', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.json({ success: true, count: 0, total: 0, data: [] });
  }

  const { folderId, status, priority, search } = req.query;
  // Filtrar exclusivamente las tareas del usuario autenticado
  let result = tasks.filter(t => t.userId === user.id || t.username === user.username);

  // Filtro por carpeta
  if (folderId && folderId !== 'all') {
    result = result.filter(t => t.folderId === folderId);
  }

  // Filtro por estado ('pendiente', 'en_curso', 'completado')
  if (status && status !== 'all') {
    result = result.filter(t => t.status === status);
  }

  // Filtro por prioridad ('alta', 'media', 'baja')
  if (priority && priority !== 'all') {
    result = result.filter(t => t.priority === priority);
  }

  // Búsqueda por texto (título, descripción o sub-tareas)
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    result = result.filter(t => 
      t.title.toLowerCase().includes(term) || 
      (t.description && t.description.toLowerCase().includes(term)) ||
      (t.subtasks && t.subtasks.some(st => st.title.toLowerCase().includes(term)))
    );
  }

  res.json({
    success: true,
    count: result.length,
    total: tasks.filter(t => t.userId === user.id || t.username === user.username).length,
    data: result
  });
});

// Obtener una tarea específica por ID (solo del propietario)
app.get('/api/tasks/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }

  const id = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === id && (t.userId === user.id || t.username === user.username));
  if (!task) {
    return res.status(404).json({ success: false, error: 'Tarea no encontrada o sin permisos.' });
  }
  res.json({ success: true, data: task });
});

// Crear tarea / nota para el usuario autenticado
app.post('/api/tasks', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Debes iniciar sesión para crear tareas.' });
  }

  const { title, description, folderId, priority, dueDate, status, subtasks } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, error: 'El título de la tarea es obligatorio.' });
  }

  const taskStatus = status && ['pendiente', 'en_curso', 'completado'].includes(status) ? status : 'pendiente';
  const userFolders = folders.filter(f => f.userId === user.id || f.username === user.username);

  const newTask = {
    id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
    title: title.trim(),
    description: description && typeof description === 'string' ? description.trim() : '',
    folderId: folderId || (userFolders.length > 0 ? userFolders[0].id : 'general'),
    status: taskStatus,
    done: taskStatus === 'completado',
    priority: priority && ['alta', 'media', 'baja'].includes(priority) ? priority : 'media',
    dueDate: dueDate || null,
    userId: user.id,
    username: user.username,
    subtasks: Array.isArray(subtasks) ? subtasks.map((st, i) => ({
      id: st.id || i + 1,
      title: String(st.title || '').trim(),
      done: Boolean(st.done)
    })) : [],
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  console.log(`[TAREA CREADA] ID: ${newTask.id} - "${newTask.title}" [Usuario: ${user.username}]`);
  res.status(201).json({ success: true, data: newTask });
});

// Actualizar completamente una tarea (solo permitida al propietario)
app.put('/api/tasks/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }

  const id = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === id && (t.userId === user.id || t.username === user.username));

  if (!task) {
    return res.status(404).json({ success: false, error: 'Tarea no encontrada o sin permisos.' });
  }

  // Título
  if (req.body.title && typeof req.body.title === 'string' && req.body.title.trim()) {
    task.title = req.body.title.trim();
  }

  // Descripción
  if (req.body.description !== undefined) {
    task.description = String(req.body.description).trim();
  }

  // Carpeta
  if (req.body.folderId !== undefined) {
    task.folderId = req.body.folderId;
  }

  // Prioridad
  if (req.body.priority && ['alta', 'media', 'baja'].includes(req.body.priority)) {
    task.priority = req.body.priority;
  }

  // Fecha de Vencimiento
  if (req.body.dueDate !== undefined) {
    task.dueDate = req.body.dueDate || null;
  }

  // Estado ('pendiente', 'en_curso', 'completado')
  if (req.body.status && ['pendiente', 'en_curso', 'completado'].includes(req.body.status)) {
    task.status = req.body.status;
    task.done = (task.status === 'completado');
  } else if (req.body.done !== undefined) {
    task.done = Boolean(req.body.done);
    task.status = task.done ? 'completado' : 'pendiente';
  }

  // Mini Tareas (Subtasks)
  if (Array.isArray(req.body.subtasks)) {
    task.subtasks = req.body.subtasks.map((st, i) => ({
      id: st.id || i + 1,
      title: String(st.title || '').trim(),
      done: Boolean(st.done)
    })).filter(st => st.title !== '');
  }

  task.updatedAt = new Date().toISOString();
  res.json({ success: true, data: task });
});

// Eliminar tarea (solo permitida al propietario)
app.delete('/api/tasks/:id', (req, res) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'No autorizado.' });
  }

  const id = parseInt(req.params.id, 10);
  const index = tasks.findIndex(t => t.id === id && (t.userId === user.id || t.username === user.username));

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Tarea no encontrada o sin permisos.' });
  }

  const deleted = tasks.splice(index, 1)[0];
  console.log(`[TAREA ELIMINADA] ID: ${deleted.id} [Usuario: ${user.username}]`);
  res.json({ success: true, data: deleted });
});

// Raíz de la API
app.get('/', (req, res) => {
  res.json({
    name: 'TaskFlow Pro & Subtasks API',
    version: VERSION,
    endpoints: {
      health: '/health',
      info: '/api/info',
      folders: '/api/folders',
      tasks: '/api/tasks'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(` TaskFlow Pro Backend API v${VERSION}`);
  console.log(` Puerto: ${PORT}`);
  console.log(` Hostname: ${os.hostname()}`);
  console.log(`=========================================`);
});
