import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";



// GET /api/subcategories?categoryId=xxx  → filtra por categoría
// GET /api/subcategories                 → todas
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    const subcategories = await prisma.subcategoryStore.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: { nombre: "asc" },
      include: { category: { select: { nombre: true } } },
    });

    return NextResponse.json(subcategories);
  } catch (error) {
    console.error("Error fetching subcategories:", error);
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

    if (!data.nombre || !data.categoryId) {
      return NextResponse.json({ error: "nombre y categoryId son requeridos" }, { status: 400 });
    }

    const subcategory = await prisma.subcategoryStore.create({
      data: {
        nombre: data.nombre,
        categoryId: data.categoryId,
      },
      include: { category: { select: { nombre: true } } },
    });

    return NextResponse.json(subcategory);
  } catch (error) {
    console.error("Error creating subcategory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    // Verificar si hay productos asociados
    const subcategory = await prisma.subcategoryStore.findUnique({
      where: { id },
      select: { nombre: true }
    });

    if (!subcategory) {
      return NextResponse.json({ error: "Subcategoría no encontrada" }, { status: 404 });
    }

    const productCount = await prisma.product.count({
      where: { subcategoria: subcategory.nombre }
    });

    if (productCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: existen ${productCount} productos vinculados a la subcategoría "${subcategory.nombre}".` 
      }, { status: 400 });
    }

    await prisma.subcategoryStore.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting subcategory:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
