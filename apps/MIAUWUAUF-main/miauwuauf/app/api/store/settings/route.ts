import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getStoreTaxSettings, saveStoreTaxSettings } from "@/lib/store-settings.server";
import { StoreTaxSettings } from "@/lib/store-settings";

export async function GET() {
  try {
    const settings = await getStoreTaxSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error("GET /api/store/settings error:", error);
    return NextResponse.json({ message: "Error fetching store settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (session?.user?.role !== "admin") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<StoreTaxSettings>;
    const settings = await saveStoreTaxSettings({
      ...(body ?? {}),
      updatedByName: session.user.name || session.user.email || "Admin",
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("POST /api/store/settings error:", error);
    return NextResponse.json({ message: "Error saving store settings" }, { status: 500 });
  }
}
