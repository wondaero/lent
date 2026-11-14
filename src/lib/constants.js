// 한국십진분류(KDC) 주류
export const KDC = ['총류', '철학', '종교', '사회과학', '자연과학', '기술과학', '예술', '언어', '문학', '역사']

// 대출할 수 있는 상태는 available뿐. readonly·hold는 서가에 있어도 대출 불가
export const BOOK_STATUS = {
  available: { label: '대출가능', tone: 'green' },
  loaned: { label: '대출중', tone: 'blue' },
  readonly: { label: '관내열람', tone: 'gray' },
  // 등록(라벨 부착까지)은 했지만 애매해서 아직 빌려줄 수 없는 책. 사유(hold_reason) 필수
  hold: { label: '대출보류', tone: 'amber' },
  lost: { label: '분실', tone: 'red' },
  discarded: { label: '폐기', tone: 'gray' },
}
// 대출보류 사유 입력 칸의 추천 목록(직접 입력도 가능)
export const HOLD_REASONS = ['파손', '수리 중', '분실 의심', '내용 검토', '정리 중']
// 화면 표시용: "대출보류(파손)"
// 등록중 = 등록은 했지만 청구기호 라벨을 아직 출력하지 않은 책(사용자 결정 2026-11-14). 대출할 수 없다.
//   DB status 값이 아니라 status 'available' + spine_label_printed false에서 나온 표시용 상태.
//   라벨 출력에서 [잘 나왔어요]를 누르면 저절로 대출가능이 된다. 목록 필터에서도 별도 항목
export const REGISTERING = { label: '등록중', tone: 'amber' }
export const isRegistering = (b) => b?.status === 'available' && b.spine_label_printed === false
// 화면에 보일 상태 { label, tone }
export const bookStatusOf = (b) => (isRegistering(b) ? REGISTERING : BOOK_STATUS[b?.status])
export const bookStatusText = (b) => {
  const label = bookStatusOf(b)?.label ?? ''
  return b?.status === 'hold' && b.hold_reason ? `${label}(${b.hold_reason})` : label
}

export const MEMBER_STATUS = {
  active: { label: '정상', tone: 'green' },
  suspended: { label: '대출정지', tone: 'red' },
  hold: { label: '보류', tone: 'amber' },
}

export const GENDER = { M: '남', F: '여' }

export const LIBRARY_NAME = '그루터기작은도서관'

// 관리자 로그인은 아이디(예전 시스템 아이디 그대로). Supabase Auth는 이메일만 받으므로
// "아이디@LOGIN_DOMAIN"으로 바꿔 로그인한다. 대시보드에서 계정을 만들 때도 이 형식(예: abc123@lent.or.kr)
export const LOGIN_DOMAIN = 'lent.or.kr'

// 게시판 분류. photos = 사진 첨부 가능(활동만, 사용자 결정)
export const POST_CATEGORY = {
  notice: { label: '공지사항', photos: false },
  activity: { label: '활동', photos: true },
}

export const POST_STATUS = {
  published: { label: '게시', tone: 'green' },
  draft: { label: '임시저장', tone: 'gray' },
}

// 게시판 사진: 업로드 전에 브라우저에서 줄인다(src/lib/imageResize.js)
//   maxSide = 긴 변 최대 px(휴대폰 화면 폭 가득 보여도 흐리지 않은 크기), thumbSide = 목록용 작은 사진
export const POST_PHOTO = { maxSide: 1280, thumbSide: 400, quality: 0.8, maxCount: 30 }
