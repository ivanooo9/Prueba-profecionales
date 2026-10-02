import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatPrefixedSequence } from "@/lib/utils";
import { backfillMissingOrderNumbers } from "@/lib/order-number";

export async function GET(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Debes iniciar sesión para ver tus compras" }, { status: 401 });
    }

    await backfillMissingOrderNumbers(prisma);

    // Obtener órdenes del usuario con sus ítems y productos asociados
    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                nombre: true,
                foto: true,
                precio: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    const orderedIds = await prisma.order.findMany({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const fallbackMap = new Map(orderedIds.map((order, index) => [order.id, index + 1]));

    return NextResponse.json(
      orders.map((order) => ({
        ...order,
        displayId:
          typeof (order as { orderNumber?: unknown }).orderNumber === "number"
            ? ((order as { orderNumber: number }).orderNumber ?? null)
            : (fallbackMap.get(order.id) ?? null),
        orderCode: formatPrefixedSequence(
          "ORD",
          typeof (order as { orderNumber?: unknown }).orderNumber === "number"
            ? ((order as { orderNumber: number }).orderNumber ?? null)
            : (fallbackMap.get(order.id) ?? null),
          order.id,
        ),
      })),
    );
  } catch (error: unknown) {
    console.error("Error al obtener compras de usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
