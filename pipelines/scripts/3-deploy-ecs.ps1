# Script PowerShell para ejecutar localmente el Pipeline 3 (CD: Despliegue en Amazon ECS)
param(
    [string]$ClusterName = "todo-list-devops-cluster",
    [string]$BackendService = "todo-list-devops-backend-service",
    [string]$FrontendService = "todo-list-devops-frontend-service",
    [string]$ProjectName = "todo-list-devops"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Pipeline 3: Despliegue Continuo a Amazon ECS Fargate" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Write-Host "Forzando nuevo despliegue de Backend..." -ForegroundColor Yellow
aws ecs update-service --cluster $ClusterName --service $BackendService --force-new-deployment | Out-Null

Write-Host "Forzando nuevo despliegue de Frontend..." -ForegroundColor Yellow
aws ecs update-service --cluster $ClusterName --service $FrontendService --force-new-deployment | Out-Null

Write-Host "Esperando estabilizacion de servicios en ECS..." -ForegroundColor Yellow
aws ecs wait services-stable --cluster $ClusterName --services $BackendService
aws ecs wait services-stable --cluster $ClusterName --services $FrontendService

Write-Host "`nObteniendo URL del Application Load Balancer..." -ForegroundColor Yellow
$AlbDns = aws elbv2 describe-load-balancers --names "$ProjectName-alb" --query "LoadBalancers[0].DNSName" --output text

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  Despliegue Completado con Exito!" -ForegroundColor Green
Write-Host "  URL Aplicacion Web: http://$AlbDns" -ForegroundColor Green
Write-Host "  URL API Backend:    http://$AlbDns/api/info" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
