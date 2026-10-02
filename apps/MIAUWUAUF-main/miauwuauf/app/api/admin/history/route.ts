import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const history = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        type: "admin_audit",
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error al obtener historial admin:", error);
    return NextResponse.json(
      { message: "Error al obtener historial admin" },
      { status: 500 },
    );
  }
}
