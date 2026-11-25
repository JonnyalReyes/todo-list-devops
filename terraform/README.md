# Instrucciones de Ejecución de Infraestructura con Terraform

Esta carpeta contiene la definición completa de Infraestructura como Código (IaC) para el proyecto en Amazon Web Services (AWS).

---

## 1. Recursos Aprovisionados
1. **Red (VPC):**
   - 1 VPC con DNS activado.
   - 2 Subredes públicas en diferentes zonas de disponibilidad (AZs).
   - 1 Internet Gateway y tablas de ruteo públicas asociadas.
2. **Seguridad:**
   - Security Group para Application Load Balancer (puerto 80).
   - Security Group para ECS Frontend (restringido a tráfico del ALB).
   - Security Group para ECS Backend (restringido a tráfico del ALB y Frontend).
3. **Contenedores & Registro:**
   - 2 Repositorios en Amazon ECR (`backend` y `frontend`) con escaneo y políticas de expiración.
4. **Cómputo en Amazon ECS Fargate:**
   - 1 Clúster ECS con Container Insights activado.
   - 2 Definiciones de Tarea Fargate (Backend NodeJS y Frontend Nginx).
   - 2 Servicios ECS Fargate con auto-recuperación y asociación a Target Groups.
5. **Balanceo de Carga (ALB):**
   - 1 Application Load Balancer público.
   - 2 Target Groups con comprobaciones de estado (`/health`).
   - Reglas de enrutamiento basadas en ruta (`/api*` hacia backend, `/` hacia frontend).
6. **Monitoreo:**
   - 2 Grupos de Logs en Amazon CloudWatch (`/ecs/...`).

---

## 2. Requisitos Previos
* Terraform `>= 1.5.0` instalado.
* AWS CLI configurado con credenciales (`aws configure`) o variables de entorno:
  ```bash
  export AWS_ACCESS_KEY_ID="tu-access-key"
  export AWS_SECRET_ACCESS_KEY="tu-secret-key"
  export AWS_DEFAULT_REGION="us-east-1"
  ```

---

## 3. Pasos de Ejecución Local

### Paso 1: Configurar variables
Copia el archivo de ejemplo y edítalo si necesitas cambiar algún parámetro:
```bash
cp terraform.tfvars.example terraform.tfvars
```
*(Si usas AWS Academy, activa `use_aws_academy_lab_role = true` e indica tu LabRole ARN).*

### Paso 2: Inicializar Terraform
Descarga los proveedores necesarios (AWS):
```bash
terraform init
```

### Paso 3: Validar y Formatear
```bash
terraform fmt -check
terraform validate
```

### Paso 4: Previsualizar el Plan
```bash
terraform plan -out=tfplan
```

### Paso 5: Aplicar la Infraestructura
```bash
terraform apply tfplan
```
*(Al finalizar, se imprimirán en consola los outputs con la URL pública del Load Balancer y los repositorios ECR).*

### Paso 6: Destrucción de Recursos (Al finalizar la demo)
Para evitar consumos de créditos tras la presentación:
```bash
terraform destroy -auto-approve
```
