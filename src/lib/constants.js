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
export const bookStatusText = (b) => {
  const label = BOOK_STATUS[b?.status]?.label ?? ''
  return b?.status === 'hold' && b.hold_reason ? `${label}(${b.hold_reason})` : label
}

export const MEMBER_STATUS = {
  active: { label: '정상', tone: 'green' },
  suspended: { label: '대출정지', tone: 'red' },
  hold: { label: '보류', tone: 'amber' },
}

export const GENDER = { M: '남', F: '여' }

export const LIBRARY_NAME = '그루터기작은도서관'

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
