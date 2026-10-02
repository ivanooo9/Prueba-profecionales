import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import cloudinary from "cloudinary";
import { sendEmail } from "@/lib/mail";
import { getOrderConfirmationTemplate } from "@/lib/email-templates";
import { Readable } from "stream";
import { formatPrefixedSequence } from "@/lib/utils";
import { backfillMissingOrderNumbers } from "@/lib/order-number";

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await req.formData();
    const orderId = formData.get("orderId") as string;
    const file = formData.get("file") as File;

    if (!orderId || !file) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 });
    }

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Orden no pertenece al usuario" }, { status: 403 });
    }

    // Convert File to Buffer and upload to Cloudinary
    const buffer = Buffer.from(await file.arrayBuffer());

    const cloudinaryResponse = await new Promise<cloudinary.UploadApiResponse>((resolve, reject) => {
      const uploadStream = cloudinary.v2.uploader.upload_stream(
        { folder: "miauwuauf/orders/proofs" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result as cloudinary.UploadApiResponse);
        }
      );
      
      const readableStream = new Readable({
        read() {
          this.push(buffer);
          this.push(null);
        }
      });
      readableStream.pipe(uploadStream);
    });

    // Update Order in DB
    await backfillMissingOrderNumbers(prisma);
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        comprobanteUrl: cloudinaryResponse.secure_url,
        estado: "ESPERANDO_VALIDACION"
      },
    });
    const displayId =
      typeof (updatedOrder as { orderNumber?: unknown }).orderNumber === "number"
        ? ((updatedOrder as { orderNumber: number }).orderNumber ?? null)
        : null;
    let resolvedDisplayId = displayId;
    if (!resolvedDisplayId) {
      const orderedIds = await prisma.order.findMany({
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      const idx = orderedIds.findIndex((item) => item.id === updatedOrder.id);
      resolvedDisplayId = idx >= 0 ? idx + 1 : null;
    }
    const orderLabel = formatPrefixedSequence("ORD", resolvedDisplayId, updatedOrder.id);

    // Notificación Unificada Inteligente
    const { createNotification } = await import("@/lib/notification");
    await createNotification({
      userId: session.user.id,
      title: "¡Comprobante Recibido!",
      message: `El comprobante para tu orden ${orderLabel} se subió con éxito. Estamos validando tu pago.`,
      type: "order_status_update",
      userEmail: session.user.email!,
      sendEmailFlag: true,
      emailSubject: "Recibimos tu comprobante de pago MIAUWUAUF",
      actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
    });

    return NextResponse.json({
      success: true,
      url: cloudinaryResponse.secure_url,
      message: "Comprobante subido y orden actualizada"
    });

  } catch (error) {
    console.error("Error al subir comprobante:", error);
    return NextResponse.json({ error: "Error en el servidor al subir el archivo" }, { status: 500 });
  }
}
