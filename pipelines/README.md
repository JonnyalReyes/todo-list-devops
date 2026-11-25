# Definición y Documentación de los Tres Pipelines DevOps

Este directorio contiene las definiciones de los tres flujos automatizados de CI/CD exigidos en la asignación del proyecto.

---

## Resumen de los Tres Pipelines

| Pipeline | Propósito | Tecnología | Disparador (Trigger) |
| :--- | :--- | :--- | :--- |
| **Pipeline 1: Infraestructura** | Aprovisionar VPC, ECR, ECS Fargate, ALB y Security Groups | Terraform | Push en `terraform/**` o manual (`workflow_dispatch`) |
| **Pipeline 2: Construcción (CI)** | Empaquetar backend y frontend en Docker y publicarlos en ECR | Docker + AWS ECR | Push en `aplicacion/**` o manual (`workflow_dispatch`) |
| **Pipeline 3: Despliegue (CD)** | Actualizar servicios ECS Fargate, validar estabilidad y healthchecks | AWS CLI / ECS | Automático al terminar Pipeline 2 o manual (`workflow_dispatch`) |

---

## Secretos Requeridos en GitHub Actions

Para que los pipelines operen contra AWS de forma automatizada y sin exponer secretos en el código, deben agregarse los siguientes secretos en el repositorio de GitHub (**Settings > Secrets and variables > Actions > New repository secret**):

* `AWS_ACCESS_KEY_ID`: Tu Access Key de AWS.
* `AWS_SECRET_ACCESS_KEY`: Tu Secret Access Key de AWS.
* `AWS_SESSION_TOKEN`: *(Solo si utilizas AWS Academy / Learner Lab. Si usas cuenta personal, este campo no es necesario).*

---

## Archivos en este Directorio

* `pipeline-1-infra.yml`: Definición del flujo de Infraestructura como Código con Terraform.
* `pipeline-2-ci.yml`: Definición del flujo de Integración Continua (Build Docker y Push ECR).
* `pipeline-3-cd.yml`: Definición del flujo de Despliegue Continuo (Actualización de ECS Fargate y verificación de endpoints).
* `scripts/`: Scripts bash/PowerShell opcionales para replicar cada pipeline manualmente desde la terminal si se desea realizar una demostración local sin GitHub Actions.
