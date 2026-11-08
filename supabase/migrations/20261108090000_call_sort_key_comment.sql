-- call_sort_key 설명 보강(왜 필요한지). 규칙의 원본은 src/lib/callNumber.js의 callSortKey()
comment on column public.books.call_sort_key is
  '서가 배열 순서 정렬 키. 앱의 callSortKey()(src/lib/callNumber.js)로 계산해 저장하며 DB가 직접 계산하지 않는다(Table Editor에서 분류기호·저자기호·권차를 고치면 이 값은 안 바뀜 → 앱에서 고칠 것). '
  '형식: 분류기호(정수부 3자리) 저자기호글자 저자기호숫자 끝글자 권차(4자리) 복본(4자리), 예: 808.9 시 15  0019 0000. '
  '필요한 이유는 권차: 문자열로 비교하면 v.10이 v.2보다 앞에 오므로 0002 < 0010으로 채운다. '
  '분류기호는 KDC가 항상 3자리라 문자열 순서와 같고, 저자기호 숫자는 소수식(마8 < 마83 < 마9)이라 문자열 비교로 맞다. '
  'COLLATE "C" = 앱(JS)과 같은 글자 코드 순서로 비교.';
