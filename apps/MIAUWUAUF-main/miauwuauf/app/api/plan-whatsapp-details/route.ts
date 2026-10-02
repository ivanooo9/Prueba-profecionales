import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const PLAN_DETAILS_PREFIX = "plan-whatsapp-details-";

function toSectionId(planId: string): string {
  return `${PLAN_DETAILS_PREFIX}${planId}`;
}

function sanitizeDetails(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim();
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");

    if (planId) {
      const row = await prisma.sectionContent.findUnique({
        where: { sectionId: toSectionId(planId) },
      });
      return NextResponse.json({ planId, details: sanitizeDetails(row?.subtitle) });
    }

    const rows = await prisma.sectionContent.findMany({
      where: { sectionId: { startsWith: PLAN_DETAILS_PREFIX } },
      select: { sectionId: true, subtitle: true },
    });

    const data = rows.map((row) => ({
      planId: row.sectionId.replace(PLAN_DETAILS_PREFIX, ""),
      details: sanitizeDetails(row.subtitle),
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/plan-whatsapp-details error:", error);
    return NextResponse.json({ message: "Error fetching plan WhatsApp details" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as { planId?: string; details?: string };
    const planId = (body.planId || "").trim();
    const details = sanitizeDetails(body.details);

    if (!planId) {
      return NextResponse.json({ message: "planId is required" }, { status: 400 });
    }

    const sectionId = toSectionId(planId);

    if (!details) {
      await prisma.sectionContent.deleteMany({
        where: { sectionId },
      });
      return NextResponse.json({ planId, details: "" });
    }

    const row = await prisma.sectionContent.upsert({
      where: { sectionId },
      update: {
        title: "Detalle WhatsApp del plan",
        subtitle: details,
      },
      create: {
        sectionId,
        badge: "SETTINGS",
        title: "Detalle WhatsApp del plan",
        subtitle: details,
      },
    });

    return NextResponse.json({ planId, details: sanitizeDetails(row.subtitle) });
  } catch (error) {
    console.error("POST /api/plan-whatsapp-details error:", error);
    return NextResponse.json({ message: "Error saving plan WhatsApp details" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const planId = (searchParams.get("planId") || "").trim();
    if (!planId) {
      return NextResponse.json({ message: "planId is required" }, { status: 400 });
    }

    await prisma.sectionContent.deleteMany({
      where: { sectionId: toSectionId(planId) },
    });

    return NextResponse.json({ message: "Plan WhatsApp details deleted" });
  } catch (error) {
    console.error("DELETE /api/plan-whatsapp-details error:", error);
    return NextResponse.json({ message: "Error deleting plan WhatsApp details" }, { status: 500 });
  }
}
