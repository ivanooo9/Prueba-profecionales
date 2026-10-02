import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { normalizeEcuadorPhone } from "@/lib/phone";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        cedula: true,
        phone: true,
        city: true,
        address: true,
        clinicName: true,
        image: true,
        specialty: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Error de servidor" }, { status: 500 });
  }
}

interface UserUpdateData {
  name?: string;
  cedula?: string;
  phone?: string;
  city?: string;
  address?: string;
  clinicName?: string;
  image?: string;
  password?: string;
  specialty?: string;
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await req.json();
    const { password, ...updateData } = data;

    const finalUpdate: UserUpdateData = { ...updateData };
    if (typeof updateData.phone === "string") {
      finalUpdate.phone = normalizeEcuadorPhone(updateData.phone);
    }

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      finalUpdate.password = hashedPassword;
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: finalUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        cedula: true,
        phone: true,
        city: true,
        address: true,
        clinicName: true,
        image: true,
        specialty: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}
