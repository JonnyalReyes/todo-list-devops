const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 5000;
const VERSION = process.env.APP_VERSION || '1.0.0';
const ENVIRONMENT = process.env.NODE_ENV || 'production';

// Middleware
app.use(cors());
app.use(express.json());

// Request logger for CloudWatch
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms - Host: ${os.hostname()}`);
  });
  next();
});

// In-memory Task store (preloaded with sample items for demo)
let tasks = [
  { id: 1, title: 'Aprovisionar VPC y ECS con Terraform', done: true, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 2, title: 'Construir y subir imágenes a Amazon ECR', done: true, createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: 3, title: 'Desplegar servicios en Amazon ECS Fargate', done: false, createdAt: new Date().toISOString() },
  { id: 4, title: 'Demostración en vivo al profesor', done: false, createdAt: new Date().toISOString() }
];

// Health Check Endpoint (used by AWS ALB / ECS Target Group)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'backend-api',
    version: VERSION,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    hostname: os.hostname()
  });
});

// Info Endpoint (demonstrates container metadata in demo)
app.get('/api/info', (req, res) => {
  res.json({
    service: 'DevOps Demo Backend API',
    version: VERSION,
    environment: ENVIRONMENT,
    hostname: os.hostname(),
    platform: `${os.type()} ${os.arch()}`,
    uptimeSeconds: Math.floor(process.uptime()),
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    awsRegion: process.env.AWS_REGION || 'us-east-1 (default)'
  });
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json({
    success: true,
    count: tasks.length,
    data: tasks
  });
});

// Create task
app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ success: false, error: 'El campo "title" es obligatorio.' });
  }

  const newTask = {
    id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
    title: title.trim(),
    done: false,
    createdAt: new Date().toISOString()
  };

  tasks.push(newTask);
  console.log(`[TASK CREATED] ID: ${newTask.id} - "${newTask.title}"`);
  res.status(201).json({ success: true, data: newTask });
});

// Toggle task status
app.put('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ success: false, error: 'Tarea no encontrada.' });
  }

  if (req.body.done !== undefined) {
    task.done = Boolean(req.body.done);
  }
  if (req.body.title && typeof req.body.title === 'string') {
    task.title = req.body.title.trim();
  }

  res.json({ success: true, data: task });
});

// Delete task
app.delete('/api/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = tasks.findIndex(t => t.id === id);

  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Tarea no encontrada.' });
  }

  const deleted = tasks.splice(index, 1)[0];
  console.log(`[TASK DELETED] ID: ${deleted.id}`);
  res.json({ success: true, data: deleted });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Backend API DevOps AWS ECS está en línea.',
    healthEndpoint: '/health',
    infoEndpoint: '/api/info',
    tasksEndpoint: '/api/tasks'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`=========================================`);
  console.log(` Backend API iniciada exitosamente`);
  console.log(` Puerto: ${PORT}`);
  console.log(` Versión: ${VERSION}`);
  console.log(` Hostname / Container ID: ${os.hostname()}`);
  console.log(`=========================================`);
});
