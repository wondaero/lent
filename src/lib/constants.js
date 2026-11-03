// 한국십진분류(KDC) 주류
export const KDC = ['총류', '철학', '종교', '사회과학', '자연과학', '기술과학', '예술', '언어', '문학', '역사']

export const BOOK_STATUS = {
  available: { label: '대여가능', tone: 'green' },
  loaned: { label: '대여중', tone: 'blue' },
  repair: { label: '수리중', tone: 'amber' },
  lost: { label: '분실', tone: 'red' },
  discarded: { label: '폐기', tone: 'gray' },
}

export const MEMBER_STATUS = {
  active: { label: '정상', tone: 'green' },
  suspended: { label: '대여정지', tone: 'red' },
  hold: { label: '보류', tone: 'amber' },
}

export const GENDER = { M: '남', F: '여' }

export const LIBRARY_NAME = '그루터기작은도서관'
