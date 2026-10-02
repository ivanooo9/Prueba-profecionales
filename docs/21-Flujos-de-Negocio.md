# 21 - Flujos Principales de Negocio (End-to-End)
**Proyecto:** Profesionales Ecuador V 2.0  
**Ámbito:** Recorridos funcionales completos de los casos de uso principales.

---

## 1. Flujo de Adquisición y Emisión de Certificado de Conversatorio

Este flujo describe cómo un participante adquiere y desbloquea su certificado de horas.

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Cliente / Estudiante
    participant Web as Interfaz Web (/conversatorios)
    participant Route as Public Route Handler
    participant PayPhone as PayPhone / Banco
    participant CertService as CertificateEligibilityService
    participant DB as Prisma DB

    Usuario->>Web: Revisa Conversatorio y Ponencias
    Usuario->>Web: Clic en "Adquirir Certificado por $X.XX"
    alt Pago vía PayPhone
        Web->>Route: Solicita pago (POST /payphone/prepare)
        Route->>PayPhone: Inicia Checkout PayPhone
        PayPhone-->>Usuario: Completa pago con tarjeta
        PayPhone->>Route: Callback de confirmación (POST /payphone/confirm)
        Route->>DB: Registra PayPhoneTransaction APROBADO y otorga acceso
    else Pago vía Transferencia Bancaria
        Web->>Route: Envía comprobante de depósito (POST /payment-requests)
        Route->>DB: Registra PaymentRequest estado PENDIENTE
        Note over DB: Administrador aprueba solicitud desde /admin
    end
    Usuario->>Web: Visualiza ponencias (video-player con permanencia)
    Web->>Route: Completa ponencias (POST /conversatorios/:id/completar-ponencia)
    Route->>CertService: Evalúa asistencia acumulada vs porcentaje mínimo
    CertService-->>Route: Retorna isEligible = true
    Route->>DB: Crea registro en CursoCertificate / Certificate
    Route-->>Web: Habilita botón "Ver / Descargar Certificado"
```

---

## 2. Flujo del Sistema de Afiliados, Referidos y Billetera Digital

```mermaid
sequenceDiagram
    autonumber
    actor Promotor as Afiliado / Promotor
    actor Cliente as Cliente Comprador
    participant Web as Plataforma Web
    participant SaleService as ReferralSaleService
    participant CommService as CommissionService
    participant WalletService as ReferralWalletService
    participant DB as Prisma DB

    Promotor->>Web: Registra perfil de referido y obtiene código único
    Cliente->>Web: Accede mediante enlace con ?ref=CODIGO_PROMOTOR
    Cliente->>Web: Adquiere membresía o certificado
    Web->>SaleService: Atribuye compra al código de referido (ReferralSale)
    SaleService->>CommService: Calcula porcentaje e importe de comisión
    CommService->>WalletService: Registra abono a ReferralWallet (saldo PENDIENTE -> DISPONIBLE)
    Promotor->>Web: Revisa saldo en /referral/wallet y solicita retiro
    Web->>DB: Registra ReferralWithdrawal (estado PENDIENTE)
    Note over DB: Admin procesa transferencia y marca APROBADO
```
