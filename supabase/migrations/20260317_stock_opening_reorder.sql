-- Add opening_stock (original qty when first added) and reorder_level (low-stock threshold)
ALTER TABLE public.stock_inventory
  ADD COLUMN IF NOT EXISTS opening_stock numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reorder_level numeric NOT NULL DEFAULT 1;

-- Backfill opening_stock from current stock_on_hand for existing rows
UPDATE public.stock_inventory
  SET opening_stock = stock_on_hand
  WHERE opening_stock = 0 AND stock_on_hand > 0;
