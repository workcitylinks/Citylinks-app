-- Drop the overly restrictive unique constraint (allows only 1 role per user)
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_unique_user;

-- Now add all roles for the existing Google SSO user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'employee'::app_role FROM auth.users WHERE email = 'sachi.hvr@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'merchant'::app_role FROM auth.users WHERE email = 'sachi.hvr@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'labor'::app_role FROM auth.users WHERE email = 'sachi.hvr@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'transportation'::app_role FROM auth.users WHERE email = 'sachi.hvr@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- Create merchant record
INSERT INTO public.merchants (user_id, business_name, business_type, approval_status, onboarding_complete, onboarding_step, city, district)
SELECT id, 'CityLinks Demo Store', 'retail', 'approved', true, 4, 'Haveri', 'Haveri'
FROM auth.users WHERE email = 'sachi.hvr@gmail.com'
ON CONFLICT DO NOTHING;

-- Create labor profile
INSERT INTO public.labor_profiles (user_id, full_name, email, approval_status)
SELECT id, 'Sachchidanand Kulkarni', 'sachi.hvr@gmail.com', 'approved'
FROM auth.users WHERE email = 'sachi.hvr@gmail.com'
ON CONFLICT DO NOTHING;

-- Create transporter record
INSERT INTO public.transporters (user_id, full_name, email, approval_status, city, district)
SELECT id, 'Sachchidanand Kulkarni', 'sachi.hvr@gmail.com', 'approved', 'Haveri', 'Haveri'
FROM auth.users WHERE email = 'sachi.hvr@gmail.com'
ON CONFLICT DO NOTHING;

-- Create employee record
INSERT INTO public.employees (user_id, tier, title)
SELECT id, 'A1', 'Admin'
FROM auth.users WHERE email = 'sachi.hvr@gmail.com'
ON CONFLICT DO NOTHING;