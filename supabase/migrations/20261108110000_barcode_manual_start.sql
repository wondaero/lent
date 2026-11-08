-- 바코드 라벨 시작 번호를 직접 입력(사용자 결정). 기본값은 자동(마지막 번호 + 1)이고 언제든 고칠 수 있다.
--  - 인쇄하면 "시작 + 장수 - 1"이 마지막 번호보다 클 때만 그 값으로 올린다(건너뛴 번호는 비어도 괜찮음).
--  - 마지막 번호보다 작은 범위 = 다시 뽑기 → 마지막 번호를 내리지 않는다(내리면 다음 자동 번호가 이미 붙인 라벨과 겹침).
--  - p_expected = 화면이 보고 있던 마지막 번호. 그 사이 다른 PC가 출력했으면 거부(같은 번호 두 번 출력 방지).
drop function if exists public.barcode_issue(integer, integer);
drop function if exists public.barcode_release(integer, integer);

create or replace function public.barcode_issue(p_from integer, p_count integer, p_expected integer) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  v_last int;
  v_end  int := p_from + p_count - 1;
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;
  if p_from < 1 or p_count < 1 then raise exception '번호를 확인해주세요.'; end if;
  perform 1 from settings where key = 'barcode_last_issued_no' for update;
  v_last := public.barcode_last_issued();
  if v_last <> p_expected then
    raise exception '그 사이 다른 곳에서 바코드를 출력했습니다. 화면을 새로고침한 뒤 다시 확인해주세요.';
  end if;
  if v_end > v_last then
    update settings set value = to_jsonb(v_end) where key = 'barcode_last_issued_no';
    return v_end;
  end if;
  return v_last;
end $$;

-- 인쇄 취소: 이번 인쇄로 올린 마지막 번호를 인쇄 전 값(p_prev)으로 되돌린다.
-- 그 뒤로 더 출력됐거나 이번 범위의 번호로 등록된 책이 있으면 되돌리지 않는다(비는 건 괜찮고 겹치면 안 됨)
create or replace function public.barcode_release(p_from integer, p_count integer, p_prev integer) returns integer
language plpgsql security invoker set search_path = public as $$
declare v_set int;
begin
  if not public.is_staff() then raise exception '권한이 없습니다.'; end if;
  select (value #>> '{}')::int into v_set from settings where key = 'barcode_last_issued_no' for update;
  if v_set <> p_from + p_count - 1
     or exists (select 1 from books where reg_no ~ '^EM[0-9]{8}$' and substring(reg_no from 3)::int > p_prev) then
    raise exception '이미 다음 번호가 사용되어 되돌리지 않았습니다.';
  end if;
  update settings set value = to_jsonb(p_prev) where key = 'barcode_last_issued_no';
  return public.barcode_last_issued();
end $$;

revoke execute on function public.barcode_issue(integer, integer, integer), public.barcode_release(integer, integer, integer) from public, anon;
grant execute on function public.barcode_issue(integer, integer, integer), public.barcode_release(integer, integer, integer) to authenticated;
