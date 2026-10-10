
-- Update handle_new_user to auto-assign employee role for @citylinks.in emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE 
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'approved'
      WHEN NEW.email LIKE '%@citylinks.in' THEN 'approved'
      ELSE 'pending'
    END
  );
  
  -- Auto-assign employee role for @citylinks.in emails
  IF NEW.email LIKE '%@citylinks.in' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;
