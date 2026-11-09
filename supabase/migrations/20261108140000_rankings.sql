-- 대시보드 대출 순위(사용자 결정): 많이 빌려진 책 + 많이 빌린 회원(이름 가림). 회원 순위는 나중에 뺄 수 있음.
-- 이름 가리기는 DB에서 한다 → 대시보드(카운터 화면을 이용자가 볼 수 있음)에 실명이 아예 전달되지 않는다.

-- 홍길동 → 홍*동, 김철 → 김*, 남궁민수 → 남**수
create or replace function public.mask_name(p text) returns text
language sql immutable set search_path = public as $$
  select case
    when p is null or char_length(p) <= 1 then p
    when char_length(p) = 2 then left(p, 1) || '*'
    else left(p, 1) || repeat('*', char_length(p) - 2) || right(p, 1)
  end
$$;

-- p_from: 이 시각 이후 대출만(null = 전체). 책은 띄어쓰기를 무시한 서명으로 묶는다(복본·같은 서명의 여러 권은 합산).
--   예: "(만화로 보는)그리스 로마 신화"와 "…그리스 로마신화"(저자 표기도 "지음"/"저"로 다름)가 한 줄로. 삭제된 책은 제외
create or replace function public.loan_rankings(p_from timestamptz, p_limit integer default 10) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'books', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.loans desc, x.title)
      from (
        select min(b.title) as title, min(b.author) as author, count(*)::int as loans, count(distinct b.id)::int as copies
        from loans l join books b on b.id = l.book_id
        where p_from is null or l.loaned_at >= p_from
        group by regexp_replace(b.title, '\s', '', 'g')
        order by count(*) desc, min(b.title)
        limit p_limit
      ) x), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(to_jsonb(y) order by y.loans desc, y.name)
      from (
        select mask_name(m.name) as name, count(*)::int as loans
        from loans l join members m on m.id = l.member_id
        where (p_from is null or l.loaned_at >= p_from) and m.deleted_at is null
        group by m.id, m.name
        order by count(*) desc, m.id
        limit p_limit
      ) y), '[]'::jsonb)
  )
$$;

revoke execute on function public.mask_name(text), public.loan_rankings(timestamptz, integer) from public, anon;
grant execute on function public.mask_name(text), public.loan_rankings(timestamptz, integer) to authenticated;
