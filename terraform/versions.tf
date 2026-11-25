terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Configuración opcional para Backend remoto S3 (recomendado para equipos)
  # backend "s3" {
  #   bucket         = "mi-bucket-terraform-state"
  #   key            = "devops-triple-pipeline/terraform.tfstate"
  #   region         = "us-east-1"
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "Terraform"
      Course      = "Topicos Especiales 1 - UTP"
    }
  }
}
