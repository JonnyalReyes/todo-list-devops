output "application_url" {
  description = "URL publica principal para acceder a la aplicacion web (Frontend)"
  value       = "http://${aws_lb.main.dns_name}"
}

output "api_url" {
  description = "URL publica para consumir los endpoints de la API Backend"
  value       = "http://${aws_lb.main.dns_name}/api"
}

output "alb_dns_name" {
  description = "Nombre DNS del Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "ecr_backend_repo_url" {
  description = "URI del repositorio ECR para la imagen del Backend"
  value       = aws_ecr_repository.backend.repository_url
}

output "ecr_frontend_repo_url" {
  description = "URI del repositorio ECR para la imagen del Frontend"
  value       = aws_ecr_repository.frontend.repository_url
}

output "ecs_cluster_name" {
  description = "Nombre del cluster ECS Fargate"
  value       = aws_ecs_cluster.main.name
}

output "ecs_backend_service_name" {
  description = "Nombre del servicio ECS del Backend"
  value       = aws_ecs_service.backend.name
}

output "ecs_frontend_service_name" {
  description = "Nombre del servicio ECS del Frontend"
  value       = aws_ecs_service.frontend.name
}

output "vpc_id" {
  description = "ID de la VPC aprovisionada"
  value       = aws_vpc.main.id
}

output "aws_region" {
  description = "Region de AWS utilizada"
  value       = var.aws_region
}
