# Rol de ejecucion para ECS Tasks (necesario para descargar imagenes de ECR y emitir logs a CloudWatch)
resource "aws_iam_role" "ecs_execution" {
  count = var.use_aws_academy_lab_role ? 0 : 1
  name  = "${var.project_name}-ecs-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Adjuntar politica estandar de ejecucion de tareas ECS
resource "aws_iam_role_policy_attachment" "ecs_execution_standard" {
  count      = var.use_aws_academy_lab_role ? 0 : 1
  role       = aws_iam_role.ecs_execution[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Rol de tarea para ECS (permisos que la propia aplicacion necesita mientras corre)
resource "aws_iam_role" "ecs_task" {
  count = var.use_aws_academy_lab_role ? 0 : 1
  name  = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })
}

# Resolucion dinamica de roles (Soporta cuenta personal o AWS Academy)
locals {
  ecs_execution_role_arn = var.use_aws_academy_lab_role ? var.aws_academy_lab_role_arn : aws_iam_role.ecs_execution[0].arn
  ecs_task_role_arn      = var.use_aws_academy_lab_role ? var.aws_academy_lab_role_arn : aws_iam_role.ecs_task[0].arn
}
