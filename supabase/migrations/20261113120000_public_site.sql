-- 이용자용 메인(/)이 공개 키(anon)로 부르는 읽기 전용 함수.
-- 테이블·view 권한은 anon에게 계속 열지 않는다(RLS 그대로). 대신 이 함수들이 security definer로
-- "공개해도 되는 항목만" 골라 돌려준다 → 함수 밖으로는 회원·대출자·메모·임시저장 글이 나갈 수 없다.
--   도서: 서명·총서·저자·출판사·발행연도·청구기호·상태·반납 예정일(누가 빌렸는지는 없음). 분실·폐기 도서 제외
--   게시판: 게시된 공지사항·활동과 그 사진 경로(사진 파일은 원래 공개 버킷)
--   홈: 장서 수·회원 수(합계만), 최근 활동 글

-- 도서 한 권의 공개 정보
create or replace function public.public_book_json(b public.books) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', b.id, 'reg_no', b.reg_no, 'title', b.title, 'series_title', b.series_title,
    'author', b.author, 'publisher', b.publisher, 'pub_year', b.pub_year,
    'class_no', b.class_no, 'author_mark', b.author_mark, 'volume', b.volume, 'copy_no', b.copy_no,
    'status', b.status, 'created_at', b.created_at,
    'due_on', case when b.status = 'loaned' then (
      select (coalesce(l.extended_due_at, l.due_at) at time zone 'Asia/Seoul')::date
      from loans l where l.book_id = b.id and l.returned_at is null
      order by l.loaned_at desc limit 1) end
  )
$$;

-- 도서 검색·신간. 띄어쓰기를 무시하고 찾는다("소년이온다" = "소년이 온다").
--   p_field: all(서명·총서·저자·출판사·등록번호) | title | author | publisher
--   p_new_days: 값이 있으면 최근 N일 안에 등록된 책만(신간), 최신 등록순
create or replace function public.public_books(
  p_q text default '', p_field text default 'all', p_new_days integer default null,
  p_page integer default 1, p_size integer default 20
) returns jsonb
language sql stable security definer set search_path = public as $$
  with kw as (select regexp_replace(lower(coalesce(p_q, '')), '\s', '', 'g') as v),
  hit as (
    select b.* from books b, kw
    where b.status not in ('lost', 'discarded')
      and (p_new_days is null or b.created_at >= now() - make_interval(days => least(greatest(p_new_days, 1), 366)))
      and (kw.v = '' or case coalesce(p_field, 'all')
        when 'title'     then strpos(regexp_replace(lower(b.title), '\s', '', 'g'), kw.v) > 0
        when 'author'    then strpos(regexp_replace(lower(b.author), '\s', '', 'g'), kw.v) > 0
        when 'publisher' then strpos(regexp_replace(lower(coalesce(b.publisher, '')), '\s', '', 'g'), kw.v) > 0
        else strpos(regexp_replace(lower(b.title || ' ' || coalesce(b.series_title, '') || ' ' || b.author || ' ' || coalesce(b.publisher, '')), '\s', '', 'g'), kw.v) > 0
          or lower(b.reg_no) = kw.v
      end)
  ),
  page as (
    select h.* from hit h
    order by case when p_new_days is not null then h.created_at end desc nulls last, h.title, h.call_sort_key, h.id
    offset (greatest(p_page, 1) - 1) * least(greatest(p_size, 1), 50)
    limit least(greatest(p_size, 1), 50)
  )
  select jsonb_build_object(
    'total', (select count(*) from hit),
    'rows', coalesce((select jsonb_agg(public_book_json(p) order by case when p_new_days is not null then p.created_at end desc nulls last, p.title, p.call_sort_key, p.id) from page p), '[]'::jsonb)
  )
$$;

-- 게시판 목록(게시된 글만). 고정 글 먼저, 그다음 게시일 최신순. 본문은 싣지 않는다
create or replace function public.public_posts(
  p_category text, p_q text default '', p_page integer default 1, p_size integer default 15
) returns jsonb
language sql stable security definer set search_path = public as $$
  with hit as (
    select p.* from posts p
    where p.status = 'published' and p.category = p_category
      and (coalesce(btrim(p_q), '') = '' or strpos(lower(p.title || ' ' || p.body), lower(btrim(p_q))) > 0)
  ),
  page as (
    select h.* from hit h
    order by h.pinned desc, h.published_at desc nulls last, h.id desc
    offset (greatest(p_page, 1) - 1) * least(greatest(p_size, 1), 50)
    limit least(greatest(p_size, 1), 50)
  )
  select jsonb_build_object(
    'total', (select count(*) from hit),
    'rows', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'category', p.category, 'title', p.title, 'pinned', p.pinned, 'published_at', p.published_at,
        'image_count', (select count(*) from post_images i where i.post_id = p.id),
        'image', (select jsonb_build_object('path', i.path, 'thumb_path', i.thumb_path)
                  from post_images i where i.post_id = p.id order by i.sort, i.id limit 1))
      order by p.pinned desc, p.published_at desc nulls last, p.id desc) from page p), '[]'::jsonb)
  )
$$;

-- 게시글 하나(게시된 글만, 없으면 null)
create or replace function public.public_post(p_id bigint) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id, 'category', p.category, 'title', p.title, 'body', p.body,
    'published_at', p.published_at, 'updated_at', p.updated_at,
    'images', coalesce((select jsonb_agg(jsonb_build_object('path', i.path, 'thumb_path', i.thumb_path, 'width', i.width, 'height', i.height) order by i.sort, i.id)
                        from post_images i where i.post_id = p.id), '[]'::jsonb)
  )
  from posts p where p.id = p_id and p.status = 'published'
$$;

-- 홈 화면: 장서 수·회원 수(합계만) + 사진이 있는 최근 활동 글
create or replace function public.public_home(p_activities integer default 5) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'books', (select count(*) from books where status not in ('lost', 'discarded')),
    'members', (select count(*) from members where deleted_at is null),
    'activities', coalesce((select jsonb_agg(x order by x.published_at desc) from (
      select p.id, p.title, p.published_at,
             (select jsonb_build_object('path', i.path, 'thumb_path', i.thumb_path)
              from post_images i where i.post_id = p.id order by i.sort, i.id limit 1) as image
      from posts p
      where p.status = 'published' and p.category = 'activity'
        and exists (select 1 from post_images i where i.post_id = p.id)
      order by p.published_at desc nulls last, p.id desc
      limit least(greatest(p_activities, 0), 12)) x), '[]'::jsonb)
  )
$$;

revoke execute on function public.public_book_json(public.books) from public, anon, authenticated;
revoke execute on function
  public.public_books(text, text, integer, integer, integer), public.public_posts(text, text, integer, integer),
  public.public_post(bigint), public.public_home(integer)
  from public;
grant execute on function
  public.public_books(text, text, integer, integer, integer), public.public_posts(text, text, integer, integer),
  public.public_post(bigint), public.public_home(integer)
  to anon, authenticated;
