import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ data: [] });

  const term  = `%${q}%`;
  const start = `${q}%`;

  const { rows } = await db.query(
    `SELECT iata_code, name, city, country_code
     FROM airports
     WHERE iata_code IS NOT NULL
       AND (city ILIKE $1 OR name ILIKE $1 OR iata_code ILIKE $1)
     ORDER BY
       CASE WHEN iata_code ILIKE $2 THEN 0
            WHEN city    ILIKE $2 THEN 1
            ELSE 2 END,
       city NULLS LAST
     LIMIT 10`,
    [term, start]
  );

  return NextResponse.json({ data: rows });
}
