import { NextResponse } from "next/server";
import type { ListingDetailDto } from "@desiconnect/contracts";
import { apiOrNull } from "@/lib/api";

/** Resolves a listing id from a report into its public URL (admins can also see unpublished listings). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const listing = /^[0-9a-f-]{36}$/i.test(id) ? (await apiOrNull<ListingDetailDto>(`/listings/${id}`))?.data : null;
  return NextResponse.redirect(new URL(listing ? `/listings/${listing.slug}` : "/admin/reports", req.url));
}
