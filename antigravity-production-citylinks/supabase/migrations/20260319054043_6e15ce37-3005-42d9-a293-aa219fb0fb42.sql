-- Assign employee role to sachi.hvr@gmail.com
INSERT INTO public.user_roles (user_id, role) 
VALUES ('379dd6bc-3e74-44f8-aec7-f06f9385dd6f', 'employee')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create employee record
INSERT INTO public.employees (user_id, tier, title)
SELECT '379dd6bc-3e74-44f8-aec7-f06f9385dd6f', 'A1', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE user_id = '379dd6bc-3e74-44f8-aec7-f06f9385dd6f');

-- Create 10 test merchants with unique generated user_ids
INSERT INTO public.merchants (user_id, business_name, business_type, phone, email, city, district, state, taluq, pincode, gst_number, pan_number, approval_status, onboarding_complete, onboarding_step) VALUES
(gen_random_uuid(), 'Kumar General Store', 'retail', '9876543210', 'kumar@shop.com', 'Hubli', 'Dharwad', 'Karnataka', 'Hubli', '580021', '29AABCT1332L1ZL', 'FGHIJ5678K', 'pending', true, 4),
(gen_random_uuid(), 'Sharma Electronics', 'retail', '9876543211', 'sharma@shop.com', 'Dharwad', 'Dharwad', 'Karnataka', 'Dharwad', '580001', '07AAGCA1234B1ZX', 'LMNOP9012Q', 'pending', true, 4),
(gen_random_uuid(), 'Patel Grocery', 'wholesale', '9876543212', 'patel@shop.com', 'Belgaum', 'Belgaum', 'Karnataka', 'Belgaum', '590001', NULL, NULL, 'pending', true, 4),
(gen_random_uuid(), 'Desai Restaurant', 'restaurant', '9876543213', 'desai@food.com', 'Gadag', 'Gadag', 'Karnataka', 'Gadag', '582101', NULL, NULL, 'pending', false, 2),
(gen_random_uuid(), 'Reddy Pharmacy', 'pharmacy', '9876543214', 'reddy@pharma.com', 'Haveri', 'Haveri', 'Karnataka', 'Haveri', '581110', NULL, 'RSTUV3456W', 'pending', true, 4),
(gen_random_uuid(), 'Naik Traders', 'wholesale', '9876543215', 'naik@trade.com', 'Karwar', 'Uttara Kannada', 'Karnataka', 'Karwar', '581301', NULL, NULL, 'pending', true, 4),
(gen_random_uuid(), 'Hegde Services', 'service', '9876543216', 'hegde@srv.com', 'Sirsi', 'Uttara Kannada', 'Karnataka', 'Sirsi', '581401', NULL, NULL, 'pending', true, 4),
(gen_random_uuid(), 'Joshi Bakery', 'restaurant', '9876543217', 'joshi@bake.com', 'Hubli', 'Dharwad', 'Karnataka', 'Hubli', '580020', NULL, NULL, 'approved', true, 4),
(gen_random_uuid(), 'Kulkarni Hardware', 'retail', '9876543218', 'kulkarni@hw.com', 'Dharwad', 'Dharwad', 'Karnataka', 'Dharwad', '580002', NULL, NULL, 'approved', true, 4),
(gen_random_uuid(), 'Patil Textiles', 'retail', '9876543219', 'patil@text.com', 'Hubli', 'Dharwad', 'Karnataka', 'Hubli', '580023', NULL, NULL, 'rejected', true, 4);

-- Create 10 test transporters with unique user_ids
INSERT INTO public.transporters (user_id, full_name, phone, email, city, district, state, approval_status) VALUES
(gen_random_uuid(), 'Ramesh Driver', '9988776601', 'ramesh@drive.com', 'Hubli', 'Dharwad', 'Karnataka', 'pending'),
(gen_random_uuid(), 'Suresh Transporter', '9988776602', 'suresh@trans.com', 'Dharwad', 'Dharwad', 'Karnataka', 'pending'),
(gen_random_uuid(), 'Mahesh Logistics', '9988776603', 'mahesh@log.com', 'Belgaum', 'Belgaum', 'Karnataka', 'pending'),
(gen_random_uuid(), 'Ganesh Carrier', '9988776604', 'ganesh@carry.com', 'Gadag', 'Gadag', 'Karnataka', 'pending'),
(gen_random_uuid(), 'Dinesh Movers', '9988776605', 'dinesh@move.com', 'Haveri', 'Haveri', 'Karnataka', 'pending'),
(gen_random_uuid(), 'Rajesh Transport', '9988776606', 'rajesh@trans.com', 'Karwar', 'Uttara Kannada', 'Karnataka', 'pending'),
(gen_random_uuid(), 'Naresh Rides', '9988776607', 'naresh@ride.com', 'Sirsi', 'Uttara Kannada', 'Karnataka', 'pending'),
(gen_random_uuid(), 'Hitesh Express', '9988776608', 'hitesh@exp.com', 'Hubli', 'Dharwad', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Nilesh Delivery', '9988776609', 'nilesh@del.com', 'Dharwad', 'Dharwad', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Paresh Auto', '9988776610', 'paresh@auto.com', 'Belgaum', 'Belgaum', 'Karnataka', 'approved');
