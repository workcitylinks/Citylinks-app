
-- Grant execute permissions on RPC functions to anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.get_featured_ads(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_marketplace_popular_items(integer) TO anon, authenticated;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
