create or replace function public.user_can_view_order(_order_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _viewer uuid := auth.uid();
begin
  if _viewer is null then
    return false;
  end if;

  if public.has_role(_viewer, 'employee') then
    return true;
  end if;

  if exists (
    select 1
    from public.orders o
    where o.id = _order_id
      and o.customer_id = _viewer
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = _order_id
      and oi.merchant_id in (select public.current_user_merchant_ids())
  ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.can_access_order_item(_order_id uuid, _merchant_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _viewer uuid := auth.uid();
begin
  if _viewer is null then
    return false;
  end if;

  if public.has_role(_viewer, 'employee') then
    return true;
  end if;

  if _merchant_id is not null and exists (
    select 1
    from public.current_user_merchant_ids() as merchant_id
    where merchant_id = _merchant_id
  ) then
    return true;
  end if;

  return exists (
    select 1
    from public.orders o
    where o.id = _order_id
      and o.customer_id = _viewer
  );
end;
$$;

revoke all on function public.can_access_order_item(uuid, uuid) from public;
grant execute on function public.can_access_order_item(uuid, uuid) to authenticated;

create or replace function public.get_featured_ads(_limit integer default 4)
returns table (
  id uuid,
  title text,
  description text,
  image_url text,
  link_url text,
  category text,
  priority integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.title,
    a.description,
    a.image_url,
    a.link_url,
    a.category,
    a.priority
  from public.ads a
  where a.is_active = true
    and (a.expires_at is null or a.expires_at > now())
  order by a.priority desc, a.created_at desc
  limit greatest(coalesce(_limit, 4), 1)
$$;

revoke all on function public.get_featured_ads(integer) from public;
grant execute on function public.get_featured_ads(integer) to anon, authenticated;

create or replace function public.get_marketplace_popular_items(_limit integer default 8)
returns table (
  entity_type text,
  entity_id uuid,
  title text,
  subtitle text,
  link_url text,
  badge text,
  price_label text,
  popularity bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with product_counts as (
    select oi.product_id as id, count(*)::bigint as popularity
    from public.order_items oi
    where oi.product_id is not null
    group by oi.product_id
  ),
  service_counts as (
    select sb.service_id as id, count(*)::bigint as popularity
    from public.service_bookings sb
    where sb.service_id is not null
    group by sb.service_id
  ),
  transport_counts as (
    select tb.transporter_id as id, count(*)::bigint as popularity
    from public.transport_bookings tb
    group by tb.transporter_id
  ),
  shop_counts as (
    select oi.merchant_id as id, count(*)::bigint as popularity
    from public.order_items oi
    where oi.merchant_id is not null
    group by oi.merchant_id
  ),
  candidates as (
    select
      'product'::text as entity_type,
      mp.id as entity_id,
      mp.name as title,
      m.business_name as subtitle,
      '/shop/' || m.id::text as link_url,
      'Product'::text as badge,
      case
        when mp.price is not null then '₹' || trim(to_char(mp.price, 'FM999999999.00')) || ' / ' || coalesce(mp.unit, 'item')
        else null
      end as price_label,
      coalesce(pc.popularity, 0) as popularity
    from public.merchant_products mp
    join public.merchants m on m.id = mp.merchant_id
    left join product_counts pc on pc.id = mp.id
    where mp.is_online = true
      and mp.is_active = true
      and mp.stock_quantity > 0
      and m.approval_status = 'approved'

    union all

    select
      'service'::text as entity_type,
      ls.id as entity_id,
      ls.service_name as title,
      coalesce(nullif(ls.category, ''), 'Service') as subtitle,
      '/services?category=' || replace(lower(coalesce(nullif(ls.category, ''), 'general')), ' ', '%20') as link_url,
      'Service'::text as badge,
      case
        when ls.hourly_rate is not null then '₹' || trim(to_char(ls.hourly_rate, 'FM999999999.00')) || ' / hr'
        else 'Contact for price'
      end as price_label,
      coalesce(sc.popularity, 0) as popularity
    from public.labor_services ls
    left join service_counts sc on sc.id = ls.id
    where ls.is_active = true

    union all

    select
      'transport'::text as entity_type,
      t.id as entity_id,
      t.full_name as title,
      coalesce(t.city, t.district, t.state, 'Transport Provider') as subtitle,
      '/book-transport'::text as link_url,
      'Transport'::text as badge,
      null::text as price_label,
      coalesce(tc.popularity, 0) as popularity
    from public.transporters t
    left join transport_counts tc on tc.id = t.id
    where t.approval_status = 'approved'
      and t.is_active = true

    union all

    select
      'shop'::text as entity_type,
      m.id as entity_id,
      m.business_name as title,
      coalesce(nullif(m.business_type, ''), 'Shop') as subtitle,
      '/shop/' || m.id::text as link_url,
      'Shop'::text as badge,
      null::text as price_label,
      coalesce(shc.popularity, 0) as popularity
    from public.merchants m
    left join shop_counts shc on shc.id = m.id
    where m.approval_status = 'approved'
  )
  select
    c.entity_type,
    c.entity_id,
    c.title,
    c.subtitle,
    c.link_url,
    c.badge,
    c.price_label,
    c.popularity
  from candidates c
  order by c.popularity desc, c.title asc
  limit greatest(coalesce(_limit, 8), 1)
$$;

revoke all on function public.get_marketplace_popular_items(integer) from public;
grant execute on function public.get_marketplace_popular_items(integer) to anon, authenticated;

drop policy if exists "Customers can view own order items" on public.order_items;
drop policy if exists "Merchants can view own order items" on public.order_items;
create policy "Users can view accessible order items"
on public.order_items
for select
to authenticated
using (public.can_access_order_item(order_id, merchant_id));

drop policy if exists "Merchants can update own order items" on public.order_items;
create policy "Merchants can update own order items"
on public.order_items
for update
to authenticated
using (merchant_id in (select public.current_user_merchant_ids()))
with check (merchant_id in (select public.current_user_merchant_ids()));

drop policy if exists "Public can view approved merchants" on public.merchants;
create policy "Public can view approved merchants"
on public.merchants
for select
to anon, authenticated
using (approval_status = 'approved');

drop policy if exists "Public can view online products" on public.merchant_products;
create policy "Public can view online products"
on public.merchant_products
for select
to anon, authenticated
using (is_online = true and is_active = true);

drop policy if exists "Public can view active services" on public.labor_services;
create policy "Public can view active services"
on public.labor_services
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Public can view approved transporters" on public.transporters;
create policy "Public can view approved transporters"
on public.transporters
for select
to anon, authenticated
using (approval_status = 'approved');

drop policy if exists "Public can view active transporter vehicles" on public.transporter_vehicles;
create policy "Public can view active transporter vehicles"
on public.transporter_vehicles
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.transporters t
    where t.id = transporter_id
      and t.approval_status = 'approved'
      and t.is_active = true
  )
);

drop policy if exists "Public can view locations" on public.locations;
create policy "Public can view locations"
on public.locations
for select
to anon, authenticated
using (true);

drop policy if exists "Public can view merchant categories" on public.merchant_categories;
create policy "Public can view merchant categories"
on public.merchant_categories
for select
to anon, authenticated
using (true);

drop policy if exists "Public can view active ads" on public.ads;
create policy "Public can view active ads"
on public.ads
for select
to anon, authenticated
using (is_active = true and (expires_at is null or expires_at > now()));

drop policy if exists "Merchants can view own ads" on public.ads;
create policy "Merchants can view own ads"
on public.ads
for select
to authenticated
using (created_by = auth.uid());

drop policy if exists "Merchants can submit own ads" on public.ads;
create policy "Merchants can submit own ads"
on public.ads
for insert
to authenticated
with check (
  created_by = auth.uid()
  and public.has_role(auth.uid(), 'merchant')
  and coalesce(is_active, false) = false
);