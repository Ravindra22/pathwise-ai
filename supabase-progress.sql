-- Pathwise roadmap progress persistence
alter table public.career_plans
  add column if not exists id uuid default gen_random_uuid(),
  add column if not exists progress jsonb not null default '{"completedWeeks": []}'::jsonb;

update public.career_plans
  set id = gen_random_uuid()
  where id is null;

create unique index if not exists career_plans_id_key on public.career_plans (id);

-- Allow each signed-in user to delete only their own saved plans.
drop policy if exists "Users can delete their own career plans" on public.career_plans;
create policy "Users can delete their own career plans"
  on public.career_plans for delete
  to authenticated
  using (auth.uid() = user_id);
