-- Backfill the standard (EU-14) allergen set for restaurants created before the
-- menu domain existed, so SC-007 ("every restaurant has the standard set") holds
-- for legacy data too. New restaurants are seeded in the create transaction
-- (RestaurantsService). Idempotent: the (restaurantId, label) unique index makes
-- ON CONFLICT DO NOTHING skip rows that already exist, so re-running is safe.
--
-- Labels mirror @repo/core STANDARD_ALLERGENS (the source of truth for app code).
-- Legacy rows use a uuid-as-text id here purely as a unique PK; rows created by
-- the app use cuid2 — both are opaque text ids.
INSERT INTO "allergens" ("id", "restaurantId", "label", "isStandard", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, r."id", v."label", true, now(), now()
FROM "restaurants" r
CROSS JOIN (
  VALUES
    ('Gluten içeren tahıllar'),
    ('Kabuklu deniz ürünleri'),
    ('Yumurta'),
    ('Balık'),
    ('Yer fıstığı'),
    ('Soya'),
    ('Süt'),
    ('Sert kabuklu yemişler'),
    ('Kereviz'),
    ('Hardal'),
    ('Susam'),
    ('Kükürt dioksit ve sülfitler'),
    ('Acı bakla (lüpen)'),
    ('Yumuşakçalar')
) AS v ("label")
ON CONFLICT ("restaurantId", "label") DO NOTHING;
