-- Add test products for the approved merchants
INSERT INTO public.merchant_products (merchant_id, name, price, description, unit, stock_quantity, is_online, is_active, sku)
SELECT m.id, p.name, p.price, p.description, p.unit, p.stock_quantity, true, true, p.sku
FROM public.merchants m
CROSS JOIN (VALUES
  ('Fresh Bread Loaf', 45, 'Freshly baked whole wheat bread', 'piece', 50, 'JB-001'),
  ('Butter Croissant', 60, 'Flaky French-style croissant', 'piece', 30, 'JB-002'),
  ('Chocolate Cake', 350, 'Rich dark chocolate cake 500g', 'piece', 10, 'JB-003'),
  ('Samosa Pack (6)', 90, 'Crispy vegetable samosas', 'pack', 25, 'JB-004'),
  ('Masala Chai', 20, 'Hot masala tea', 'cup', 100, 'JB-005')
) AS p(name, price, description, unit, stock_quantity, sku)
WHERE m.business_name = 'Joshi Bakery'
LIMIT 5;

INSERT INTO public.merchant_products (merchant_id, name, price, description, unit, stock_quantity, is_online, is_active, sku)
SELECT m.id, p.name, p.price, p.description, p.unit, p.stock_quantity, true, true, p.sku
FROM public.merchants m
CROSS JOIN (VALUES
  ('Hammer Claw 16oz', 280, 'Heavy duty claw hammer', 'piece', 20, 'KH-001'),
  ('PVC Pipe 1 inch', 120, '1 inch PVC pipe 6ft length', 'piece', 50, 'KH-002'),
  ('Paint Brush Set', 195, '5-piece paint brush set', 'set', 15, 'KH-003'),
  ('Cement (50kg)', 400, 'OPC 53 Grade cement bag', 'bag', 100, 'KH-004'),
  ('Wire 1mm (90m)', 850, 'Copper electrical wire roll', 'roll', 30, 'KH-005')
) AS p(name, price, description, unit, stock_quantity, sku)
WHERE m.business_name = 'Kulkarni Hardware'
LIMIT 5;
