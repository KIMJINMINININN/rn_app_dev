-- ───────── search_ingredient_masters: 한국어 typeahead RPC ─────────
-- ILIKE prefix(rank 1.0) + ILIKE 부분(0.7) + similarity(trigram) hybrid
create or replace function public.search_ingredient_masters(
  p_query text,
  p_user_id uuid,
  p_limit int default 10
)
returns table (
  id uuid,
  name text,
  category_id uuid,
  default_shelf_life_days int,
  default_storage_kind storage_kind,
  rank real
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with q as (select trim(p_query) as q)
  select
    m.id,
    m.name,
    m.category_id,
    m.default_shelf_life_days,
    m.default_storage_kind,
    case
      when m.name ilike (select q || '%' from q) then 1.0::real     -- prefix match
      when m.name ilike (select '%' || q || '%' from q) then 0.7::real  -- substring
      else similarity(m.name, (select q from q))                    -- pg_trgm
    end as rank
  from ingredient_master m
  where (m.user_id is null or m.user_id = p_user_id)
    and (
      m.name ilike (select '%' || q || '%' from q)
      or similarity(m.name, (select q from q)) > 0.2
    )
  order by rank desc, length(m.name) asc, m.name asc
  limit p_limit;
$$;

grant execute on function public.search_ingredient_masters(text, uuid, int)
  to anon, authenticated;
