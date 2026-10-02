import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createNotification } from "@/lib/notification";
import { formatPrefixedSequence } from "@/lib/utils";
import { generateSlug } from "@/lib/slug";



// GET /api/products - List all products
export async function GET() {
  try {
    const now = new Date();

    // 1. Lazy Cleanup: Find products with expired discount
    const expiredProducts = await prisma.product.findMany({
      where: {
        descuentoValidoHasta: { lt: now },
        descuento: { gt: 0 },
      },
    });

    if (expiredProducts.length > 0) {
      console.log(`[LazyCleanup] Found ${expiredProducts.length} expired products.`);
      
      // Update them in DB
      await prisma.product.updateMany({
        where: { id: { in: expiredProducts.map(p => p.id) } },
        data: {
          descuento: 0,
          descuentoValidoHasta: null,
          etiqueta: null, // Usually discounts come with 'Oferta' or similar labels
        },
      });

      // Notify Admins
      const admins = await prisma.user.findMany({
        where: { role: "admin" },
        select: { id: true, name: true, email: true },
      });

      for (const p of expiredProducts) {
        for (const admin of admins) {
          await createNotification({
            userId: admin.id,
            title: "Descuento Expirado ",
            message: `La oferta del producto "${p.nombre}" ha vencido. El precio ha vuelto a la normalidad automáticamente.`,
            type: "discount_expired",
            userEmail: admin.email || "",
            sendEmailFlag: false,
            metadata: { resourceId: p.id }
          });
        }
      }
    }

    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    const orderedIds = await prisma.product.findMany({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const displayMap = new Map(orderedIds.map((product, index) => [product.id, index + 1]));

    return NextResponse.json(
      products.map((product) => {
        const displayId = displayMap.get(product.id) ?? null;
        return {
          ...product,
          displayId,
          productCode: formatPrefixedSequence("PRD", displayId, product.id),
        };
      }),
    );
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/products - Create a new product (Admin only)
export async function POST(req: Request) {
  try {
    const session = await auth();
    const role = session?.user?.role;

    // Simple check for admin/veterinario role (adjust if needed)
    if (!session?.user || (role !== "admin" && role !== "veterinario" && role !== "bloguer")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();
    
    // Calculate expiry date if discount duration is provided
    let expiryDate: Date | null = null;
    if (Number(data.descuento || 0) > 0 && Number(data.descuentoDias || 0) > 0) {
      const days = Number(data.descuentoDias);
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + days);
    }

    // Ensure numeric types are correctly handled
    const product = await prisma.product.create({
      data: {
        nombre: data.nombre,
        slug: generateSlug(data.nombre),
        precio: Number(data.precio),
        categoria: data.categoria,
        subcategoria: data.subcategoria,
        marca: data.marca,
        stock: Number(data.stock),
        foto: data.foto,
        imagenes: data.imagenes || [],
        descripcion: data.descripcion,
        etiqueta: data.etiqueta,
        calificacion: Number(data.calificacion || 5.0),
        descuento: Number(data.descuento || 0),
        descuentoValidoHasta: expiryDate,
      },
    });
    const orderedIds = await prisma.product.findMany({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    const displayId = orderedIds.findIndex((item) => item.id === product.id) + 1;

    // Strategy: Revalidate shop and home to reflect the new product instantly
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/tienda");
    revalidatePath("/");

    return NextResponse.json({
      ...product,
      displayId: displayId > 0 ? displayId : null,
      productCode: formatPrefixedSequence("PRD", displayId > 0 ? displayId : null, product.id),
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
