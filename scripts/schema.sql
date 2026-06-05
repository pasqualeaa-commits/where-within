-- Destinazioni: una riga per città (es. Barcellona, Amsterdam)
-- I punteggi vengono da Teleport API e i costi in EUR cents (es. 8000 = €80.00)
CREATE TABLE IF NOT EXISTS destinations (
  id                       SERIAL PRIMARY KEY,
  name                     VARCHAR(100) NOT NULL,
  slug                     VARCHAR(100) UNIQUE NOT NULL,  -- slug Teleport es. "barcelona"
  country                  VARCHAR(100) NOT NULL,
  country_code             CHAR(2)      NOT NULL,         -- ISO 3166-1 alpha-2
  continent                VARCHAR(50),
  latitude                 DECIMAL(9,6),
  longitude                DECIMAL(9,6),
  -- punteggi Teleport 0-10
  score_overall            DECIMAL(4,2),
  score_cost_of_living     DECIMAL(4,2),
  score_safety             DECIMAL(4,2),
  score_healthcare         DECIMAL(4,2),
  score_culture            DECIMAL(4,2),
  score_outdoor            DECIMAL(4,2),
  -- costo medio hotel per notte in EUR cents
  avg_hotel_per_night_cents INTEGER,
  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Aeroporti: collegati a una destinazione
-- Usati per calcolare la distanza (e quindi il prezzo base del volo)
-- iata_code: es. "BCN", "AMS" — può essere NULL per piccoli aeroporti
CREATE TABLE IF NOT EXISTS airports (
  id               SERIAL PRIMARY KEY,
  iata_code        CHAR(3) UNIQUE,
  name             VARCHAR(200) NOT NULL,
  city             VARCHAR(100),
  country_code     CHAR(2),
  latitude         DECIMAL(9,6),
  longitude        DECIMAL(9,6),
  destination_id   INTEGER REFERENCES destinations(id) ON DELETE SET NULL
);

-- Clima mensile: medie storiche per ogni destinazione
-- month: 1=Gennaio ... 12=Dicembre
-- Popolato da Open-Meteo API durante il seed
CREATE TABLE IF NOT EXISTS climate_monthly (
  id               SERIAL PRIMARY KEY,
  destination_id   INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  month            SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  temp_avg         DECIMAL(5,2),        -- °C media mensile
  temp_min         DECIMAL(5,2),        -- °C media minimi
  temp_max         DECIMAL(5,2),        -- °C media massimi
  precipitation_mm DECIMAL(7,2),        -- mm pioggia totale mensile
  UNIQUE (destination_id, month)
);

-- Eventi ricorrenti: festival, carnevali, fiere, eventi sportivi
-- month_start/end: mesi in cui si svolge (es. Carnevale: 2-2)
CREATE TABLE IF NOT EXISTS events (
  id               SERIAL PRIMARY KEY,
  destination_id   INTEGER NOT NULL REFERENCES destinations(id) ON DELETE CASCADE,
  name             VARCHAR(200) NOT NULL,
  description      TEXT,
  month_start      SMALLINT CHECK (month_start BETWEEN 1 AND 12),
  month_end        SMALLINT CHECK (month_end BETWEEN 1 AND 12),
  type             VARCHAR(50)   -- 'festival' | 'carnival' | 'sports' | 'cultural' | 'market'
);
