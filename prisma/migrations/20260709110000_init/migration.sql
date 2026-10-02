-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Issuer" (
    "id" SERIAL NOT NULL,
    "ruc" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "nombreEmpresa" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "establecimiento" TEXT NOT NULL DEFAULT '001',
    "puntoEmision" TEXT NOT NULL DEFAULT '001',
    "obligadoContabilidad" BOOLEAN NOT NULL DEFAULT false,
    "regimen" TEXT NOT NULL DEFAULT 'REGIMEN GENERAL',
    "ambiente" INTEGER NOT NULL DEFAULT 1,
    "firmaElectronica" TEXT,
    "codigoSri" TEXT,
    "startSecuencial" TEXT NOT NULL DEFAULT '000000001',
    "password" TEXT NOT NULL DEFAULT '123456',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "planType" TEXT NOT NULL DEFAULT 'MONTHLY',
    "monthlyFee" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "subscriptionEnds" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "professionalProfileId" INTEGER,

    CONSTRAINT "Issuer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "adminPassword" TEXT NOT NULL DEFAULT 'admin1234',
    "adminWhatsapp" TEXT NOT NULL DEFAULT '593999999999',
    "bankAccounts" TEXT NOT NULL DEFAULT 'Banco Pichincha - Ahorros: 2200123456 (Beneficiario: Profesionales Ecuador)
Banco Guayaquil - Corriente: 10293847 (Beneficiario: Profesionales Ecuador)',
    "defaultBalance" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "systemName" TEXT NOT NULL DEFAULT 'Profesionales Ecuador',
    "adminEmail" TEXT,
    "systemLogo" TEXT,
    "loginTitle" TEXT NOT NULL DEFAULT 'Profesionales Ecuador / LATAM',
    "loginSubtitle" TEXT NOT NULL DEFAULT 'El directorio profesional más grande de Ecuador y Latinoamérica.',
    "payphoneToken" TEXT,
    "payphoneStoreId" TEXT,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "kushkiPublicKey" TEXT,
    "kushkiPrivateKey" TEXT,
    "metaDescription" TEXT NOT NULL DEFAULT 'Directorio profesional, agendamiento de citas, educación continua y facturación electrónica.',
    "metaIcon" TEXT,
    "googleVerification" TEXT,
    "footerLogo" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#0A3C84',
    "secondaryColor" TEXT NOT NULL DEFAULT '#0a66c2',
    "fontFamily" TEXT NOT NULL DEFAULT 'Outfit',
    "headingFontFamily" TEXT NOT NULL DEFAULT 'Outfit',
    "facebookUrl" TEXT,
    "instagramUrl" TEXT,
    "youtubeUrl" TEXT,
    "tiktokUrl" TEXT,
    "linkedinUrl" TEXT,
    "cloudinaryCloudName" TEXT,
    "cloudinaryApiKey" TEXT,
    "cloudinaryApiSecret" TEXT,
    "resendApiKey" TEXT,
    "resendFromEmail" TEXT,
    "geminiApiKey" TEXT,
    "geminiProjectName" TEXT,
    "geminiProjectNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "nombres" TEXT NOT NULL,
    "tipoIdentificacion" TEXT NOT NULL,
    "identificacion" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "mail" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "telefono" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER,
    "nombre" TEXT NOT NULL,
    "codigoPrincipal" TEXT NOT NULL,
    "codigoAuxiliar" TEXT,
    "descripcion" TEXT,
    "precio" DOUBLE PRECISION NOT NULL,
    "iva" DOUBLE PRECISION NOT NULL DEFAULT 15.0,
    "imagen" TEXT,
    "defaultCantidad" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "defaultDescuento" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "defaultNota1" TEXT,
    "defaultNota2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "secuencial" TEXT NOT NULL,
    "claveAcceso" TEXT,
    "xmlNoFirmado" TEXT,
    "xmlAutorizado" TEXT,
    "pdfRIDE" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'CREADA',
    "fechaEmision" TIMESTAMP(3) NOT NULL,
    "tipoAmbiente" INTEGER NOT NULL DEFAULT 1,
    "subtotal0" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "subtotalIva" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "valorIva" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total" DOUBLE PRECISION NOT NULL,
    "formaPago" TEXT NOT NULL DEFAULT '01',
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clientId" INTEGER NOT NULL,
    "issuerId" INTEGER NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" SERIAL NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "descuento" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "total" DOUBLE PRECISION NOT NULL,
    "notaExtra1" TEXT,
    "notaExtra2" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "invoiceId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" SERIAL NOT NULL,
    "ruc" TEXT NOT NULL,
    "razonSocial" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "tipo" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "bancoDestino" TEXT NOT NULL,
    "comprobante" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaProcesado" TIMESTAMP(3),
    "staleAdminEmailLastAttemptAt" TIMESTAMP(3),
    "staleAdminEmailSentAt" TIMESTAMP(3),
    "issuerId" INTEGER,
    "certificateId" INTEGER,
    "promotionId" INTEGER,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "nombreCertificado" TEXT,
    "lastCertNameUpdate" TIMESTAMP(3),
    "telefono" TEXT,
    "ciudad" TEXT,
    "requireProfileSetup" BOOLEAN NOT NULL DEFAULT false,
    "setupRedirectUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roleId" INTEGER NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayPhoneTransaction" (
    "id" SERIAL NOT NULL,
    "paymentId" TEXT,
    "clientTransactionId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "statusCode" INTEGER,
    "amount" INTEGER NOT NULL,
    "amountWithoutTax" INTEGER NOT NULL DEFAULT 0,
    "amountWithTax" INTEGER NOT NULL DEFAULT 0,
    "tax" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "reference" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "itemId" INTEGER NOT NULL,
    "metadata" JSONB,
    "payphoneResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayPhoneTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "ProfessionalProfile" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "slug" TEXT,
    "bio" TEXT,
    "slogan" TEXT,
    "photo" TEXT,
    "banner" TEXT,
    "provincia" TEXT,
    "ciudad" TEXT,
    "direccion" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "cedula" TEXT,
    "telefono" TEXT,
    "tarifa" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "callePrincipal" TEXT,
    "referencia" TEXT,
    "cedulaFrontal" TEXT,
    "cedulaPosterior" TEXT,
    "facebook" TEXT,
    "instagram" TEXT,
    "xTwitter" TEXT,
    "linkedin" TEXT,
    "tiktok" TEXT,
    "youtube" TEXT,
    "website" TEXT,
    "whatsapp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "planType" TEXT NOT NULL DEFAULT 'GRATUITO',
    "subscriptionEnds" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "templateId" INTEGER,

    CONSTRAINT "ProfessionalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profession" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "icono" TEXT,
    "imagen" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Profession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Specialty" (
    "id" SERIAL NOT NULL,
    "professionId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "imagen" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Specialty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalProfileSpecialty" (
    "profileId" INTEGER NOT NULL,
    "specialtyId" INTEGER NOT NULL,

    CONSTRAINT "ProfessionalProfileSpecialty_pkey" PRIMARY KEY ("profileId","specialtyId")
);

-- CreateTable
CREATE TABLE "ProfessionalService" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "precio" DOUBLE PRECISION,
    "imagen" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalSchedule" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "dia" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversatorio" (
    "id" SERIAL NOT NULL,
    "slug" TEXT,
    "profileId" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "slogan" TEXT,
    "titulo" TEXT NOT NULL,
    "areaProfesional" TEXT,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "gratuito" BOOLEAN NOT NULL DEFAULT true,
    "permitirCertificadoGratuito" BOOLEAN NOT NULL DEFAULT false,
    "capacidad" INTEGER,
    "capacidadIlimitada" BOOLEAN NOT NULL DEFAULT true,
    "provincia" TEXT,
    "ciudad" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "direccion" TEXT,
    "revistaPdf" TEXT,
    "revistaFlipbook" TEXT,
    "revistaPortada" TEXT,
    "banner" TEXT,
    "galeria" TEXT,
    "youtube" TEXT,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversatorio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversatorioItinerary" (
    "id" SERIAL NOT NULL,
    "conversatorioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,

    CONSTRAINT "ConversatorioItinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversatorioSpeaker" (
    "id" SERIAL NOT NULL,
    "conversatorioId" INTEGER NOT NULL,
    "foto" TEXT,
    "nombre" TEXT NOT NULL,
    "profesion" TEXT,
    "horario" TEXT,
    "slogan" TEXT,
    "tema" TEXT,
    "descripcion" TEXT,
    "redes" TEXT,
    "dayIndex" INTEGER,
    "videoUrl" TEXT,
    "gratuita" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ConversatorioSpeaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversatorioQuestionAnswer" (
    "id" SERIAL NOT NULL,
    "conversatorioId" INTEGER NOT NULL,
    "pregunta" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversatorioQuestionAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Curso" (
    "id" SERIAL NOT NULL,
    "slug" TEXT,
    "profileId" INTEGER,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "slogan" TEXT,
    "titulo" TEXT NOT NULL,
    "areaProfesional" TEXT,
    "descripcion" TEXT,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "gratuito" BOOLEAN NOT NULL DEFAULT true,
    "capacidad" INTEGER,
    "capacidadIlimitada" BOOLEAN NOT NULL DEFAULT true,
    "provincia" TEXT,
    "ciudad" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "direccion" TEXT,
    "revistaPdf" TEXT,
    "revistaFlipbook" TEXT,
    "revistaPortada" TEXT,
    "banner" TEXT,
    "galeria" TEXT,
    "youtube" TEXT,
    "destacado" BOOLEAN NOT NULL DEFAULT false,
    "mediaType" TEXT NOT NULL DEFAULT 'imagen',
    "mediaUrl" TEXT,
    "includesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Curso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoItinerary" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,

    CONSTRAINT "CursoItinerary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoSpeaker" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "foto" TEXT,
    "nombre" TEXT NOT NULL,
    "profesion" TEXT,
    "horario" TEXT,
    "slogan" TEXT,
    "tema" TEXT,
    "descripcion" TEXT,
    "redes" TEXT,
    "dayIndex" INTEGER,
    "videoUrl" TEXT,
    "gratuita" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CursoSpeaker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoModule" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CursoModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoLesson" (
    "id" SERIAL NOT NULL,
    "moduleId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "videoUrl" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "freePreview" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CursoLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoResource" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "CursoResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoTask" (
    "id" SERIAL NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "archivoUrl" TEXT,
    "puntos" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursoTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoSubmission" (
    "id" SERIAL NOT NULL,
    "taskId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "comentario" TEXT,
    "calificacion" DOUBLE PRECISION,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "comentarioFeedback" TEXT,
    "fechaEntrega" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursoSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoCertificate" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "urlPdf" TEXT NOT NULL,

    CONSTRAINT "CursoCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "userId" INTEGER,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "correo" TEXT NOT NULL,
    "motivo" TEXT,
    "fecha" TEXT NOT NULL,
    "hora" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "slug" TEXT,
    "profileId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "imagen" TEXT,
    "pdfUrl" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "contentHtml" TEXT,
    "conversionStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "conversionProgress" INTEGER NOT NULL DEFAULT 0,
    "conversionError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT NOT NULL,
    "beneficios" TEXT,
    "link" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "logo" TEXT,
    "banner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeroCarousel" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "profesionId" INTEGER,
    "especialidadId" INTEGER,
    "titulo" TEXT,
    "subtitulo" TEXT,
    "imageUrl" TEXT NOT NULL,
    "link" TEXT,
    "fechaInicio" TIMESTAMP(3),
    "fechaFin" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroCarousel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditablePage" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditablePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "descripcion" TEXT,
    "caracteristicas" TEXT NOT NULL,
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificateDesign" (
    "id" SERIAL NOT NULL,
    "conversatorioId" INTEGER,
    "cursoId" INTEGER,
    "nombreEvento" TEXT NOT NULL,
    "horas" INTEGER NOT NULL DEFAULT 0,
    "precioActivo" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "precioFinalizado" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "firmaTexto" TEXT,
    "firmaImagen" TEXT,
    "plantillaFondo" TEXT,
    "firmasJson" TEXT,
    "avalesJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificateDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Certificate" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conversatorioId" INTEGER,
    "cursoId" INTEGER,
    "codigo" TEXT NOT NULL,
    "horas" INTEGER NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombreEvento" TEXT NOT NULL,
    "nombreUsuario" TEXT NOT NULL,
    "precioPagado" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'APROBADO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventEnrollment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conversatorioId" INTEGER,
    "cursoId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CursoDiscount" (
    "id" SERIAL NOT NULL,
    "cursoId" INTEGER NOT NULL,
    "porcentaje" DOUBLE PRECISION NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CursoDiscount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventAccessLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "conversatorioId" INTEGER,
    "cursoId" INTEGER,
    "speakerId" INTEGER,
    "lessonId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventAccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileTemplate" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "baseLayout" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionPlan" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "descripcion" TEXT,
    "duracionDias" INTEGER NOT NULL DEFAULT 30,
    "allowCategoryBanner" BOOLEAN NOT NULL DEFAULT false,
    "allowHomeBanner" BOOLEAN NOT NULL DEFAULT false,
    "allowPrioritySearch" BOOLEAN NOT NULL DEFAULT false,
    "allowPopupHome" BOOLEAN NOT NULL DEFAULT false,
    "allowPopupCategory" BOOLEAN NOT NULL DEFAULT false,
    "allowPopupSpecialty" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromotionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalPromotion" (
    "id" SERIAL NOT NULL,
    "profileId" INTEGER NOT NULL,
    "planId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "bannerCategory" TEXT,
    "bannerHome" TEXT,
    "popupImage" TEXT,
    "popupLink" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfessionalPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Issuer_ruc_key" ON "Issuer"("ruc");

-- CreateIndex
CREATE UNIQUE INDEX "Issuer_professionalProfileId_key" ON "Issuer"("professionalProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_identificacion_key" ON "Client"("identificacion");

-- CreateIndex
CREATE UNIQUE INDEX "Product_profileId_codigoPrincipal_key" ON "Product"("profileId", "codigoPrincipal");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_claveAcceso_key" ON "Invoice"("claveAcceso");

-- CreateIndex
CREATE INDEX "PaymentRequest_estado_fechaSolicitud_idx" ON "PaymentRequest"("estado", "fechaSolicitud");

-- CreateIndex
CREATE INDEX "PaymentRequest_staleAdminEmailSentAt_staleAdminEmailLastAtt_idx" ON "PaymentRequest"("staleAdminEmailSentAt", "staleAdminEmailLastAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenId_key" ON "UserSession"("tokenId");

-- CreateIndex
CREATE INDEX "UserSession_userId_revokedAt_expiresAt_createdAt_idx" ON "UserSession"("userId", "revokedAt", "expiresAt", "createdAt");

-- CreateIndex
CREATE INDEX "UserSession_tokenId_userId_idx" ON "UserSession"("tokenId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PayPhoneTransaction_clientTransactionId_key" ON "PayPhoneTransaction"("clientTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_userId_key" ON "ProfessionalProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_slug_key" ON "ProfessionalProfile"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalProfile_cedula_key" ON "ProfessionalProfile"("cedula");

-- CreateIndex
CREATE UNIQUE INDEX "Profession_nombre_key" ON "Profession"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Specialty_professionId_nombre_key" ON "Specialty"("professionId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Conversatorio_slug_key" ON "Conversatorio"("slug");

-- CreateIndex
CREATE INDEX "ConversatorioQuestionAnswer_conversatorioId_idx" ON "ConversatorioQuestionAnswer"("conversatorioId");

-- CreateIndex
CREATE INDEX "ConversatorioQuestionAnswer_conversatorioId_orden_idx" ON "ConversatorioQuestionAnswer"("conversatorioId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "Curso_slug_key" ON "Curso"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CursoSubmission_userId_taskId_key" ON "CursoSubmission"("userId", "taskId");

-- CreateIndex
CREATE UNIQUE INDEX "CursoCertificate_codigo_key" ON "CursoCertificate"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EditablePage_slug_key" ON "EditablePage"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_nombre_key" ON "MembershipPlan"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateDesign_conversatorioId_key" ON "CertificateDesign"("conversatorioId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificateDesign_cursoId_key" ON "CertificateDesign"("cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_codigo_key" ON "Certificate"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "EventEnrollment_userId_conversatorioId_key" ON "EventEnrollment"("userId", "conversatorioId");

-- CreateIndex
CREATE UNIQUE INDEX "EventEnrollment_userId_cursoId_key" ON "EventEnrollment"("userId", "cursoId");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileTemplate_key_key" ON "ProfileTemplate"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PromotionPlan_nombre_key" ON "PromotionPlan"("nombre");

-- AddForeignKey
ALTER TABLE "Issuer" ADD CONSTRAINT "Issuer_professionalProfileId_fkey" FOREIGN KEY ("professionalProfileId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_issuerId_fkey" FOREIGN KEY ("issuerId") REFERENCES "Issuer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_certificateId_fkey" FOREIGN KEY ("certificateId") REFERENCES "Certificate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "ProfessionalPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayPhoneTransaction" ADD CONSTRAINT "PayPhoneTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfile" ADD CONSTRAINT "ProfessionalProfile_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProfileTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Specialty" ADD CONSTRAINT "Specialty_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfileSpecialty" ADD CONSTRAINT "ProfessionalProfileSpecialty_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalProfileSpecialty" ADD CONSTRAINT "ProfessionalProfileSpecialty_specialtyId_fkey" FOREIGN KEY ("specialtyId") REFERENCES "Specialty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalService" ADD CONSTRAINT "ProfessionalService_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalSchedule" ADD CONSTRAINT "ProfessionalSchedule_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversatorio" ADD CONSTRAINT "Conversatorio_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversatorioItinerary" ADD CONSTRAINT "ConversatorioItinerary_conversatorioId_fkey" FOREIGN KEY ("conversatorioId") REFERENCES "Conversatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversatorioSpeaker" ADD CONSTRAINT "ConversatorioSpeaker_conversatorioId_fkey" FOREIGN KEY ("conversatorioId") REFERENCES "Conversatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversatorioQuestionAnswer" ADD CONSTRAINT "ConversatorioQuestionAnswer_conversatorioId_fkey" FOREIGN KEY ("conversatorioId") REFERENCES "Conversatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Curso" ADD CONSTRAINT "Curso_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoItinerary" ADD CONSTRAINT "CursoItinerary_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoSpeaker" ADD CONSTRAINT "CursoSpeaker_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoModule" ADD CONSTRAINT "CursoModule_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoLesson" ADD CONSTRAINT "CursoLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "CursoModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoResource" ADD CONSTRAINT "CursoResource_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CursoLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoTask" ADD CONSTRAINT "CursoTask_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CursoLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoSubmission" ADD CONSTRAINT "CursoSubmission_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "CursoTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoSubmission" ADD CONSTRAINT "CursoSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoCertificate" ADD CONSTRAINT "CursoCertificate_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoCertificate" ADD CONSTRAINT "CursoCertificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateDesign" ADD CONSTRAINT "CertificateDesign_conversatorioId_fkey" FOREIGN KEY ("conversatorioId") REFERENCES "Conversatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CertificateDesign" ADD CONSTRAINT "CertificateDesign_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_conversatorioId_fkey" FOREIGN KEY ("conversatorioId") REFERENCES "Conversatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_conversatorioId_fkey" FOREIGN KEY ("conversatorioId") REFERENCES "Conversatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventEnrollment" ADD CONSTRAINT "EventEnrollment_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CursoDiscount" ADD CONSTRAINT "CursoDiscount_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAccessLog" ADD CONSTRAINT "EventAccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAccessLog" ADD CONSTRAINT "EventAccessLog_conversatorioId_fkey" FOREIGN KEY ("conversatorioId") REFERENCES "Conversatorio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAccessLog" ADD CONSTRAINT "EventAccessLog_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "Curso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAccessLog" ADD CONSTRAINT "EventAccessLog_speakerId_fkey" FOREIGN KEY ("speakerId") REFERENCES "ConversatorioSpeaker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventAccessLog" ADD CONSTRAINT "EventAccessLog_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "CursoLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalPromotion" ADD CONSTRAINT "ProfessionalPromotion_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ProfessionalProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalPromotion" ADD CONSTRAINT "ProfessionalPromotion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "PromotionPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

