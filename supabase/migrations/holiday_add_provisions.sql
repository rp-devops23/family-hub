-- Add 'provisions' category to holiday_items
ALTER TABLE holiday_items DROP CONSTRAINT IF EXISTS holiday_items_category_check;
ALTER TABLE holiday_items ADD CONSTRAINT holiday_items_category_check
  CHECK (category IN ('documents', 'bagages', 'provisions', 'maison', 'transport', 'enfants', 'divers'));
