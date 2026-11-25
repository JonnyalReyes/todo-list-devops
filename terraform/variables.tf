variable "aws_region" {
  description = "Región de AWS donde se desplegarán los recursos"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Nombre base del proyecto para nombrar recursos"
  type        = string
  default     = "todo-list-devops"
}

variable "environment" {
  description = "Ambiente de despliegue (production, staging, dev)"
  type        = string
  default     = "production"
}

# --- Red (VPC) ---
variable "vpc_cidr" {
  description = "Bloque CIDR para la VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "Lista de bloques CIDR para subredes públicas (mínimo 2 en distintas AZ para ALB)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

# --- Contenedores y Cómputo ---
variable "frontend_container_port" {
  description = "Puerto en el que escucha el contenedor Frontend (Nginx)"
  type        = number
  default     = 80
}

variable "backend_container_port" {
  description = "Puerto en el que escucha el contenedor Backend (NodeJS)"
  type        = number
  default     = 5000
}

variable "frontend_cpu" {
  description = "Unidades de CPU asignadas a la tarea de Fargate para Frontend (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "frontend_memory" {
  description = "Memoria en MB asignada a la tarea de Fargate para Frontend"
  type        = number
  default     = 512
}

variable "backend_cpu" {
  description = "Unidades de CPU asignadas a la tarea de Fargate para Backend (256 = 0.25 vCPU)"
  type        = number
  default     = 256
}

variable "backend_memory" {
  description = "Memoria en MB asignada a la tarea de Fargate para Backend"
  type        = number
  default     = 512
}

variable "frontend_desired_count" {
  description = "Número deseado de réplicas de Frontend en ECS"
  type        = number
  default     = 1
}

variable "backend_desired_count" {
  description = "Número deseado de réplicas de Backend en ECS"
  type        = number
  default     = 1
}

# --- Soporte para AWS Academy / Learner Labs ---
variable "use_aws_academy_lab_role" {
  description = "Activar en true si se ejecuta en AWS Academy Learner Lab (donde no está permitido crear nuevos roles IAM)"
  type        = bool
  default     = true
}

variable "aws_academy_lab_role_arn" {
  description = "ARN del rol existente en AWS Academy (por ejemplo: arn:aws:iam::123456789012:role/LabRole)"
  type        = string
  default     = ""
}
