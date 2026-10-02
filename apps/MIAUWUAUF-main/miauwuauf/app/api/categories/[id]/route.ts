import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";



export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Verificar si hay productos asociados
    const category = await prisma.categoryStore.findUnique({
      where: { id },
      select: { nombre: true }
    });

    if (!category) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
    }

    const productCount = await prisma.product.count({
      where: { categoria: category.nombre }
    });

    if (productCount > 0) {
      return NextResponse.json({ 
        error: `No se puede eliminar: existen ${productCount} productos vinculados a "${category.nombre}".` 
      }, { status: 400 });
    }

    await prisma.categoryStore.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
