-- 회원 삭제 규칙(2026-11-12, 사용자 결정)
--   대출 기록이 없는 회원 → 행을 완전히 지운다(남길 이유가 없음)
--   대출 기록이 있는 회원 → 행은 남겨 대출 기록에 "홍길동 (삭제된 회원)"으로 보이게 하고,
--                           이름·회원번호 외 개인정보(전화·생년월일·성별·주소·메모)는 비운다
--   대출 중인 책이 있으면 삭제 불가. 화면 검사만으로는 다른 PC의 동시 대출을 못 막아서 DB에서 회원을 잠그고 검사한다
--   (loans_process도 대출할 때 회원 행을 for update로 잠그므로 둘이 겹치지 않는다)
-- 외래키(loans.member_id → members, on delete restrict)는 그대로: 대출 기록이 있는 회원은 행이 남아야 이름이 보인다.

-- 1) 지운 회원번호를 새 회원에게 다시 주지 않게(이미 나간 회원카드 번호와 겹침) 마지막으로 쓴 번호를 기억한다.
--    새 번호 = greatest(남아 있는 최대 번호, 지운 회원 중 최대 번호) + 1
--    회원 행이 지워질 때마다(앱의 삭제든 대시보드에서 직접 지우든) 트리거가 기록한다
create or replace function public.members_remember_no() returns trigger
language plpgsql set search_path = public as $$
begin
  insert into settings (key, value) values ('member_last_issued_no', to_jsonb(old.member_no))
  on conflict (key) do update
    set value = to_jsonb(greatest((settings.value #>> '{}')::int, old.member_no));
  return old;
end $$;
drop trigger if exists members_remember_no on public.members;
create trigger members_remember_no before delete on public.members
  for each row execute function public.members_remember_no();

create or replace function public.member_next_no() returns integer
language sql stable security invoker set search_path = public as $$
  select greatest(
    coalesce((select (value #>> '{}')::int from settings where key = 'member_last_issued_no'), 0),
    coalesce((select max(member_no) from members), 0)
  ) + 1
$$;
comment on function public.member_next_no() is '새 회원번호 = 지금까지 쓴 최대 번호 + 1(지운 회원 번호 포함, settings.member_last_issued_no)';

-- 2) 회원 삭제. 반환: 'deleted'(완전히 지움) / 'hidden'(삭제 표시 + 개인정보 비움)
create or replace function public.members_remove(p_id bigint) returns text
language plpgsql security invoker set search_path = public as $$
declare v_m members;
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;
  select * into v_m from members where id = p_id and deleted_at is null for update;
  if not found then raise exception '회원을 찾을 수 없습니다.'; end if;
  if exists (select 1 from loans where member_id = p_id and returned_at is null) then
    raise exception '대출 중인 도서가 있는 회원은 삭제할 수 없습니다.';
  end if;
  if not exists (select 1 from loans where member_id = p_id) then
    delete from members where id = p_id;
    return 'deleted';
  end if;
  update members
     set deleted_at = now(), phone = null, birth_date = null, gender = null, address = null, memo = null
   where id = p_id;
  return 'hidden';
end $$;
comment on function public.members_remove(bigint) is '회원 삭제: 대출 기록 없으면 완전 삭제, 있으면 이름·회원번호만 남기고 삭제 표시';

revoke execute on function public.member_next_no(), public.members_remove(bigint) from public, anon;
grant execute on function public.member_next_no(), public.members_remove(bigint) to authenticated;

-- 3) 이미 삭제 표시된 회원도 같은 규칙으로 정리(전환 전 시험 데이터에서 지운 회원)
update members set phone = null, birth_date = null, gender = null, address = null, memo = null
 where deleted_at is not null and exists (select 1 from loans where member_id = members.id);
delete from members m
 where m.deleted_at is not null and not exists (select 1 from loans where member_id = m.id);

comment on column public.members.member_no is '회원번호(숫자, 회원카드에 쓰임). 옛 번호 유지, 새 회원은 member_next_no()(지운 회원 번호도 다시 쓰지 않음)';
comment on column public.members.deleted_at is '삭제일시. 대출 기록이 있는 회원만 삭제 표시로 남는다(이름·회원번호 외 개인정보는 비움). 기록이 없으면 행을 지운다';
