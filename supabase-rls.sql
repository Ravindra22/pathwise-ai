-- Run this once in the Supabase SQL Editor for Pathwise.
-- It ensures a signed-in user can access only career_plans rows where
-- user_id matches their authenticated account.

alter table public.career_plans enable row level security;

drop policy if exists "Pathwise users select their own plans" on public.career_plans;
create policy "Pathwise users select their own plans"
  on public.career_plans for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Pathwise users insert their own plans" on public.career_plans;
create policy "Pathwise users insert their own plans"
  on public.career_plans for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Pathwise users update their own plans" on public.career_plans;
create policy "Pathwise users update their own plans"
  on public.career_plans for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Pathwise users delete their own plans" on public.career_plans;
create policy "Pathwise users delete their own plans"
  on public.career_plans for delete to authenticated
  using (auth.uid() = user_id);
