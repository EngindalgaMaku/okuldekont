import { NextRequest } from "next/server";
import { serveVoiceNote } from "@/lib/teacher-issues";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  return serveVoiceNote(request, filename);
}
