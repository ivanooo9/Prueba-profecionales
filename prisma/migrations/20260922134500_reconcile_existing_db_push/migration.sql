-- CreateEnum
CREATE TYPE "public"."ProductType" AS ENUM ('CONVERSATORIO', 'CURSO', 'PLAN_AFILIACION', 'PLAN_PROMOCION');

-- CreateEnum
CREATE TYPE "public"."ReferralAccountStatus" AS ENUM ('PENDING_CONFIG', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."ReferralSaleStatus" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "public"."WithdrawalStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO', 'PAGADO');

-- AlterTable
ALTER TABLE "public"."Agreement" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "beneficio" TEXT,
ADD COLUMN     "condiciones" TEXT,
ADD COLUMN     "descuento" DOUBLE PRECISION,
ADD COLUMN     "empresa" TEXT,
ADD COLUMN     "fechaFin" TIMESTAMP(3),
ADD COLUMN     "fechaInicio" TIMESTAMP(3),
ADD COLUMN     "tipoDescuento" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "usuariosElegibles" TEXT NOT NULL DEFAULT 'TODOS';

-- AlterTable
ALTER TABLE "public"."Article" ADD COLUMN     "displayMode" TEXT NOT NULL DEFAULT 'PDF';

-- AlterTable
ALTER TABLE "public"."Conversatorio" ADD COLUMN     "bunnyVideoId" TEXT,
ADD COLUMN     "certificadoInmediato" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "descuentoEstudianteUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "porcentajeMinimoCertificado" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "tiempoMinimoPonenciaMinutos" INTEGER,
ADD COLUMN     "usarTiempoMinimoPonencia" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."ConversatorioItinerary" ADD COLUMN     "orden" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."ConversatorioQuestionAnswer" ADD COLUMN     "destacado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "speakerId" INTEGER,
ADD COLUMN     "userId" INTEGER,
ALTER COLUMN "respuesta" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."ConversatorioSpeaker" ADD COLUMN     "bunnyVideoId" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "public"."Curso" ADD COLUMN     "branchId" INTEGER,
ADD COLUMN     "bunnyVideoId" TEXT,
ADD COLUMN     "categoryId" INTEGER,
ADD COLUMN     "certificadoInmediato" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "descuentoEstudianteUsd" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "docenteId" INTEGER,
ADD COLUMN     "keywords" TEXT,
ADD COLUMN     "porcentajeMinimoCertificado" INTEGER NOT NULL DEFAULT 100,
ADD COLUMN     "professionId" INTEGER,
ADD COLUMN     "specialtyId" INTEGER,
ADD COLUMN     "tiempoMinimoPonenciaMinutos" INTEGER,
ADD COLUMN     "usarTiempoMinimoPonencia" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."CursoLesson" ADD COLUMN     "bunnyVideoId" TEXT;

-- AlterTable
ALTER TABLE "public"."CursoSpeaker" ADD COLUMN     "bunnyVideoId" TEXT;

-- AlterTable
ALTER TABLE "public"."ProfessionalProfile" ADD COLUMN     "banco" TEXT,
ADD COLUMN     "cardPublicToken" TEXT,
ADD COLUMN     "docenteBio" TEXT,
ADD COLUMN     "docenteEspecialidad" TEXT,
ADD COLUMN     "isDocenteActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPonente" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "numeroCuenta" TEXT,
ADD COLUMN     "tipoCuenta" TEXT,
ADD COLUMN     "titularCedula" TEXT,
ADD COLUMN     "titularNombre" TEXT;

-- AlterTable
ALTER TABLE "public"."SystemConfig" ADD COLUMN     "freeInvoiceLimit" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "loginLogo" TEXT,
ADD COLUMN     "premiumInvoiceLimit" INTEGER NOT NULL DEFAULT 50,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPass" TEXT,
ADD COLUMN     "smtpPort" INTEGER DEFAULT 587,
ADD COLUMN     "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpUser" TEXT,
ADD COLUMN     "tiempoMinimoPonenciaMinutos" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "public"."Benefit" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "icono" TEXT NOT NULL DEFAULT 'fa-solid fa-star',
    "imagen" TEXT,
    "categoria" TEXT NOT NULL,
    "requierePlan" TEXT NOT NULL DEFAULT 'GRATUITO',
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Benefit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BillingPlan" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "invoiceLimit" INTEGER NOT NULL DEFAULT 20,
    "duracionDias" INTEGER NOT NULL DEFAULT 30,
    "duracionTipo" TEXT NOT NULL DEFAULT 'MENSUAL',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BillingSubscription" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "invoicesUsed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CommissionConfig" (
    "id" SERIAL NOT NULL,
    "isGeneral" BOOLEAN NOT NULL DEFAULT false,
    "productType" "public"."ProductType",
    "productId" INTEGER,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CursoBranch" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursoBranch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CursoCategory" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "professionId" INTEGER,
    "specialtyId" INTEGER,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursoCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CursoOrder" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "docenteId" INTEGER,
    "userId" INTEGER,
    "estudianteNombre" TEXT NOT NULL,
    "estudianteEmail" TEXT NOT NULL,
    "estudianteTelefono" TEXT NOT NULL,
    "estudianteCedula" TEXT,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "comisionDocente" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comisionPlataforma" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "metodoPago" TEXT NOT NULL DEFAULT 'TRANSFERENCIA',
    "comprobanteUrl" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "observacionesAdmin" TEXT,
    "aprobadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursoOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocenteWallet" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "saldoDisponible" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "saldoPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "saldoRetirado" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocenteWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocenteWalletTransaction" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "concepto" TEXT NOT NULL,
    "orderId" INTEGER,
    "withdrawalId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocenteWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DocenteWithdrawal" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "banco" TEXT NOT NULL,
    "tipoCuenta" TEXT NOT NULL,
    "numeroCuenta" TEXT NOT NULL,
    "titularNombre" TEXT NOT NULL,
    "titularCedula" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "comprobantePagoUrl" TEXT,
    "observacionesAdmin" TEXT,
    "procesadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocenteWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfessionalEducation" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "institucion" TEXT NOT NULL,
    "nivelEstudio" TEXT,
    "tipoCertificado" TEXT,
    "horas" INTEGER,
    "anioEmision" INTEGER NOT NULL,
    "imagen" TEXT NOT NULL,
    "verificado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalEducation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfessionalId" (
    "id" SERIAL NOT NULL,
    "professionalProfileId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "primaryActionType" TEXT DEFAULT 'WHATSAPP',
    "primaryActionTitle" TEXT DEFAULT 'Escríbeme por WhatsApp',
    "primaryActionValue" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'light',
    "buttonStyle" TEXT NOT NULL DEFAULT 'rounded',
    "alignment" TEXT NOT NULL DEFAULT 'center',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfessionalIdAnalytics" (
    "id" SERIAL NOT NULL,
    "professionalId" INTEGER NOT NULL,
    "linkId" INTEGER,
    "eventType" TEXT NOT NULL,
    "sessionIdentifier" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalIdAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfessionalIdBlock" (
    "id" SERIAL NOT NULL,
    "professionalId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "buttonText" TEXT,
    "url" TEXT,
    "targetId" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalIdBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProfessionalIdLink" (
    "id" SERIAL NOT NULL,
    "professionalId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "url" TEXT,
    "targetId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clicksCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalIdLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralAuditLog" (
    "id" SERIAL NOT NULL,
    "referralId" INTEGER,
    "actorId" INTEGER,
    "accion" TEXT NOT NULL,
    "detalle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" "public"."ReferralAccountStatus" NOT NULL DEFAULT 'PENDING_CONFIG',
    "activatedAt" TIMESTAMP(3),
    "nombres" TEXT,
    "apellidos" TEXT,
    "cedula" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "whatsapp" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "provincia" TEXT,
    "pais" TEXT DEFAULT 'Ecuador',
    "banco" TEXT,
    "tipoCuenta" TEXT,
    "numeroCuenta" TEXT,
    "titularNombre" TEXT,
    "titularCedula" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralSale" (
    "id" SERIAL NOT NULL,
    "referralId" INTEGER NOT NULL,
    "clienteNombre" TEXT NOT NULL,
    "clienteCedula" TEXT NOT NULL,
    "clienteEmail" TEXT NOT NULL,
    "clienteTelefono" TEXT NOT NULL,
    "productType" "public"."ProductType" NOT NULL,
    "productId" INTEGER,
    "productName" TEXT NOT NULL,
    "valorPagado" DOUBLE PRECISION NOT NULL,
    "comprobanteUrl" TEXT NOT NULL,
    "comisionCalculada" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "comisionPorcentaje" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "estado" "public"."ReferralSaleStatus" NOT NULL DEFAULT 'PENDIENTE',
    "observacionesAdmin" TEXT,
    "aprobadoAt" TIMESTAMP(3),
    "aprobadoPorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralWallet" (
    "id" SERIAL NOT NULL,
    "referralId" INTEGER NOT NULL,
    "saldoPendiente" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "saldoDisponible" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "saldoRetirado" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralWalletTransaction" (
    "id" SERIAL NOT NULL,
    "walletId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "concepto" TEXT NOT NULL,
    "referralSaleId" INTEGER,
    "withdrawalId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralWalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ReferralWithdrawal" (
    "id" SERIAL NOT NULL,
    "referralId" INTEGER NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "banco" TEXT NOT NULL,
    "tipoCuenta" TEXT NOT NULL,
    "numeroCuenta" TEXT NOT NULL,
    "titularNombre" TEXT NOT NULL,
    "titularCedula" TEXT NOT NULL,
    "observacionesReferido" TEXT,
    "observacionesAdmin" TEXT,
    "comprobantePagoUrl" TEXT,
    "estado" "public"."WithdrawalStatus" NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoleTransitionRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "currentRole" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT 'PROFESSIONAL',
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "motivoSolicitud" TEXT,
    "tituloCertificadoUrl" TEXT,
    "adminObservacion" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaProcesado" TIMESTAMP(3),

    CONSTRAINT "RoleTransitionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentExperience" (
    "id" SERIAL NOT NULL,
    "studentProfileId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PASANTIA_PREPROFESIONAL',
    "empresaInstitucion" TEXT NOT NULL,
    "cargo" TEXT NOT NULL,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "actualmenteTrabajando" BOOLEAN NOT NULL DEFAULT false,
    "descripcionFunciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "StudentExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentExternalCourse" (
    "id" SERIAL NOT NULL,
    "studentProfileId" INTEGER NOT NULL,
    "institucion" TEXT NOT NULL,
    "nombreCurso" TEXT NOT NULL,
    "horas" INTEGER,
    "anioEmision" INTEGER,
    "certificadoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentExternalCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentId" (
    "id" SERIAL NOT NULL,
    "studentProfileId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "primaryActionType" TEXT DEFAULT 'CV_DOWNLOAD',
    "primaryActionTitle" TEXT DEFAULT 'Descargar Hoja de Vida / CV',
    "primaryActionValue" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'academic_blue',
    "buttonStyle" TEXT NOT NULL DEFAULT 'rounded',
    "alignment" TEXT NOT NULL DEFAULT 'center',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentId_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentIdAnalytics" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "linkId" INTEGER,
    "eventType" TEXT NOT NULL,
    "sessionIdentifier" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentIdAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentIdBlock" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FEATURED_PROJECT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "buttonText" TEXT DEFAULT 'Ver Proyecto',
    "url" TEXT,
    "targetId" INTEGER,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentIdBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentIdLink" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT,
    "url" TEXT,
    "targetId" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "clicksCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentIdLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "institucionEducativa" TEXT NOT NULL,
    "carrera" TEXT NOT NULL,
    "estadoCarrera" TEXT NOT NULL DEFAULT 'EN_CURSO',
    "bio" TEXT,
    "foto" TEXT,
    "banner" TEXT,
    "provincia" TEXT,
    "ciudad" TEXT,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT,
    "universityId" INTEGER,
    "facebookUrl" TEXT,
    "githubUrl" TEXT,
    "instagramUrl" TEXT,
    "linkedinUrl" TEXT,
    "tiktokUrl" TEXT,
    "twitterUrl" TEXT,
    "websiteUrl" TEXT,
    "cardPublicToken" TEXT,
    "carnetEstudiante" TEXT,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StudentProject" (
    "id" SERIAL NOT NULL,
    "studentProfileId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "areaTecnologia" TEXT,
    "enlaceRepo" TEXT,
    "imagenUrl" TEXT,
    "fechaRealizacion" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "imagenes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "StudentProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."University" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "siglas" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'UNIVERSIDAD',
    "provincia" TEXT,
    "ciudad" TEXT,
    "logo" TEXT,
    "sitioWeb" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "University_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_nombre_key" ON "public"."BillingPlan"("nombre" ASC);

-- CreateIndex
CREATE INDEX "BillingSubscription_profileId_status_idx" ON "public"."BillingSubscription"("profileId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "CommissionConfig_isGeneral_productType_productId_isActive_idx" ON "public"."CommissionConfig"("isGeneral" ASC, "productType" ASC, "productId" ASC, "isActive" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "CursoOrder_codigo_key" ON "public"."CursoOrder"("codigo" ASC);

-- CreateIndex
CREATE INDEX "CursoOrder_cursoId_estado_idx" ON "public"."CursoOrder"("cursoId" ASC, "estado" ASC);

-- CreateIndex
CREATE INDEX "CursoOrder_docenteId_estado_idx" ON "public"."CursoOrder"("docenteId" ASC, "estado" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "DocenteWallet_profileId_key" ON "public"."DocenteWallet"("profileId" ASC);

-- CreateIndex
CREATE INDEX "DocenteWithdrawal_profileId_estado_idx" ON "public"."DocenteWithdrawal"("profileId" ASC, "estado" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalId_professionalProfileId_key" ON "public"."ProfessionalId"("professionalProfileId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalId_slug_key" ON "public"."ProfessionalId"("slug" ASC);

-- CreateIndex
CREATE INDEX "ProfessionalIdAnalytics_professionalId_eventType_createdAt_idx" ON "public"."ProfessionalIdAnalytics"("professionalId" ASC, "eventType" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralProfile_userId_key" ON "public"."ReferralProfile"("userId" ASC);

-- CreateIndex
CREATE INDEX "ReferralSale_referralId_estado_idx" ON "public"."ReferralSale"("referralId" ASC, "estado" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ReferralWallet_referralId_key" ON "public"."ReferralWallet"("referralId" ASC);

-- CreateIndex
CREATE INDEX "ReferralWithdrawal_referralId_estado_idx" ON "public"."ReferralWithdrawal"("referralId" ASC, "estado" ASC);

-- CreateIndex
CREATE INDEX "RoleTransitionRequest_estado_fechaSolicitud_idx" ON "public"."RoleTransitionRequest"("estado" ASC, "fechaSolicitud" ASC);

-- CreateIndex
CREATE INDEX "RoleTransitionRequest_userId_estado_idx" ON "public"."RoleTransitionRequest"("userId" ASC, "estado" ASC);

-- CreateIndex
CREATE INDEX "StudentExperience_studentProfileId_idx" ON "public"."StudentExperience"("studentProfileId" ASC);

-- CreateIndex
CREATE INDEX "StudentExternalCourse_studentProfileId_idx" ON "public"."StudentExternalCourse"("studentProfileId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentId_slug_key" ON "public"."StudentId"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentId_studentProfileId_key" ON "public"."StudentId"("studentProfileId" ASC);

-- CreateIndex
CREATE INDEX "StudentIdAnalytics_studentId_eventType_createdAt_idx" ON "public"."StudentIdAnalytics"("studentId" ASC, "eventType" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_cardPublicToken_key" ON "public"."StudentProfile"("cardPublicToken" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_slug_key" ON "public"."StudentProfile"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "public"."StudentProfile"("userId" ASC);

-- CreateIndex
CREATE INDEX "StudentProject_studentProfileId_idx" ON "public"."StudentProject"("studentProfileId" ASC);

-- CreateIndex
CREATE INDEX "University_activo_orden_idx" ON "public"."University"("activo" ASC, "orden" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "University_nombre_key" ON "public"."University"("nombre" ASC);

-- CreateIndex
CREATE INDEX "ConversatorioQuestionAnswer_estado_idx" ON "public"."ConversatorioQuestionAnswer"("estado" ASC);

-- CreateIndex
CREATE INDEX "ConversatorioQuestionAnswer_speakerId_idx" ON "public"."ConversatorioQuestionAnswer"("speakerId" ASC);

-- CreateIndex
CREATE INDEX "ConversatorioQuestionAnswer_userId_idx" ON "public"."ConversatorioQuestionAnswer"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_cardPublicToken_key" ON "public"."ProfessionalProfile"("cardPublicToken" ASC);

-- AddForeignKey
ALTER TABLE "public"."BillingSubscription" ADD CONSTRAINT "BillingSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."BillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingSubscription" ADD CONSTRAINT "BillingSubscription_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversatorioQuestionAnswer" ADD CONSTRAINT "ConversatorioQuestionAnswer_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "public"."ConversatorioSpeaker"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ConversatorioQuestionAnswer" ADD CONSTRAINT "ConversatorioQuestionAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Curso" ADD CONSTRAINT "Curso_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "public"."CursoBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Curso" ADD CONSTRAINT "Curso_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CursoCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Curso" ADD CONSTRAINT "Curso_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "public"."ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Curso" ADD CONSTRAINT "Curso_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "public"."Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Curso" ADD CONSTRAINT "Curso_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CursoBranch" ADD CONSTRAINT "CursoBranch_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "public"."CursoCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CursoCategory" ADD CONSTRAINT "CursoCategory_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "public"."Profession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CursoCategory" ADD CONSTRAINT "CursoCategory_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "public"."Specialty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CursoOrder" ADD CONSTRAINT "CursoOrder_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "public"."Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CursoOrder" ADD CONSTRAINT "CursoOrder_docenteId_fkey" FOREIGN KEY ("docenteId") REFERENCES "public"."ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CursoOrder" ADD CONSTRAINT "CursoOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocenteWallet" ADD CONSTRAINT "DocenteWallet_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocenteWalletTransaction" ADD CONSTRAINT "DocenteWalletTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."CursoOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocenteWalletTransaction" ADD CONSTRAINT "DocenteWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."DocenteWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocenteWalletTransaction" ADD CONSTRAINT "DocenteWalletTransaction_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "public"."DocenteWithdrawal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DocenteWithdrawal" ADD CONSTRAINT "DocenteWithdrawal_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfessionalEducation" ADD CONSTRAINT "ProfessionalEducation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "public"."ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfessionalId" ADD CONSTRAINT "ProfessionalId_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "public"."ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfessionalIdAnalytics" ADD CONSTRAINT "ProfessionalIdAnalytics_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "public"."ProfessionalIdLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfessionalIdAnalytics" ADD CONSTRAINT "ProfessionalIdAnalytics_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."ProfessionalId"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfessionalIdBlock" ADD CONSTRAINT "ProfessionalIdBlock_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."ProfessionalId"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfessionalIdLink" ADD CONSTRAINT "ProfessionalIdLink_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "public"."ProfessionalId"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralAuditLog" ADD CONSTRAINT "ReferralAuditLog_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "public"."ReferralProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralProfile" ADD CONSTRAINT "ReferralProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralSale" ADD CONSTRAINT "ReferralSale_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "public"."ReferralProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralWallet" ADD CONSTRAINT "ReferralWallet_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "public"."ReferralProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralWalletTransaction" ADD CONSTRAINT "ReferralWalletTransaction_referralSaleId_fkey" FOREIGN KEY ("referralSaleId") REFERENCES "public"."ReferralSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralWalletTransaction" ADD CONSTRAINT "ReferralWalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."ReferralWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralWalletTransaction" ADD CONSTRAINT "ReferralWalletTransaction_withdrawalId_fkey" FOREIGN KEY ("withdrawalId") REFERENCES "public"."ReferralWithdrawal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ReferralWithdrawal" ADD CONSTRAINT "ReferralWithdrawal_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "public"."ReferralProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoleTransitionRequest" ADD CONSTRAINT "RoleTransitionRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentExperience" ADD CONSTRAINT "StudentExperience_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentExternalCourse" ADD CONSTRAINT "StudentExternalCourse_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentId" ADD CONSTRAINT "StudentId_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentIdAnalytics" ADD CONSTRAINT "StudentIdAnalytics_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "public"."StudentIdLink"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentIdAnalytics" ADD CONSTRAINT "StudentIdAnalytics_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentId"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentIdBlock" ADD CONSTRAINT "StudentIdBlock_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentId"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentIdLink" ADD CONSTRAINT "StudentIdLink_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "public"."StudentId"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "public"."University"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StudentProject" ADD CONSTRAINT "StudentProject_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "public"."StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
