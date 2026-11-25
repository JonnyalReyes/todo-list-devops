# Script PowerShell para ejecutar localmente el Pipeline 2 (CI: Build & Push a ECR)
param(
    [string]$AwsRegion = "us-east-2",
    [string]$ProjectName = "todo-list-devops"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Pipeline 2: Construccion y Publicacion en Amazon ECR" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Obtener Account ID de AWS
$AccountId = aws sts get-caller-identity --query "Account" --output text
if (-not $AccountId) {
    Write-Host "Error: No se pudo obtener el Account ID de AWS. Verifique sus credenciales con 'aws configure'." -ForegroundColor Red
    exit 1
}

$Registry = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"
$BackendRepo = "$ProjectName-backend"
$FrontendRepo = "$ProjectName-frontend"

Write-Host "Iniciando sesion en Amazon ECR ($Registry)..." -ForegroundColor Yellow
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin $Registry

Write-Host "`nConstruyendo y subiendo Backend..." -ForegroundColor Yellow
docker build -t "$Registry/$BackendRepo`:latest" "$PSScriptRoot/../../aplicacion/backend"
docker push "$Registry/$BackendRepo`:latest"

Write-Host "`nConstruyendo y subiendo Frontend..." -ForegroundColor Yellow
docker build -t "$Registry/$FrontendRepo`:latest" "$PSScriptRoot/../../aplicacion/frontend"
docker push "$Registry/$FrontendRepo`:latest"

Write-Host "`nImagenes publicadas exitosamente en ECR!" -ForegroundColor Green
