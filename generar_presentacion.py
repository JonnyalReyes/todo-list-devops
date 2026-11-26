import os
import base64
import requests
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

# ==============================================================================
# CONFIGURACIÓN Y PALETA DE COLORES (DevOps Modern Dark Theme)
# ==============================================================================
BG_DARK      = RGBColor(15, 23, 42)      # #0F172A (Slate 900)
CARD_BG      = RGBColor(30, 41, 59)      # #1E293B (Slate 800)
CARD_BORDER  = RGBColor(51, 65, 85)      # #334155 (Slate 700)
ACCENT_BLUE  = RGBColor(56, 189, 248)    # #38BDF8 (Sky 400)
ACCENT_CYAN  = RGBColor(6, 182, 212)     # #06B6D4 (Cyan 500)
ACCENT_GREEN = RGBColor(52, 211, 153)    # #34D399 (Emerald 400)
ACCENT_AMBER = RGBColor(251, 191, 36)    # #FBBF24 (Amber 400)
ACCENT_PURPLE= RGBColor(192, 132, 252)   # #C084FC (Purple 400)
TEXT_WHITE   = RGBColor(248, 250, 252)   # #F8FAFC (Slate 50)
TEXT_MUTED   = RGBColor(148, 163, 184)   # #94A3B8 (Slate 400)
FONT_HEADING = "Segoe UI"
FONT_BODY    = "Calibri"

def render_mermaid_to_png(graph_code: str, output_path: str):
    """Descarga el gráfico Mermaid renderizado como PNG de alta calidad desde mermaid.ink"""
    print(f"Generando diagrama: {output_path}...")
    graph_bytes = graph_code.encode("utf-8")
    base64_str = base64.b64encode(graph_bytes).decode("ascii")
    # Genera imagen con fondo transparente o blanco para alta legibilidad
    url = f"https://mermaid.ink/img/{base64_str}?bgColor=!white"
    try:
        r = requests.get(url, timeout=30)
        if r.status_code == 200:
            with open(output_path, "wb") as f:
                f.write(r.content)
            print(f"Diagrama guardado exitosamente: {output_path} ({len(r.content)} bytes)")
            return True
        else:
            print(f"Error renderizando Mermaid ({r.status_code}): {r.text}")
    except Exception as e:
        print(f"Excepción renderizando Mermaid: {e}")
    return False

# ==============================================================================
# DIAGRAMAS MERMAID
# ==============================================================================
DIAGRAMA_ARQUITECTURA = """
graph TB
    subgraph Internet [" Internet Publica "]
        User(("Usuario / Navegador"))
    end

    subgraph AWS [" AWS Cloud us-east-2 "]
        IGW["Internet Gateway"]
        ALB["Application Load Balancer (ALB)"]

        subgraph VPC [" Virtual Private Cloud (10.0.0.0/16) "]
            subgraph Subnets [" Subredes Publicas Multi-AZ "]
                TG1["Target Group: Frontend (:80)"]
                TG2["Target Group: Backend (:5000)"]
                ECS_Front["ECS Fargate: Frontend (Nginx :80)<br/>UI Reactiva & Glassmorphism"]
                ECS_Back["ECS Fargate: Backend (Node.js :5000)<br/>REST API & Auth JWT"]
            end
        end

        ECR["Amazon ECR<br/>(Repositorios Docker)"]
        CW["CloudWatch Logs<br/>(Telemetria & Container Insights)"]
        IAM["AWS IAM Roles<br/>(Execution & Task Roles)"]
    end

    User -->|HTTP :80| IGW
    IGW --> ALB
    ALB -->|Ruta: /*| TG1
    TG1 --> ECS_Front
    ALB -->|Ruta: /api/*| TG2
    TG2 --> ECS_Back

    ECR -.->|Docker Pull| ECS_Front
    ECR -.->|Docker Pull| ECS_Back
    ECS_Front -.->|Logs| CW
    ECS_Back -.->|Logs| CW
    IAM -.->|Permisos| ECS_Front
    IAM -.->|Permisos| ECS_Back
"""

DIAGRAMA_CICD = """
graph LR
    subgraph Dev [" 💻 DESARROLLADOR "]
        Git["Git Commit & Push<br/>Branch: main"]
    end

    subgraph GitHub [" 🐙 GITHUB ACTIONS (CI/CD ORCHESTRATOR) "]
        subgraph P1 [" Pipeline 1: Infraestructura (IaC) "]
            T1["Terraform Validate"] --> T2["Sync Recursos Huérfanos"]
            T2 --> T3["Terraform Plan"] --> T4["Terraform Apply"]
            T4 --> T5["Backup State a Caché"]
        end

        subgraph P2 [" Pipeline 2: CI (Integración Continua) "]
            B1["Docker Build Multi-Stage"] --> B2["Tests de Salud & Linting"]
            B2 --> B3["Push a Amazon ECR"]
        end

        subgraph P3 [" Pipeline 3: CD (Despliegue Continuo) "]
            D1["ECS Force New Deployment"] --> D2["Wait Services Stable"]
            D2 --> D3["Smoke Tests en Vivo (ALB)"]
        end
    end

    subgraph AWS_Prod [" ☁️ PRODUCCIÓN EN AWS "]
        ECS_Live["🚀 ECS Fargate Rolling Update<br/>(Zero Downtime Deployment)"]
    end

    Git -->|Disparador: terraform/**| P1
    Git -->|Disparador: aplicacion/**| P2
    P2 -->|Workflow Run Éxito| P3
    P1 -.->|Infraestructura Lista| P3
    P3 -->|Rolling Update| ECS_Live
"""

# ==============================================================================
# FUNCIONES AUXILIARES PARA CREAR ELEMENTOS DE DIAPOSITIVAS
# ==============================================================================
def create_base_slide(prs):
    """Crea una diapositiva en blanco con fondo oscuro Slate 900"""
    blank_layout = prs.slide_layouts[6] # Blank
    slide = prs.slides.add_slide(blank_layout)
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_DARK
    bg.line.fill.background()
    return slide

def add_header(slide, badge_text, title_text, category_color=ACCENT_BLUE):
    """Agrega un encabezado moderno con badge de categoría y título con degradado visual"""
    # Badge pequeño
    badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.4), Inches(4.5), Inches(0.35))
    badge.fill.solid()
    badge.fill.fore_color.rgb = CARD_BG
    badge.line.color.rgb = category_color
    badge.line.width = Pt(1)
    tf_b = badge.text_frame
    tf_b.word_wrap = True
    p_b = tf_b.paragraphs[0]
    p_b.text = badge_text.upper()
    p_b.font.size = Pt(9.5)
    p_b.font.bold = True
    p_b.font.color.rgb = category_color
    p_b.font.name = FONT_HEADING
    p_b.alignment = PP_ALIGN.CENTER

    # Título Principal
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.5), Inches(0.8))
    tf_t = title_box.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = title_text
    p_t.font.size = Pt(24)
    p_t.font.bold = True
    p_t.font.color.rgb = TEXT_WHITE
    p_t.font.name = FONT_HEADING

    # Línea divisoria decorativa
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.5), Inches(11.733), Inches(0.02))
    line.fill.solid()
    line.fill.fore_color.rgb = CARD_BORDER
    line.line.fill.background()

def add_card(slide, left, top, width, height, title, items, badge="", accent_color=ACCENT_BLUE):
    """Agrega una tarjeta estilizada con título, viñetas formateadas y borde acentuado"""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = CARD_BG
    card.line.color.rgb = CARD_BORDER
    card.line.width = Pt(1.2)

    # Contenedor de texto
    tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), width - Inches(0.4), height - Inches(0.35))
    tf = tb.text_frame
    tf.word_wrap = True

    # Título de la tarjeta
    p0 = tf.paragraphs[0]
    p0.text = title
    p0.font.size = Pt(15)
    p0.font.bold = True
    p0.font.color.rgb = accent_color
    p0.font.name = FONT_HEADING
    p0.space_after = Pt(8)

    # Viñetas o párrafos
    for item in items:
        p = tf.add_paragraph()
        p.space_after = Pt(6)
        if isinstance(item, tuple):
            strong_text, normal_text = item
            run_strong = p.add_run()
            run_strong.text = "• " + strong_text + ": "
            run_strong.font.bold = True
            run_strong.font.size = Pt(11.5)
            run_strong.font.color.rgb = TEXT_WHITE
            run_strong.font.name = FONT_BODY

            run_normal = p.add_run()
            run_normal.text = normal_text
            run_normal.font.size = Pt(11.5)
            run_normal.font.color.rgb = TEXT_MUTED
            run_normal.font.name = FONT_BODY
        else:
            p.text = "• " + item
            p.font.size = Pt(11.5)
            p.font.color.rgb = TEXT_MUTED
            p.font.name = FONT_BODY

# ==============================================================================
# CONSTRUCTOR PRINCIPAL DE LA PRESENTACIÓN
# ==============================================================================
def generar_presentacion():
    # Renderizar diagramas primero
    diag1_path = "arquitectura_aws.png"
    diag2_path = "pipeline_cicd.png"
    render_mermaid_to_png(DIAGRAMA_ARQUITECTURA, diag1_path)
    render_mermaid_to_png(DIAGRAMA_CICD, diag2_path)

    prs = Presentation()
    # Configurar formato panorámico 16:9 (13.333 x 7.5 pulgadas)
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # --------------------------------------------------------------------------
    # SLIDE 1: PORTADA
    # --------------------------------------------------------------------------
    s1 = create_base_slide(prs)

    # Tarjeta de fondo de la portada
    cover_box = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.2), Inches(1.0), Inches(10.933), Inches(5.5))
    cover_box.fill.solid()
    cover_box.fill.fore_color.rgb = CARD_BG
    cover_box.line.color.rgb = ACCENT_BLUE
    cover_box.line.width = Pt(1.5)

    tb1 = s1.shapes.add_textbox(Inches(1.8), Inches(1.4), Inches(9.7), Inches(4.7))
    tf1 = tb1.text_frame
    tf1.word_wrap = True

    p = tf1.paragraphs[0]
    p.text = "UNIVERSIDAD TECNOLÓGICA DE PANAMÁ"
    p.font.size = Pt(14)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN
    p.font.name = FONT_HEADING
    p.space_after = Pt(2)

    p = tf1.add_paragraph()
    p.text = "Facultad de Ingeniería de Sistemas Computacionales • Tópicos Especiales 1"
    p.font.size = Pt(11)
    p.font.color.rgb = TEXT_MUTED
    p.font.name = FONT_BODY
    p.space_after = Pt(24)

    p = tf1.add_paragraph()
    p.text = "TaskFlow Pro v2.3"
    p.font.size = Pt(36)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.font.name = FONT_HEADING
    p.space_after = Pt(8)

    p = tf1.add_paragraph()
    p.text = "Arquitectura Cloud-Native, Infraestructura como Código (IaC) y Despliegue Continuo (CI/CD) en Amazon Web Services (AWS)"
    p.font.size = Pt(16)
    p.font.color.rgb = ACCENT_BLUE
    p.font.name = FONT_HEADING
    p.space_after = Pt(32)

    p = tf1.add_paragraph()
    p.text = "👨‍💻 Estudiante: Jonathan Reyes"
    p.font.size = Pt(13)
    p.font.bold = True
    p.font.color.rgb = TEXT_WHITE
    p.font.name = FONT_BODY

    p = tf1.add_paragraph()
    p.text = "📅 Proyecto Semestral 2026 • DevOps & Cloud Architecture"
    p.font.size = Pt(11.5)
    p.font.color.rgb = TEXT_MUTED
    p.font.name = FONT_BODY

    # --------------------------------------------------------------------------
    # SLIDE 2: INTRODUCCIÓN Y PROBLEMÁTICA
    # --------------------------------------------------------------------------
    s2 = create_base_slide(prs)
    add_header(s2, "01. Contexto y Objetivos", "Planteamiento del Problema y Solución Propuesta")

    add_card(s2, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1),
             "⚠️ Desafíos Tradicionales", [
                 ("Despliegues Manuales", "Procesos propensos a error humano, comandos inconsistentes y lentitud de entrega."),
                 ("Caídas de Servicio (Downtime)", "Interrupción del servicio para los usuarios al actualizar versiones en producción."),
                 ("Inconsistencia de Entornos", "El clásico problema 'en mi máquina funciona' por diferencias de librerías y OS."),
                 ("Falta de Observabilidad", "Dificultad para diagnosticar fallos en producción sin métricas centralizadas ni telemetría."),
                 ("Costos Ociosos", "Servidores virtuales tradicionales encendidos 24/7 sin optimización de recursos.")
             ], accent_color=RGBColor(248, 113, 113))

    add_card(s2, Inches(6.9), Inches(1.8), Inches(5.6), Inches(5.1),
             "✅ Enfoque DevOps & Cloud Native", [
                 ("Contenedores Docker", "Empaquetado ligero e inmutable de Frontend (Nginx) y Backend (Node.js)."),
                 ("Infraestructura como Código (IaC)", "Terraform para aprovisionar y destruir toda la nube de forma determinista."),
                 ("Automatización CI/CD", "3 pipelines orquestados en GitHub Actions sin intervención manual requerida."),
                 ("Zero-Downtime Rolling Updates", "AWS ECS Fargate actualiza contenedores progresivamente con verificación de salud."),
                 ("Telemetría en Tiempo Real", "Logs centralizados en CloudWatch y telemetría DevOps visible en la UI.")
             ], accent_color=ACCENT_GREEN)

    # --------------------------------------------------------------------------
    # SLIDE 3: LA APLICACIÓN - TASKFLOW PRO v2.3
    # --------------------------------------------------------------------------
    s3 = create_base_slide(prs)
    add_header(s3, "02. Funcionalidades del Software", "TaskFlow Pro v2.3: Gestión Inteligente de Tareas")

    add_card(s3, Inches(0.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "📋 Gestión de Tareas & Carpetas", [
                 ("CRUD Completo", "Creación, edición, completado y eliminación atómica."),
                 ("Prioridades Visuales", "Clasificación en Urgente, Alta, Media y Baja con badges temáticos."),
                 ("Carpetas Dinámicas", "Organización por proyectos (Trabajo, Estudio, Personal) con conteo automático."),
                 ("Búsqueda & Filtros", "Búsqueda en tiempo real por texto y filtrado por estado de finalización.")
             ], accent_color=ACCENT_BLUE)

    add_card(s3, Inches(4.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "✨ Experiencia Interactiva (UX)", [
                 ("Drag & Drop Fluido", "Arrastre de tareas para reordenamiento personalizado con soporte táctil."),
                 ("Persistencia de Orden", "Guardado de orden custom mediante endpoint dedicado (PUT /api/tasks/reorder)."),
                 ("Modo Oscuro / Claro", "Diseño Glassmorphism de alto contraste con persistencia en localStorage."),
                 ("Botón Actualizar", "Sincronización manual con animación giratoria de estado.")
             ], accent_color=ACCENT_PURPLE)

    add_card(s3, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "🔐 Seguridad & Telemetría", [
                 ("Autenticación JWT", "Registro e inicio de sesión seguro con tokens stateless en localStorage."),
                 ("Protección de Endpoints", "Middleware de validación de token y hashing de contraseñas con Bcrypt."),
                 ("Telemetría DevOps en Vivo", "Modal interactivo que muestra Hostname del contenedor, latencia y salud."),
                 ("Healthchecks Nativos", "Endpoints `/health` en Frontend y Backend para monitoreo del ALB.")
             ], accent_color=ACCENT_CYAN)

    # --------------------------------------------------------------------------
    # SLIDE 4: TECNOLOGÍAS UTILIZADAS - DESARROLLO
    # --------------------------------------------------------------------------
    s4 = create_base_slide(prs)
    add_header(s4, "03. Stack Tecnológico", "Tecnologías de Desarrollo de la Aplicación")

    add_card(s4, Inches(0.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "🌐 Frontend Web", [
                 ("HTML5 Semántico", "Estructura accesible con separación de componentes y modales dinámicos."),
                 ("CSS3 Moderno", "Variables CSS globales, Glassmorphism, animaciones y diseño responsivo móvil."),
                 ("Vanilla JavaScript (ES6+)", "Arquitectura modular sin frameworks pesados, logrando carga instantánea (<100ms)."),
                 ("Nginx Alpine", "Servidor web HTTP ultraeficiente para servir archivos estáticos con compresión gzip.")
             ], accent_color=ACCENT_BLUE)

    add_card(s4, Inches(4.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "⚙️ Backend API REST", [
                 ("Node.js 20 LTS", "Entorno de ejecución asíncrono y de alto rendimiento basado en el motor V8."),
                 ("Express.js Framework", "Enrutamiento modular con 14 endpoints RESTful documentados."),
                 ("JSON Web Tokens (JWT)", "Gestión de sesiones seguras y verificación criptográfica de usuarios."),
                 ("Almacenamiento JSON Atómico", "Persistencia de tareas y carpetas con lecturas y escrituras seguras.")
             ], accent_color=ACCENT_GREEN)

    add_card(s4, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "🐳 Contenerización Docker", [
                 ("Multi-Stage Builds", "Separación de capas de compilación y producción para minimizar peso."),
                 ("Imágenes Alpine", "Imágenes ultra compactas (< 45 MB) reduciendo superficie de ataque."),
                 ("Seguridad Non-Root", "Ejecución de procesos bajo usuario sin privilegios administrativos (`appuser`)."),
                 ("Paridad Local / Nube", "Garantía de idéntico comportamiento en desarrollo y en AWS Fargate.")
             ], accent_color=ACCENT_AMBER)

    # --------------------------------------------------------------------------
    # SLIDE 5: TECNOLOGÍAS UTILIZADAS - CLOUD & DEVOPS
    # --------------------------------------------------------------------------
    s5 = create_base_slide(prs)
    add_header(s5, "04. Stack Cloud & DevOps", "Servicios de Amazon Web Services (us-east-2)")

    add_card(s5, Inches(0.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "☁️ Cómputo & Registro", [
                 ("Amazon ECS Fargate", "Orquestación serverless de contenedores; sin aprovisionar ni parchar servidores EC2."),
                 ("Aislamiento Fargate", "Cada tarea corre en su propia máquina virtual dedicada a nivel de micro-VM."),
                 ("Amazon ECR", "Registro privado de imágenes Docker con escaneo continuo de vulnerabilidades."),
                 ("Lifecycle Policies", "Retención automática de las últimas 10 imágenes para optimizar costos de storage.")
             ], accent_color=ACCENT_BLUE)

    add_card(s5, Inches(4.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "🌐 Red & Balanceo", [
                 ("Amazon VPC Dedicada", "Red virtual aislada (`10.0.0.0/16`) con subredes públicas distribuidas en 2 AZs."),
                 ("Internet Gateway (IGW)", "Salida y entrada controlada de tráfico hacia la red pública."),
                 ("Application Load Balancer", "Balanceador capa 7 que enruta tráfico hacia Frontend (`/*`) y Backend (`/api/*`)."),
                 ("Target Groups IP", "Grupos de destino en modo IP integrados directamente con la red awsvpc.")
             ], accent_color=ACCENT_CYAN)

    add_card(s5, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "🔐 Seguridad & Observabilidad", [
                 ("Security Groups en Cadena", "El tráfico hacia los contenedores solo se permite desde el ALB (Defense in Depth)."),
                 ("AWS IAM Roles", "Roles diferenciados para Execution (pull de ECR/Logs) y Task (permisos de aplicación)."),
                 ("Amazon CloudWatch Logs", "Centralización de logs del Frontend y Backend con retención configurada a 7 días."),
                 ("Container Insights", "Métricas en tiempo real de CPU, memoria y conectividad de red.")
             ], accent_color=ACCENT_PURPLE)

    # --------------------------------------------------------------------------
    # SLIDE 6: INFRAESTRUCTURA COMO CÓDIGO CON TERRAFORM
    # --------------------------------------------------------------------------
    s6 = create_base_slide(prs)
    add_header(s6, "05. Automatización de Infraestructura", "Infraestructura como Código (IaC) con HashiCorp Terraform")

    add_card(s6, Inches(0.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "📐 Enfoque Modular & Declarativo", [
                 ("9 Archivos HCL", "Estructuración limpia: `vpc.tf`, `alb.tf`, `ecs.tf`, `ecr.tf`, `iam.tf`, `security_groups.tf`, etc."),
                 ("Parametrización Completa", "Variables para puertos, nombres de proyecto, versiones y recursos de CPU/RAM."),
                 ("Outputs Exportables", "Generación automática de URLs públicas del ALB y endpoints para consumo en CI/CD."),
                 ("Versionamiento Git", "Toda la topología de red y cómputo auditada bajo control de versiones.")
             ], accent_color=ACCENT_AMBER)

    add_card(s6, Inches(4.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "🔄 Gestión de Estado & Caché", [
                 ("Persistencia de tfstate", "Restauración y guardado automático del estado usando GitHub Actions Cache y Artefactos."),
                 ("Prevención de Pérdida", "Respaldo del estado con retención de 30 días para auditoría y recuperación ante desastres."),
                 ("Ejecución Sin Agente Local", "Todo el ciclo de Terraform se ejecuta en runners limpios de GitHub Actions."),
                 ("Trazabilidad Total", "Cada ejecución de Terraform reporta exactamente qué recursos se crean, modifican o destruyen.")
             ], accent_color=ACCENT_BLUE)

    add_card(s6, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "🛡️ Resiliencia & Auto-Recuperación", [
                 ("Sincronización Huérfana (Paso 7b)", "Detección e importación automática de recursos existentes (ECR, CloudWatch, IAM)."),
                 ("Eliminación de Conflictos", "Recreación limpia de Target Groups si la VPC cambió de ID."),
                 ("Destrucción Rápida (~90s)", "Drenado forzado de tareas ECS y `deregistration_delay = 5s` antes del destroy."),
                 ("Costo Cero al Apagar", "Eliminación completa de ALB, Fargate y VPC cuando la infraestructura no está en uso.")
             ], accent_color=ACCENT_GREEN)

    # --------------------------------------------------------------------------
    # SLIDE 7: ARQUITECTURA DEL PROYECTO (DIAGRAMA VISUAL)
    # --------------------------------------------------------------------------
    s7 = create_base_slide(prs)
    add_header(s7, "06. Arquitectura del Sistema", "Topología de Red, Balanceo y Servicios en Amazon Web Services")

    # Si la imagen existe, la insertamos centrada y de buen tamaño
    if os.path.exists(diag1_path):
        # Medidas para centrar la imagen en la diapositiva
        img_left = Inches(0.8)
        img_top = Inches(1.7)
        img_width = Inches(8.2)
        s7.shapes.add_picture(diag1_path, img_left, img_top, width=img_width)

        # Panel explicativo al lado derecho
        add_card(s7, Inches(9.2), Inches(1.7), Inches(3.3), Inches(5.3),
                 "🔍 Flujo de la Arquitectura", [
                     ("1. Entrada", "El usuario accede mediante HTTP (Puerto 80) a la URL pública del ALB."),
                     ("2. Enrutamiento ALB", "Ruta `/*` redirige al Frontend Nginx; ruta `/api/*` redirige a la API Express."),
                     ("3. Red awsvpc", "Las tareas Fargate corren en subredes públicas con Security Groups estrictos."),
                     ("4. Aislamiento", "El Backend no acepta conexiones directas de Internet; solo tráfico desde el ALB."),
                     ("5. Servicios Auxiliares", "ECR provee las imágenes Docker y CloudWatch recopila logs de ambos servicios.")
                 ], accent_color=ACCENT_CYAN)
    else:
        # Fallback si no descargó imagen
        add_card(s7, Inches(0.8), Inches(1.8), Inches(11.7), Inches(5.1),
                 "Diagrama de Arquitectura", [("Diagrama", "No disponible offline.")])

    # --------------------------------------------------------------------------
    # SLIDE 8: AUTOMATIZACIÓN CI/CD CON GITHUB ACTIONS
    # --------------------------------------------------------------------------
    s8 = create_base_slide(prs)
    add_header(s8, "07. Automatización CI/CD", "Flujo de Integración y Despliegue Continuo Multi-Pipeline")

    if os.path.exists(diag2_path):
        img_left = Inches(0.8)
        img_top = Inches(1.7)
        img_width = Inches(7.8)
        s8.shapes.add_picture(diag2_path, img_left, img_top, width=img_width)

        add_card(s8, Inches(8.8), Inches(1.7), Inches(3.7), Inches(5.3),
                 "🚀 Orquestación de Pipelines", [
                     ("Pipeline 1: Infraestructura", "Ejecutado al modificar `terraform/**` o vía manual. Gestiona plan, apply, sync y destroy."),
                     ("Pipeline 2: CI (Integración)", "Compila imágenes Docker multi-stage, valida sintaxis y publica a Amazon ECR con tags de commit."),
                     ("Pipeline 3: CD (Despliegue)", "Se dispara automáticamente tras el éxito de CI. Ejecuta `update-service --force-new-deployment` en ECS."),
                     ("Smoke Tests en Vivo", "Verifica el estado del Frontend y Backend en la URL del ALB antes de concluir con éxito.")
                 ], accent_color=ACCENT_BLUE)

    # --------------------------------------------------------------------------
    # SLIDE 9: BUENAS PRÁCTICAS DEVOPS, RESILIENCIA Y SEGURIDAD
    # --------------------------------------------------------------------------
    s9 = create_base_slide(prs)
    add_header(s9, "08. Excelencia Operacional", "Seguridad, Alta Disponibilidad y Resiliencia en Producción")

    add_card(s9, Inches(0.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "🛡️ Seguridad en Capas", [
                 ("Defense in Depth", "Firewalling por Security Groups. Ningún contenedor expone puertos innecesarios a Internet."),
                 ("Principio de Mínimo Privilegio", "Roles IAM con políticas restringidas exclusivamente a ECR y CloudWatch."),
                 ("Sin Secretos Hardcodeados", "Credenciales inyectadas mediante GitHub Secrets y variables de entorno."),
                 ("Imágenes Seguras", "Contenedores sin paquetes innecesarios y ejecución con usuario no-root.")
             ], accent_color=ACCENT_CYAN)

    add_card(s9, Inches(4.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "⚡ Alta Disponibilidad & Resiliencia", [
                 ("Zero-Downtime Deployments", "Rolling Updates en Fargate; los contenedores viejos no se apagan hasta que los nuevos están 100% saludables."),
                 ("Healthchecks Continuos", "El ALB monitorea `/health` cada 30 segundos. Si un contenedor falla, ECS lo reemplaza de inmediato."),
                 ("Distribución Multi-AZ", "Subredes en diferentes zonas de disponibilidad para tolerancia a fallas de datacenter."),
                 ("Deregistration Rápida", "Tiempo de drenado optimizado a 5s para evitar bloqueos al detener servicios.")
             ], accent_color=ACCENT_GREEN)

    add_card(s9, Inches(8.8), Inches(1.8), Inches(3.7), Inches(5.1),
             "📊 Observabilidad & Mantenimiento", [
                 ("Logs Centralizados", "Flujo unificado de logs en CloudWatch con stream-prefixes individuales por réplica."),
                 ("Telemetría en Frontend", "Métricas del sistema y respuesta del servidor visibles directamente en la UI del usuario."),
                 ("Desmantelamiento Limpio", "Destrucción total en un solo clic evitando cargos no deseados en la cuenta de AWS."),
                 ("Idempotencia", "Garantía de que re-ejecutar el pipeline genera el mismo estado deseado sin efectos secundarios.")
             ], accent_color=ACCENT_PURPLE)

    # --------------------------------------------------------------------------
    # SLIDE 10: CONCLUSIONES Y DEMOSTRACIÓN EN VIVO
    # --------------------------------------------------------------------------
    s10 = create_base_slide(prs)
    add_header(s10, "09. Conclusiones y Demostración", "Logros del Proyecto y Validación en Vivo")

    add_card(s10, Inches(0.8), Inches(1.8), Inches(5.6), Inches(5.1),
             "🏆 Resultados y Logros Alcanzados", [
                 ("Ciclo DevOps Completo", "Implementación exitosa desde el código fuente hasta la nube con 100% de automatización."),
                 ("Agilidad de Entrega", "Despliegues automáticos a producción en menos de 3 minutos tras cada push a Git."),
                 ("Eficiencia y Costo Óptimo", "Arquitectura Fargate serverless que escala a cero al destruir, sin costos residuales."),
                 ("Experiencia de Usuario Moderna", "Aplicación reactiva con Drag & Drop, autenticación y telemetría avanzada."),
                 ("Infraestructura Resiliente", "Mecanismos de auto-recuperación y sincronización de recursos huérfanos implementados.")
             ], accent_color=ACCENT_GREEN)

    add_card(s10, Inches(6.9), Inches(1.8), Inches(5.6), Inches(5.1),
             "🚀 Puntos Clave para la Demostración", [
                 ("Acceso Público Web", "Carga en vivo desde la URL pública provista por el Application Load Balancer."),
                 ("Credenciales de Prueba", "Usuario: `admin`  |  Contraseña: `12345678` (o registro de nuevo usuario)."),
                 ("Prueba de Funcionalidades", "Creación de carpetas, tareas por prioridad y reordenamiento con Drag & Drop."),
                 ("Validación de Telemetría", "Apertura del modal de telemetría para comprobar latencia y contenedor Fargate."),
                 ("Inspección de Pipelines", "Revisión de las ejecuciones exitosas (checks verdes) en GitHub Actions.")
             ], accent_color=ACCENT_BLUE)

    # Guardar presentación
    nombre_archivo = "Presentacion_Proyecto_DevOps_TaskFlow.pptx"
    prs.save(nombre_archivo)
    print(f"\n¡Presentación generada con éxito!: {nombre_archivo}")
    return nombre_archivo

if __name__ == "__main__":
    generar_presentacion()
