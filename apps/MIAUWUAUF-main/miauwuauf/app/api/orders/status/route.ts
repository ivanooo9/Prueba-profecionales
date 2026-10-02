import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatPrefixedSequence } from "@/lib/utils";
import { backfillMissingOrderNumbers } from "@/lib/order-number";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Obtener ID del producto desde los parámetros de búsqueda
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      console.log(" API Status: No productId provided");
      return NextResponse.json({ error: "productId requerido" }, { status: 400 });
    }

    console.log(` Buscando pedidos para Usuario [${session.user.id}] y Producto [${productId}]`);
    await backfillMissingOrderNumbers(prisma);

    // 2. Buscamos la última orden activa que contenga este producto
    const latestOrder = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        items: {
          some: {
            productId: productId
          }
        },
        estado: {
          notIn: ["CANCELADA", "PAGO_RECHAZADO"]
        }
      },
      orderBy: {
        createdAt: "desc"
      },
    });
    let displayId: number | null =
      typeof (latestOrder as { orderNumber?: unknown } | null)?.orderNumber === "number"
        ? ((latestOrder as { orderNumber: number }).orderNumber ?? null)
        : null;
    if (!displayId && latestOrder?.id) {
      const orderedIds = await prisma.order.findMany({
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      const idx = orderedIds.findIndex((order) => order.id === latestOrder.id);
      displayId = idx >= 0 ? idx + 1 : null;
    }

    if (latestOrder) {
      console.log(` Pedido encontrado: ID [${latestOrder.id}] Estado [${latestOrder.estado}]`);
    } else {
      console.log(` No se encontró ningún pedido activo para este producto.`);
    }

    // 3. Devolvemos el estado
    return NextResponse.json({
      purchased: !!latestOrder,
      orderId: latestOrder?.id || null,
      displayId,
      orderCode: latestOrder?.id ? formatPrefixedSequence("ORD", displayId, latestOrder.id) : null,
      estado: latestOrder?.estado || "PENDIENTE" // Fallback seguro
    });

  } catch (error) {
    console.error("Error fetching order status:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
