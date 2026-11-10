-- Dedicated objects; existing project application tables and grants stay unchanged.
create table public.dsh_sidebar_usage_events (
  event_id uuid primary key,
  version text not null check (version ~ '^\d{1,3}\.\d{1,3}\.\d{1,3}$'),
  locale text not null check (locale in ('en','zh-CN','zh-TW','ja','es')),
  event text not null check (event in ('plugin_loaded','card_open_requested','card_open_failed','native_navigation_selected','history_cards_selected','search_some','search_zero','search_error','projection_ready','projection_error','projection_missing','projection_migration_required','diagnostic_test')),
  received_at timestamptz not null default now()
);
create index dsh_sidebar_usage_received on public.dsh_sidebar_usage_events(received_at);
alter table public.dsh_sidebar_usage_events enable row level security;
revoke all on public.dsh_sidebar_usage_events from public, anon, authenticated;
grant select, insert, delete on public.dsh_sidebar_usage_events to service_role;

create table public.dsh_sidebar_usage_limits (day date primary key, attempts integer not null);
alter table public.dsh_sidebar_usage_limits enable row level security;
revoke all on public.dsh_sidebar_usage_limits from public, anon, authenticated;
grant select, insert, update, delete on public.dsh_sidebar_usage_limits to service_role;

create function public.dsh_sidebar_usage_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare admitted integer;
begin
  -- Global daily write ceiling. No IP address or stable user identifier is needed.
  insert into public.dsh_sidebar_usage_limits(day,attempts) values ((now() at time zone 'UTC')::date,1)
    on conflict (day) do update set attempts=public.dsh_sidebar_usage_limits.attempts+1
    where public.dsh_sidebar_usage_limits.attempts < 10000 returning attempts into admitted;
  if admitted is null then raise exception 'usage capacity reached'; end if;
  return new;
end;
$$;
revoke all on function public.dsh_sidebar_usage_guard() from public, anon, authenticated;
grant execute on function public.dsh_sidebar_usage_guard() to service_role;
create trigger dsh_sidebar_usage_cap before insert on public.dsh_sidebar_usage_events
  for each row execute function public.dsh_sidebar_usage_guard();

create extension if not exists pg_cron;
select cron.schedule('dsh-sidebar-usage-retention', '17 3 * * *',
  $$delete from public.dsh_sidebar_usage_events where received_at < now() - interval '30 days';
    delete from public.dsh_sidebar_usage_limits where day < current_date - 31;$$);
