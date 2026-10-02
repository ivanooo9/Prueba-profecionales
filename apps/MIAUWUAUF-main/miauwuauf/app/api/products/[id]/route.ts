import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { formatPrefixedSequence } from "@/lib/utils";
import { generateSlug } from "@/lib/slug";

// GET /api/products/[id] - Get a single product
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idOrSlug } = await params;
    
    // Intentar buscar por ID (MongoDB ObjectId)
    let product = null;
    if (idOrSlug.length === 24) {
      product = await prisma.product.findUnique({ where: { id: idOrSlug } });
    }

    // Si no se encontró por ID, intentar por SLUG
    if (!product) {
      product = await prisma.product.findUnique({ where: { slug: idOrSlug } });
    }

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const orderedIds = await prisma.product.findMany({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const displayId = orderedIds.findIndex((item) => item.id === product.id) + 1;

    return NextResponse.json({
      ...product,
      displayId: displayId > 0 ? displayId : null,
      productCode: formatPrefixedSequence("PRD", displayId > 0 ? displayId : null, product.id),
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/products/[id] - Update a product
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session?.user || (role !== "admin" && role !== "veterinario" && role !== "bloguer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idOrSlug } = await params;
    const data = await req.json();

    // Identificar el ID real
    let realId = idOrSlug;
    if (idOrSlug.length !== 24) {
      const p = await prisma.product.findUnique({ where: { slug: idOrSlug }, select: { id: true } });
      if (p) realId = p.id;
    }

    const product = await prisma.product.update({
      where: { id: realId },
      data: {
        nombre: data.nombre,
        slug: data.nombre ? generateSlug(data.nombre) : undefined,
        precio: data.precio !== undefined ? Number(data.precio) : undefined,
        categoria: data.categoria,
        subcategoria: data.subcategoria,
        marca: data.marca,
        stock: data.stock !== undefined ? Number(data.stock) : undefined,
        foto: data.foto,
        imagenes: data.imagenes,
        descripcion: data.descripcion,
        etiqueta: data.etiqueta,
        calificacion: data.calificacion !== undefined ? Number(data.calificacion) : undefined,
        descuento: data.descuento !== undefined ? Number(data.descuento) : undefined,
        descuentoValidoHasta: data.descuentoDias !== undefined ? (() => {
          const days = Number(data.descuentoDias);
          if (days === 0) return null;
          const d = new Date();
          d.setDate(d.getDate() + days);
          return d;
        })() : undefined,
      },
    });
    const orderedIds = await prisma.product.findMany({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const displayId = orderedIds.findIndex((item) => item.id === product.id) + 1;

    // Strategy: Revalidate product detail, shop and home
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/tienda");
    revalidatePath(`/tienda/${realId}`);
    revalidatePath(`/tienda/${product.slug}`);
    revalidatePath("/");

    return NextResponse.json({
      ...product,
      displayId: displayId > 0 ? displayId : null,
      productCode: formatPrefixedSequence("PRD", displayId > 0 ? displayId : null, product.id),
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/products/[id] - Delete a product
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const role = session?.user?.role;

    if (!session?.user || (role !== "admin" && role !== "veterinario" && role !== "bloguer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: idOrSlug } = await params;
    
    // Identificar el ID real
    let realId = idOrSlug;
    if (idOrSlug.length !== 24) {
      const p = await prisma.product.findUnique({ where: { slug: idOrSlug }, select: { id: true } });
      if (p) realId = p.id;
    }

    await prisma.product.delete({
      where: { id: realId },
    });

    // Strategy: Revalidate shop and home
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/tienda");
    revalidatePath("/");

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
