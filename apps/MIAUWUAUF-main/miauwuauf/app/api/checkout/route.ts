import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { sendEmail } from "@/lib/mail";
import { getOrderConfirmationTemplate } from "@/lib/email-templates";
import { getStoreTaxSettings } from "@/lib/store-settings.server";
import { normalizeEcuadorPhone } from "@/lib/phone";
import { formatPrefixedSequence } from "@/lib/utils";
import { reserveNextOrderNumber } from "@/lib/order-number";

interface CheckoutItem {
  id: string;
  nombre: string;
  precio: number;
  quantity: number;
  foto: string;
  descuento?: number;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    // Verificación estricta de sesión (como acodarmos, no hay modo invitado)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debes iniciar sesión para comprar" }, { status: 401 });
    }

    const {
      cart,
      nombre,
      email,
      cedula,
      telefono,
      ciudad,
      direccion,
      metodoPago,
      comprobanteUrl,
      from,
      /** id de orden PAGO_RECHAZADO/RECHAZADO que sustituye el reintento desde perfil */
      replaceOrderId,
    } = await req.json();
    const normalizedTelefono = normalizeEcuadorPhone(telefono);

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
    }

    const storeTaxSettings = await getStoreTaxSettings();
    const taxRate = storeTaxSettings.taxEnabled ? storeTaxSettings.ivaRate : 0;
    const taxFactor = taxRate / 100;
    const surchargeRate = storeTaxSettings.surchargeEnabled ? storeTaxSettings.surchargeRate : 0;
    const surchargeFactor = surchargeRate / 100;

    // Process checkout in a strict transaction to ensure atomic stock validation
    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Precise Stock Check and Data Collection
      const orderItems = [];
      for (const item of (cart as CheckoutItem[])) {
        const product = await tx.product.findUnique({
          where: { id: item.id },
          select: { id: true, slug: true, nombre: true, stock: true, precio: true, descuento: true }
        });

        if (!product) {
          throw new Error(`¡Ups! El producto "${item.nombre}" ya no está disponible en nuestro catálogo.`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`¡Ups! El producto "${product.nombre}" se agotó mientras hacías la compra.`);
        }

        // Use ONLY DB values for pricing to prevent tampering
        const finalPrice = product.precio * (1 - (product.descuento || 0) / 100);
        
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          precio: product.precio,
          precioFinal: finalPrice,
          nombre: product.nombre, // For email template later
          slug: product.slug
        });

        // 2. Stock validated but NOT decremented here (it will be decremented upon Admin Approval)
        // This ensures the product is available at the moment of the request.
      }

      // 3. Recalculate total strictly on server side
      const subtotalServer = orderItems.reduce((acc, item) => acc + (item.precioFinal * item.quantity), 0);
      const ivaServer = subtotalServer * taxFactor;
      const surchargeServer = subtotalServer * surchargeFactor;
      const finalTotalServer = subtotalServer + ivaServer + surchargeServer;

      // 4. Update User Profile (Source of Truth)
      if (ciudad || direccion) {
        await tx.user.update({
          where: { id: session.user?.id as string },
          data: {
            city: ciudad,
            address: direccion
          }
        });
      }

      // 5. Create the order
      const orderNumber = await reserveNextOrderNumber(tx);
      const order = await tx.order.create({
        data: {
          ...(typeof orderNumber === "number" ? { orderNumber } : {}),
          userId: session.user?.id as string,
          total: finalTotalServer,
          pricingSubtotal: subtotalServer,
          pricingIva: ivaServer,
          pricingSurcharge: surchargeServer,
          ivaRate: taxRate,
          taxName: storeTaxSettings.taxName,
          taxEnabled: storeTaxSettings.taxEnabled,
          surchargeRate: storeTaxSettings.surchargeRate,
          surchargeEnabled: storeTaxSettings.surchargeEnabled,
          estado: "PENDIENTE_VALIDACION", // As requested by user, ALL starts pending validation
          nombre: nombre || session.user?.name || "Usuario",
          email: email || session.user?.email || "",
          cedula: cedula || "",
          telefono: normalizedTelefono || "",
          ciudad: ciudad || "",
          direccion: direccion || "",
          metodo: metodoPago || "Transferencia",
          comprobanteUrl: comprobanteUrl || null,
          items: {
            create: orderItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              precio: item.precio,
              precioFinal: item.precioFinal,
            })),
          },
        },
      });

      // Cerrar el ciclo de la orden rechazada: ya no debe mostrarse "pago no procesado" en el historial
      if (
        from === "profile" &&
        replaceOrderId &&
        typeof replaceOrderId === "string" &&
        session.user?.id
      ) {
        const previous = await tx.order.findFirst({
          where: { id: replaceOrderId, userId: session.user.id as string },
        });
        if (
          previous &&
          (previous.estado === "PAGO_RECHAZADO" || previous.estado === "RECHAZADO")
        ) {
          const note = `[Reemplazada por reintento de pago — nueva orden: ${order.id}]`;
          await tx.order.update({
            where: { id: previous.id },
            data: {
              estado: "CANCELADA",
              observacion: [previous.observacion?.trim(), note].filter(Boolean).join("\n"),
            },
          });
        }
      }

      return {
        order,
        orderItems,
        subtotal: subtotalServer,
        iva: ivaServer,
        surcharge: surchargeServer,
        finalTotal: finalTotalServer,
      };
    });

    const { order, orderItems, subtotal, iva, surcharge, finalTotal } = result;
    let orderDisplayId =
      typeof (order as { orderNumber?: unknown }).orderNumber === "number"
        ? ((order as { orderNumber: number }).orderNumber ?? null)
        : null;
    if (!orderDisplayId) {
      const orderedIds = await prisma.order.findMany({
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      const idx = orderedIds.findIndex((item) => item.id === order.id);
      orderDisplayId = idx >= 0 ? idx + 1 : null;
    }
    const orderLabel = formatPrefixedSequence("ORD", orderDisplayId, order.id);
    const isTransferencia = (metodoPago || "").toLowerCase() === "transferencia";

    // Revalidate paths so stock changes reflect instantly for other users
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/tienda");
    revalidatePath("/");
    for (const item of orderItems) {
        revalidatePath(`/tienda/${item.productId}`);
        if (item.slug) {
            revalidatePath(`/tienda/${item.slug}`);
        }
    }

    // Envío de correo: Ahora se envía tanto para PayPal (Pagada) como para Transferencia (Esperando Comprobante)
    if (session.user?.email) {
      // Fetch full user data to get cedula and telefono
      const fullUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, cedula: true, phone: true }
      });

      const emailHtml = getOrderConfirmationTemplate({
        title: isTransferencia ? "¡Orden Recibida! (Esperando Pago)" : "¡Tu compra fue registrada!",
        message: isTransferencia 
          ? "Hemos registrado tu orden. Por favor realiza la transferencia bancaria para que podamos procesar tu envío."
          : "Hemos recibido tu pedido con pago por " + metodoPago + ". Aquí tienes el resumen de tu compra:",
        orderId: order.id,
        orderCode: orderLabel,
        total: finalTotal,
        items: orderItems.map(item => ({
          nombre: item.nombre,
          cantidad: item.quantity,
          precio: item.precio,
          precioFinal: item.precioFinal
        })),
        clienteNombre: nombre || fullUser?.name || session.user.name || "Usuario",
        email: email || session.user.email || "No registrado",
        cedula: cedula || fullUser?.cedula || "Consumidor Final",
        telefono: normalizedTelefono || fullUser?.phone || "No registrado",
        ciudad: ciudad || "No registrada",
        direccion: direccion || "No registrada",
        metodoPago: metodoPago || "Transferencia",
        estado: isTransferencia ? "ESPERANDO_COMPROBANTE" : "Pagada",
        ivaRate: taxRate,
        taxName: storeTaxSettings.taxName,
        taxEnabled: storeTaxSettings.taxEnabled,
        surchargeRate: storeTaxSettings.surchargeRate,
        surchargeEnabled: storeTaxSettings.surchargeEnabled,
        actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/mi-mascota`,
        actionText: isTransferencia ? "Subir Comprobante" : "Ver mis compras"
      });

      // Enviar en segundo plano para no bloquear al usuario
      sendEmail(
        session.user.email,
        isTransferencia ? " Hemos registrado tu orden." : " ¡Confirmación de Compra en MIAUWUAUF!",
        emailHtml
      ).catch(err => console.error("Error sending checkout email:", err));
    }

    // 4. Crear notificación in-app de orden generada para el usuario
    try {
      const { createNotification } = await import("@/lib/notification");
      await createNotification({
        userId: session.user?.id as string,
        title: isTransferencia ? "Orden creada" : "Compra Exitosa",
        message: isTransferencia 
          ? `Tu orden ${orderLabel} requiere comprobante.` 
          : `Tu orden ${orderLabel} por $${finalTotal.toFixed(2)} ha sido procesada con éxito.`,
        type: isTransferencia ? "warning" : "success",
        sendEmailFlag: false // El correo ya se envió arriba por HTTPS
      });
    } catch (notifyError) {
      console.error("Error sending user notification:", notifyError);
    }

    // [OJO DE DIOS] Notificar a los Admins sobre la nueva venta
    try {
      const isRetry = from === "profile";
      const { notifyAdmins } = await import("@/lib/notification")
      
      if (isRetry) {
        await notifyAdmins({
          title: `REINTENTO DE PAGO: Comprobante Recibido - Orden ${orderLabel}`,
          message: `El usuario ${email} ha reenviado su pago por $${finalTotal.toFixed(2)}. \n Ubicación: ${ciudad}, ${direccion} \n Comprobante: ${comprobanteUrl || 'No adjunto'}`,
          type: "order_pending",
          metadata: { resourceId: order.id }
        })
      } else {
        await notifyAdmins({
          title: isTransferencia ? " Venta Registrada con Éxito (Transferencia)" : " Venta Registrada con Éxito (Pagada)",
          message: `Orden ${orderLabel} generada por un total de $${finalTotal.toFixed(2)}.`,
          type: "order_pending",
          metadata: { resourceId: order.id }
        })
      }
    } catch (adminError) {
      console.error("Error notifying admins about new sale:", adminError)
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      displayId:
        typeof orderDisplayId === "number" && orderDisplayId > 0
          ? orderDisplayId
          : null,
      orderCode: orderLabel,
      requireProof: isTransferencia,
      pricing: {
        subtotal: Number(subtotal.toFixed(2)),
        iva: Number(iva.toFixed(2)),
        surcharge: Number(surcharge.toFixed(2)),
        total: Number(finalTotal.toFixed(2)),
      },
      message: isTransferencia ? "Subir comprobante requerido" : "Orden procesada exitosamente",
    });
  } catch (error: unknown) {
    console.error("Error en checkout:", error);
    // Explicitly handle our stock errors to return 400 with a friendly message
    const message = error instanceof Error ? error.message : "";
    if (message.includes("¡Ups!")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Error al procesar el pago" },
      { status: 500 }
    );
  }
}
