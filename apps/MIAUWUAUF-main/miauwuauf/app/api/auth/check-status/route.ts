import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email) return NextResponse.json({ inactive: false });

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { isActive: true }
    });

    if (user && user.isActive === false) {
      return NextResponse.json({ inactive: true });
    }

    return NextResponse.json({ inactive: false });
  } catch {
    return NextResponse.json({ inactive: false });
  }
}
