import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { formatPrefixedSequence } from "@/lib/utils";
import { backfillMissingOrderNumbers } from "@/lib/order-number";

export async function GET() {
  try {
    const session = await auth();
    if (!session || session.user.role !== "admin") {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    await backfillMissingOrderNumbers(prisma);

    const orders = await prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true, city: true, address: true, phone: true, cedula: true }
        },
        items: {
          include: { product: true }
        }
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
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
