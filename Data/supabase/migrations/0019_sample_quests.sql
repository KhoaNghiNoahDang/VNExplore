-- 0019: Sample quests. The quests the VNExplore team wrote and checked to show what a quest
-- looks like carry a "Thử nghiệm" (sample) label instead of "not confirmed yet".
-- Only the team (dashboard / service role) can set is_sample; travellers' writes keep it as it was.

alter table public.quests add column if not exists is_sample boolean not null default false;

create function public.quests_sample_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(current_setting('request.jwt.claims', true)::json ->> 'role', '') in ('anon', 'authenticated') then
    new.is_sample := case when tg_op = 'UPDATE' then old.is_sample else false end;
  end if;
  return new;
end;
$$;
create trigger quests_sample_guard before insert or update on public.quests
  for each row execute function public.quests_sample_guard();
revoke execute on function public.quests_sample_guard() from public, anon, authenticated;

-- The seven sample quests written in September 2026.
update public.quests set is_sample = true where id in (
  'cce376b2-e58e-4d68-8def-05cf18953513', -- Sáng phố cổ kiểu người Hà Nội
  'f957bd2e-b603-4d3f-b833-bcb550a322c2', -- Chiều lịch sử quanh Hồ Gươm
  '90618977-9f58-4bf4-bf35-bf46ef6e45c3', -- Hà Nội ngày mưa
  '77508de8-04ca-4fe3-bccd-33c70a459059', -- Tối phố cổ cùng nhóm bạn
  'c2932c85-641f-44ed-a660-21da3e0d0f4f', -- Cuối tuần với các bé quanh Hồ Gươm
  '6b69385b-3ce5-4ba8-ab72-691256f91806', -- Đường Lâm – đất hai vua
  'aa32848a-024d-4a00-b35f-6cfff062e845'  -- Ba Vì mây núi
);
