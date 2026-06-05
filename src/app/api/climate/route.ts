import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { ClimateMonthly } from "@/types/database";

// GET /api/climate?slug=barcelona
// GET /api/climate?slug=barcelona&month=7
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const slug = searchParams.get("slug");
  const monthParam = searchParams.get("month");

  if (!slug) {
    return NextResponse.json({ data: null, error: "slug is required" }, { status: 400 });
  }

  const month = monthParam ? parseInt(monthParam, 10) : null;
  if (month !== null && (isNaN(month) || month < 1 || month > 12)) {
    return NextResponse.json({ data: null, error: "month must be 1-12" }, { status: 400 });
  }

  const destResult = await db.query<{ id: number }>(
    "SELECT id FROM destinations WHERE slug = $1",
    [slug]
  );

  if (destResult.rowCount === 0) {
    return NextResponse.json({ data: null, error: "destination not found" }, { status: 404 });
  }

  const destinationId = destResult.rows[0].id;

  const query = month
    ? "SELECT * FROM climate_monthly WHERE destination_id = $1 AND month = $2 ORDER BY month"
    : "SELECT * FROM climate_monthly WHERE destination_id = $1 ORDER BY month";

  const params = month ? [destinationId, month] : [destinationId];
  const result = await db.query<ClimateMonthly>(query, params);

  return NextResponse.json({ data: result.rows, error: null });
}
