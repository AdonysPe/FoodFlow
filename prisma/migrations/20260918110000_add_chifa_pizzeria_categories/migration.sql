-- Seed-only and idempotent: no restaurant, menu, table, QR or order is changed.
INSERT INTO "RestaurantCategory" (
  "id", "name", "slug", "description", "defaultMenuTemplate", "isActive", "createdAt", "updatedAt"
)
VALUES
  ('chifa', 'Chifa', 'chifa', 'Restaurantes de cocina chino-peruana', 'chifa', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('pizzeria', 'Pizzería', 'pizzeria', 'Pizzerías artesanales, tradicionales y contemporáneas', 'pizzeria', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "slug" = EXCLUDED."slug",
  "description" = EXCLUDED."description",
  "defaultMenuTemplate" = EXCLUDED."defaultMenuTemplate",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP;
