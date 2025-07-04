-- Disable RLS for a table
create or replace function disable_rls(table_name text)
returns void
language plpgsql
security definer
as $$
begin
  execute format('alter table %I disable row level security', table_name);
end;
$$; 