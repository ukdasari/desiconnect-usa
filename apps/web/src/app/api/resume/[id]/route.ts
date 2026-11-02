import { NextResponse } from "next/server";
import { getToken } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://localhost:4000/api/v1";

/** Streams a resume through the website so the API token never reaches the browser. The API enforces who may download it. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const token = await getToken();
  if (!token) return NextResponse.redirect(new URL("/login", _req.url));
  const res = await fetch(`${API_URL}/applications/${id}/resume`, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok || !res.body) return NextResponse.json({ error: "Resume not available" }, { status: res.status === 404 ? 404 : 502 });
  return new NextResponse(res.body, {
    headers: {
      "content-type": res.headers.get("content-type") ?? "application/octet-stream",
      "content-disposition": res.headers.get("content-disposition") ?? "attachment",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
