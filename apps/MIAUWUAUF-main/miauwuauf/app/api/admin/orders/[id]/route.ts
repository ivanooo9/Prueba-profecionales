import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { formatPrefixedSequence } from "@/lib/utils";
import { backfillMissingOrderNumbers } from "@/lib/order-number";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const { estado, observacion } = await req.json();

    if (!id || !estado) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    await backfillMissingOrderNumbers(prisma);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: { product: true }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    // 1. Si el nuevo estado es VERIFICADO, descontamos el stock real
    if (estado === "VERIFICADO") {
      await prisma.$transaction(async (tx: import("@prisma/client").Prisma.TransactionClient) => {
        for (const item of order.items) {
          if (item.productId) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.quantity } }
            });
          }
        }
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { 
        estado,
        observacion: observacion || undefined
      }
    });
    const orderCode = formatPrefixedSequence("ORD", order.orderNumber ?? null, order.id);

    // Enviar Email al Cliente
    const emailTo = order.email || order.user?.email;
    if (emailTo) {
      let title = "Actualización de tu pedido - MIAUWUAUF";
      let msg = "";
      let subject = "Actualización de tu pedido MIAUWUAUF";
      let actionText = "Ver mi pedido";

      switch (estado) {
        case "VERIFICADO":
          title = "¡Pedido Verificado!";
          msg = "¡Excelente noticia! Tu pago ha sido verificado y hemos descontado los productos de nuestro inventario exclusivamente para ti. Ya estamos preparando tu paquete.";
          subject = "¡Tu pedido en MIAUWUAUF ha sido verificado!";
          break;
        case "PAGO_ACEPTADO":
          title = "¡Pago Aceptado!";
          msg = "¡Excelente noticia! Hemos validado tu comprobante y tu pedido ya está siendo preparado para ser enviado. ¡Gracias por confiar en MIAUWUAUF!";
          subject = "Pago validado: Tu pedido MIAUWUAUF está en proceso";
          break;
        case "PREPARANDO":
          title = "¡Estamos preparando tu pedido!";
          msg = "Tu paquete de MIAUWUAUF está siendo empacado con amor. Muy pronto estará listo para salir a tu encuentro.";
          subject = "¡Tu pedido MIAUWUAUF está siendo empacado!";
          break;
        case "EN_CAMINO":
          title = "¡Tu pedido va hacia ti!";
          msg = "¡Buenas noticias! El repartidor ya tiene tu paquete y va en camino. ¡Prepárate para recibirlo!";
          subject = "¡Tu paquete de MIAUWUAUF va en camino!";
          actionText = "Seguir mi paquete";
          break;
        case "COMPLETADA":
        case "ENTREGADO":
          title = "¡Tu pedido ha sido entregado!";
          msg = "¡Tu pedido ha sido entregado exitosamente! Esperamos que tú y tu mascota disfruten mucho su compra. Gracias por confiar en MIAUWUAUF";
          subject = "¡Pedido Entregado! Gracias por tu compra en MIAUWUAUF";
          break;
        case "PAGO_RECHAZADO":
          title = "Problema con tu Comprobante";
          msg = "Revisamos tu comprobante pero hubo un inconveniente que nos impide validar el pago.";
          if (observacion) {
            msg += `<br/><br/><b>Observación del equipo:</b> ${observacion}<br/><br/>Por favor comunícate a nuestro soporte o vuelve a subir tu archivo.`;
          }
          subject = "Revisa el comprobante de tu pedido MIAUWUAUF";
          break;
        default:
          title = "Cambio de estado en tu pedido";
          msg = `Tu pedido ha pasado al estado: ${estado}.`;
      }

      const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const { createNotification } = await import("@/lib/notification");
      
      await createNotification({
        userId: order.userId as string,
        title: title,
        message: msg.replace(/<br\/>/g, '\n').replace(/<\/?[^>]+(>|$)/g, ""), // Limpiar HTML para notificación interna
        type: (estado === "ENTREGADO" || estado === "COMPLETADA") ? "order_delivery" : "order_status_update",
        userEmail: emailTo,
        sendEmailFlag: true, 
        emailSubject: subject,
        actionUrl: `${appUrl}/mi-mascota?tab=compras`,
        actionText: actionText,
        orderData: (estado === "ENTREGADO" || estado === "COMPLETADA") ? {
          orderId: order.id,
          orderCode,
          items: order.items.map((item: { product: { nombre: string }; quantity: number; precio: number; precioFinal: number | null }) => ({
            nombre: item.product.nombre,
            cantidad: item.quantity,
            precio: item.precio,
            precioFinal: item.precioFinal || undefined
          })),
          total: order.total,
          ivaRate: order.ivaRate ?? undefined,
          taxName: order.taxName ?? undefined,
          taxEnabled: order.taxEnabled ?? undefined,
          surchargeRate: order.surchargeRate ?? undefined,
          surchargeEnabled: order.surchargeEnabled ?? undefined,
          clienteNombre: order.nombre || order.user?.name || undefined,
          cedula: order.cedula || undefined,
          telefono: order.telefono || undefined,
          metodoPago: order.metodo || undefined
        } : undefined
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
