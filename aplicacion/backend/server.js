const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = process.env.APP_VERSION || '1.1.0';
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for Amazon CloudWatch
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - Host: ${os.hostname()}`);
  });
  next();
});

// In-memory Task store (con tareas reales de ejemplo)
let tasks = [
  {
    id: 1,
    title: 'Preparar diapositivas y arquitectura para la demo',
    category: 'Estudio',
    priority: 'alta',
    done: false,
    createdAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 2,
    title: 'Verificar pipeline de Terraform en AWS',
    category: 'Trabajo',
    priority: 'alta',
    done: true,
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 3,
    title: 'Probar imágenes Docker de frontend y backend',
    category: 'Trabajo',
    priority: 'media',
    done: true,
    createdAt: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 4,
    title: 'Revisar logs en CloudWatch y métricas de Fargate',
    category: 'Estudio',
    priority: 'baja',
    done: false,
    createdAt: new Date().toISOString()
  }
];

// Health Check Endpoint (usado por el ALB Target Group)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'todo-backend-api',
    version: VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    hostname: os.hostname()
  });
});

// Telemetría & Metadata del contenedor (para el modal de configuración DevOps)
app.get('/api/info', (req, res) => {
  res.json({
    service: 'To-Do List API Service',
    version: VERSION,
    environment: ENVIRONMENT,
    hostname: os.hostname(),
    platform: `${os.type()} ${os.arch()}`,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    awsRegion: process.env.AWS_REGION || 'us-east-1'
  });
});

// Obtener todas las tareas (con soporte de filtro opcional por categoría o estado)
app.get('/api/tasks', (req, res) => {
  const { category, done } = req.query;
  let filtered = [...tasks];

  if (category) {
    filtered = filtered.filter(t => t.category.toLowerCase() === category.toLowerCase());
  }
  if (done !== undefined) {
    const isDone = done === 'true';
    filtered = filtered.filter(t => t.done === isDone);
  }

  res.json({
    success: true,
    count: filtered.length,
    total: tasks.length,
    data: filtered
  });
});

// Crear nueva tarea
app.post('/api/tasks', (req, res) => {
  const { title, category, priority } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, error: 'El título de la tarea es obligatorio.' });
  }

  const newTask = {
    id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
    title: title.trim(),
    category: category && ['Trabajo', 'Estudio', 'Personal'].includes(category) ? category : 'General',
    priority: priority && ['alta', 'media', 'baja'].includes(priority) ? priority : 'media',
    done: false,
    createdAt: new Date().toISOString()
  };

  tasks.unshift(newTask);
  console.log(`[NUEVA TAREA] ID: ${newTask.id} - "${newTask.title}" [${newTask.category} | ${newTask.priority}]`);
  res.status(201).json({ success: true, data: newTask });
});

// Actualizar estado o datos de una tarea
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
  if (req.body.priority && ['alta', 'media', 'baja'].includes(req.body.priority)) {
    task.priority = req.body.priority;
  }
  if (req.body.category) {
    task.category = req.body.category;
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
    name: 'To-Do List API REST',
    version: VERSION,
    endpoints: {
      health: '/health',
      info: '/api/info',
      tasks: '/api/tasks'
    }
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(` To-Do List Backend API en ejecución`);
  console.log(` Puerto: ${PORT}`);
  console.log(` Host: ${os.hostname()}`);
  console.log(`=========================================`);
});
