import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function GET() {
  try {
    const categories = await prisma.categoryStore.findMany({
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    
    const category = await prisma.categoryStore.create({
      data: {
        nombre: data.nombre,
        icon: data.icon || "Package",
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
