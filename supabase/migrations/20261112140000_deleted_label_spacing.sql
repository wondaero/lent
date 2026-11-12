-- 삭제 표시 괄호를 앞말에 붙여 쓴다(문장 부호 규정, 사용자 요청 2026-11-12): "홍*동(삭제된 회원)", "서명(삭제된 도서)"
-- loan_list 정의는 20261110120000과 같고 띄어쓰기만 바꿈

create or replace view public.loan_list with (security_invoker = true) as
select l.*,
  (l.returned_at is null and coalesce(l.extended_due_at, l.due_at) < public.kst_today()) as overdue,
  coalesce(b.reg_no, l.book_reg_no) as search_reg_no,
  coalesce(b.title, l.book_title) as search_title,
  m.name as member_name,
  case when b.id is not null then
    jsonb_build_object('id', b.id, 'reg_no', b.reg_no, 'title', b.title, 'author', b.author, 'class_no', b.class_no, 'author_mark', b.author_mark)
  else
    jsonb_build_object('id', null, 'deleted', true, 'reg_no', l.book_reg_no,
      'title', case when l.book_title is null then '(삭제된 도서)' else l.book_title || '(삭제된 도서)' end,
      'author', '', 'class_no', '', 'author_mark', '')
  end as book,
  case when m.id is null then null
  when m.deleted_at is not null then
    jsonb_build_object('id', m.id, 'deleted', true, 'name', m.name || '(삭제된 회원)', 'phone', m.phone, 'member_no', m.member_no, 'loan_days', m.loan_days)
  else
    jsonb_build_object('id', m.id, 'name', m.name, 'phone', m.phone, 'member_no', m.member_no, 'loan_days', m.loan_days)
  end as member
from public.loans l
left join public.books b on b.id = l.book_id
left join public.members m on m.id = l.member_id;
