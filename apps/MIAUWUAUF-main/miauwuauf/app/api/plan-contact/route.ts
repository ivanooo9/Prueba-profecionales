import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { normalizeEcuadorPhone } from "@/lib/phone";

const PLAN_CONTACT_SECTION_ID = "plans-whatsapp-contact";

export async function GET() {
  try {
    const section = await prisma.sectionContent.findUnique({
      where: { sectionId: PLAN_CONTACT_SECTION_ID },
    });

    return NextResponse.json({
      phone: normalizeEcuadorPhone(section?.subtitle) || "",
    });
  } catch (error) {
    console.error("GET /api/plan-contact error:", error);
    return NextResponse.json({ message: "Error fetching plan contact" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { phone?: string };
    const phone = normalizeEcuadorPhone(body?.phone) || "";

    const section = await prisma.sectionContent.upsert({
      where: { sectionId: PLAN_CONTACT_SECTION_ID },
      update: {
        title: "WhatsApp de planes",
        subtitle: phone,
      },
      create: {
        sectionId: PLAN_CONTACT_SECTION_ID,
        badge: "SETTINGS",
        title: "WhatsApp de planes",
        subtitle: phone,
      },
    });

    return NextResponse.json({ phone: normalizeEcuadorPhone(section.subtitle) || "" });
  } catch (error) {
    console.error("POST /api/plan-contact error:", error);
    return NextResponse.json({ message: "Error saving plan contact" }, { status: 500 });
  }
}
