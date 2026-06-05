import { NextRequest, NextResponse } from "next/server";
import { searchDestinations } from "@/lib/search";

// GET /api/destinations?from=MXP&budget=1500&start_date=2025-07-10&end_date=2025-07-17
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const fromIata     = searchParams.get("from");
  const budgetEur    = parseFloat(searchParams.get("budget") ?? "");
  const startDateStr = searchParams.get("start_date");
  const endDateStr   = searchParams.get("end_date");
  const bookingStr   = searchParams.get("booking_date");
  const limit        = parseInt(searchParams.get("limit") ?? "20", 10);

  if (!fromIata || isNaN(budgetEur) || !startDateStr || !endDateStr) {
    return NextResponse.json(
      { data: null, error: "from, budget, start_date e end_date sono obbligatori" },
      { status: 400 }
    );
  }

  const startDate = new Date(startDateStr);
  const endDate   = new Date(endDateStr);

  if (endDate <= startDate) {
    return NextResponse.json(
      { data: null, error: "end_date deve essere successiva a start_date" },
      { status: 400 }
    );
  }

  const result = await searchDestinations({
    fromIata,
    budgetEur,
    startDate,
    endDate,
    bookingDate: bookingStr ? new Date(bookingStr) : new Date(),
    limit,
  });

  return NextResponse.json(result, { status: result.error ? 404 : 200 });
}
