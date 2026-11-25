const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = process.env.APP_VERSION || '2.0.0';
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
// Almacén de Carpetas / Categorías
// ==========================================================
let folders = [
  { id: 'trabajo', name: 'Trabajo', color: '#0284c7', icon: 'fa-briefcase', createdAt: new Date().toISOString() },
  { id: 'estudio', name: 'Estudio (UTP)', color: '#7c3aed', icon: 'fa-graduation-cap', createdAt: new Date().toISOString() },
  { id: 'personal', name: 'Personal', color: '#059669', icon: 'fa-user', createdAt: new Date().toISOString() },
  { id: 'ideas', name: 'Proyectos & Ideas', color: '#d97706', icon: 'fa-lightbulb', createdAt: new Date().toISOString() }
];

// ==========================================================
// Almacén de Tareas / Notas
// ==========================================================
let tasks = [
  {
    id: 1,
    title: 'Preparar diapositivas de arquitectura AWS',
    description: 'Incluir diagramas de VPC, ECS Fargate, ECR y Application Load Balancer.',
    folderId: 'estudio',
    priority: 'alta',
    done: true,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 2,
    title: 'Verificar pipeline de Terraform',
    description: 'Comprobar que terraform apply e idempotencia funcionen al 100%.',
    folderId: 'trabajo',
    priority: 'alta',
    done: true,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 3,
    title: 'Revisar notas del examen de Tópicos Especiales',
    description: 'Estudiar conceptos de integración y entrega continua.',
    folderId: 'estudio',
    priority: 'media',
    done: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 4,
    title: 'Organizar archivos del semestre',
    description: 'Respaldar tareas y proyectos en la nube.',
    folderId: 'personal',
    priority: 'baja',
    done: false,
    createdAt: new Date().toISOString()
  }
];

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
    service: 'To-Do & Notes Service Pro',
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
// ENDPOINTS DE CARPETAS / CATEGORÍAS
// ==========================================================

// Obtener todas las carpetas con conteo dinámico de tareas
app.get('/api/folders', (req, res) => {
  const foldersWithCounts = folders.map(f => {
    const taskCount = tasks.filter(t => t.folderId === f.id).length;
    const pendingCount = tasks.filter(t => t.folderId === f.id && !t.done).length;
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

// Crear nueva carpeta personalizada
app.post('/api/folders', (req, res) => {
  const { name, color, icon } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ success: false, error: 'El nombre de la carpeta es obligatorio.' });
  }

  // Generar ID a partir del nombre
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
  const id = `${slug}-${Date.now().toString(36)}`;

  const newFolder = {
    id,
    name: name.trim(),
    color: color || '#4f46e5',
    icon: icon || 'fa-folder',
    createdAt: new Date().toISOString()
  };

  folders.push(newFolder);
  console.log(`[CARPETA CREADA] ID: ${newFolder.id} - "${newFolder.name}"`);
  res.status(201).json({ success: true, data: { ...newFolder, taskCount: 0, pendingCount: 0 } });
});

// Eliminar carpeta
app.delete('/api/folders/:id', (req, res) => {
  const { id } = req.params;
  const index = folders.findIndex(f => f.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Carpeta no encontrada.' });
  }

  const deletedFolder = folders.splice(index, 1)[0];
  // Reasignar tareas que estaban en esta carpeta a 'general' o mantenerlas huérfanas
  tasks.forEach(t => {
    if (t.folderId === id) {
      t.folderId = 'general';
    }
  });

  console.log(`[CARPETA ELIMINADA] ID: ${deletedFolder.id}`);
  res.json({ success: true, data: deletedFolder });
});

// ==========================================================
// ENDPOINTS DE TAREAS / NOTAS
// ==========================================================

// Obtener tareas con filtros avanzados (por carpeta, estado o búsqueda de texto)
app.get('/api/tasks', (req, res) => {
  const { folderId, done, priority, search } = req.query;
  let result = [...tasks];

  // Filtro por carpeta
  if (folderId && folderId !== 'all') {
    result = result.filter(t => t.folderId === folderId);
  }

  // Filtro por estado
  if (done !== undefined && done !== '') {
    const isDone = done === 'true';
    result = result.filter(t => t.done === isDone);
  }

  // Filtro por prioridad
  if (priority && priority !== 'all') {
    result = result.filter(t => t.priority === priority);
  }

  // Búsqueda por texto (en título o descripción)
  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    result = result.filter(t => 
      t.title.toLowerCase().includes(term) || 
      (t.description && t.description.toLowerCase().includes(term))
    );
  }

  res.json({
    success: true,
    count: result.length,
    total: tasks.length,
    data: result
  });
});

// Crear tarea / nota
app.post('/api/tasks', (req, res) => {
  const { title, description, folderId, priority, dueDate } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, error: 'El título de la tarea es obligatorio.' });
  }

  const newTask = {
    id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
    title: title.trim(),
    description: description && typeof description === 'string' ? description.trim() : '',
    folderId: folderId || (folders.length > 0 ? folders[0].id : 'general'),
    priority: priority && ['alta', 'media', 'baja'].includes(priority) ? priority : 'media',
    dueDate: dueDate || null,
    done: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  console.log(`[TAREA CREADA] ID: ${newTask.id} - "${newTask.title}" [Carpeta: ${newTask.folderId}]`);
  res.status(201).json({ success: true, data: newTask });
});

// Actualizar tarea (completar, editar título, descripción, carpeta o prioridad)
app.put('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ success: false, error: 'Tarea no encontrada.' });
  }

  if (req.body.done !== undefined) {
    task.done = Boolean(req.body.done);
  }
  if (req.body.title && typeof req.body.title === 'string' && req.body.title.trim()) {
    task.title = req.body.title.trim();
  }
  if (req.body.description !== undefined) {
    task.description = String(req.body.description).trim();
  }
  if (req.body.folderId !== undefined) {
    task.folderId = req.body.folderId;
  }
  if (req.body.priority && ['alta', 'media', 'baja'].includes(req.body.priority)) {
    task.priority = req.body.priority;
  }

  res.json({ success: true, data: task });
});

// Eliminar tarea
app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Tarea no encontrada.' });
  }

  const deleted = tasks.splice(index, 1)[0];
  console.log(`[TAREA ELIMINADA] ID: ${deleted.id}`);
  res.json({ success: true, data: deleted });
});

// Raíz de la API
app.get('/', (req, res) => {
  res.json({
    name: 'TaskFlow / To-Do & Notes API Pro',
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
  console.log(` TaskFlow Backend API v${VERSION}`);
  console.log(` Puerto: ${PORT}`);
  console.log(` Hostname: ${os.hostname()}`);
  console.log(`=========================================`);
});
