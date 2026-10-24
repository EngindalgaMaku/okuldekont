import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  try {
    // Minimal DB check - fast and compatible across providers
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    return NextResponse.json(
      { status: "connected", latency },
      { status: 200 }
    );
  } catch (error: any) {
    const latency = Date.now() - start;
    console.error("Health check DB error:", error?.message || error);
    return NextResponse.json(
      {
        status: "disconnected",
        latency,
        error: error?.message || "unknown_error",
      },
      { status: 500 }
    );
  }
}