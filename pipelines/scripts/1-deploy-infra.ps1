# Script PowerShell para ejecutar localmente el Pipeline 1 (Infraestructura con Terraform)
param(
    [string]$Action = "apply"
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Pipeline 1: Infraestructura como Codigo (Terraform)" -ForegroundColor Cyan
Write-Host "  Accion: $Action" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

Set-Location -Path "$PSScriptRoot/../../terraform"

Write-Host "`n1. Verificando formato de Terraform..." -ForegroundColor Yellow
terraform fmt -check

Write-Host "`n2. Inicializando Terraform..." -ForegroundColor Yellow
terraform init

Write-Host "`n3. Validando configuracion..." -ForegroundColor Yellow
terraform validate

if ($Action -eq "plan") {
    Write-Host "`n4. Generando plan..." -ForegroundColor Yellow
    terraform plan
} elseif ($Action -eq "apply") {
    Write-Host "`n4. Aplicando infraestructura..." -ForegroundColor Yellow
    terraform apply -auto-approve
} elseif ($Action -eq "destroy") {
    Write-Host "`n4. Destruyendo infraestructura..." -ForegroundColor Red
    terraform destroy -auto-approve
} else {
    Write-Host "Accion desconocida: $Action. Use 'plan', 'apply' o 'destroy'." -ForegroundColor Red
}

Set-Location -Path "$PSScriptRoot"
