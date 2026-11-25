# Security Group para el Application Load Balancer
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Permitir trafico HTTP de entrada al Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP desde Internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Salida completa permitida hacia los servicios"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# Security Group para el servicio ECS Frontend (Nginx)
resource "aws_security_group" "ecs_frontend" {
  name        = "${var.project_name}-ecs-frontend-sg"
  description = "Trafico hacia las tareas Fargate del Frontend"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP desde el Application Load Balancer"
    from_port       = var.frontend_container_port
    to_port         = var.frontend_container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    description = "Salida permitida (descarga de paquetes, comunicacion externa)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-frontend-sg"
  }
}

# Security Group para el servicio ECS Backend (NodeJS API)
resource "aws_security_group" "ecs_backend" {
  name        = "${var.project_name}-ecs-backend-sg"
  description = "Trafico hacia las tareas Fargate del Backend API"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Puerto API desde el Application Load Balancer"
    from_port       = var.backend_container_port
    to_port         = var.backend_container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description     = "Puerto API directo desde el Frontend"
    from_port       = var.backend_container_port
    to_port         = var.backend_container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_frontend.id]
  }

  egress {
    description = "Salida permitida (CloudWatch, llamadas externas)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-backend-sg"
  }
}
