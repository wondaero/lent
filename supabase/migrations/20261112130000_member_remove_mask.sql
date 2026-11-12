-- 회원 삭제 시 이름도 가린다(사용자 결정 2026-11-12): 대출 기록에 "홍*동 (삭제된 회원)"
-- 화면에서만 가리지 않고 저장된 이름을 바꾼다. 탈퇴한 회원의 개인정보는 파기 대상(개인정보보호법 제21조)이라
-- 실명·연락처를 DB에 남기지 않는다(실명 검색으로 기록이 찾아지는 일도 없음). 대출 기록 자체는 운영 기록이라 남긴다.
-- 나머지는 20261112120000과 같음(기록 없으면 완전 삭제, 대출 중이면 거부)
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
     set deleted_at = now(), name = public.mask_name(name),
         phone = null, birth_date = null, gender = null, address = null, memo = null
   where id = p_id;
  return 'hidden';
end $$;
comment on function public.members_remove(bigint) is '회원 삭제: 대출 기록 없으면 완전 삭제, 있으면 가린 이름(홍*동)·회원번호만 남기고 삭제 표시';

-- 이미 삭제 표시된 회원도 같은 규칙으로(이름 가리기는 두 번 해도 결과가 같음)
update members set name = public.mask_name(name) where deleted_at is not null;

comment on column public.members.deleted_at is '삭제일시. 대출 기록이 있는 회원만 삭제 표시로 남는다(이름은 가리고 회원번호만 남김, 나머지 개인정보는 비움). 기록이 없으면 행을 지운다';
