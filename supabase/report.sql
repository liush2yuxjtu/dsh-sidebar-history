-- Run as the project owner in Supabase SQL Editor. Counts are events, not users.
select (received_at at time zone 'UTC')::date as day, version, locale, event, count(*) as events
from public.dsh_sidebar_usage_events
where received_at >= now() - interval '30 days'
group by 1,2,3,4 order by 1 desc,2,3,4;
