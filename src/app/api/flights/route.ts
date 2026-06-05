import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { estimateFlightCost } from "@/lib/pricing-model";

// GET /api/flights?from=MXP&slug=barcelona&travel_date=2025-07-15&booking_date=2025-04-01
//
// from:          codice IATA aeroporto di partenza (es. MXP, FCO, LIN)
// slug:          slug della destinazione (es. barcelona, amsterdam)
// travel_date:   data del volo (YYYY-MM-DD)
// booking_date:  data in cui si prenota — default: oggi
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const fromIata   = searchParams.get("from")?.toUpperCase();
  const slug       = searchParams.get("slug");
  const travelDate = searchParams.get("travel_date");
  const bookingDateParam = searchParams.get("booking_date");

  if (!fromIata || !slug || !travelDate) {
    return NextResponse.json(
      { data: null, error: "from, slug e travel_date sono obbligatori" },
      { status: 400 }
    );
  }

  // Recupera aeroporto di partenza
  const originResult = await db.query<{
    latitude: number; longitude: number; name: string;
  }>(
    "SELECT latitude, longitude, name FROM airports WHERE iata_code = $1",
    [fromIata]
  );

  if (originResult.rowCount === 0) {
    return NextResponse.json(
      { data: null, error: `Aeroporto "${fromIata}" non trovato` },
      { status: 404 }
    );
  }

  // Recupera aeroporto principale della destinazione
  // (il più vicino al centro della città, cioè con destination_id collegato)
  const destResult = await db.query<{
    latitude: number; longitude: number; iata_code: string;
  }>(
    `SELECT a.latitude, a.longitude, a.iata_code
     FROM airports a
     JOIN destinations d ON d.id = a.destination_id
     WHERE d.slug = $1
     ORDER BY a.iata_code
     LIMIT 1`,
    [slug]
  );

  if (destResult.rowCount === 0) {
    return NextResponse.json(
      { data: null, error: `Nessun aeroporto trovato per "${slug}"` },
      { status: 404 }
    );
  }

  const origin = originResult.rows[0];
  const dest   = destResult.rows[0];

  const travel  = new Date(travelDate);
  const booking = bookingDateParam ? new Date(bookingDateParam) : new Date();
  const daysUntilFlight = Math.max(
    0,
    Math.floor((travel.getTime() - booking.getTime()) / (1000 * 60 * 60 * 24))
  );

  const estimate = estimateFlightCost({
    originLat: Number(origin.latitude),
    originLon: Number(origin.longitude),
    destLat:   Number(dest.latitude),
    destLon:   Number(dest.longitude),
    travelMonth: travel.getMonth() + 1,
    daysUntilFlight,
  });

  return NextResponse.json({
    data: {
      from_iata:   fromIata,
      to_iata:     dest.iata_code,
      ...estimate,
    },
    error: null,
  });
}
