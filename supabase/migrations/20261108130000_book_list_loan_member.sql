-- 도서 상세에서 대출자 회원 화면으로 바로 가기 위해 book_list.loan에 member_id 추가(컬럼 구성은 그대로)
create or replace view public.book_list with (security_invoker = true) as
select b.*,
  case when l.id is null then null
       else jsonb_build_object('due_at', coalesce(l.extended_due_at, l.due_at), 'member_name', m.name, 'member_id', m.id) end as loan
from public.books b
left join public.loans l on l.book_id = b.id and l.returned_at is null
left join public.members m on m.id = l.member_id;
