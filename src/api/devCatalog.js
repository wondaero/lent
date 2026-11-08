// 개발용 예시 ISBN(가상의 책). Supabase 모드에서도 이 ISBN은 목업으로 응답한다(도서 등록 화면의 예시 버튼)
// 외부 서지 목록(KOLIS-NET 역할) — ISBN 조회 화면 확인용 예시. 모두 가상의 책·ISBN
//   ISBN 하나에 여러 건이 나오는 대표 상황을 담음
export const CATALOG = [
  // ① 세트 ISBN: 전집의 각 권이 같은 ISBN을 공유 → 5건
  ...[1, 2, 3, 4, 5].map((v) => ({
    isbn: '9791100000010', title: `과학탐정 루루 ${v}`, series_title: '과학탐정 루루', volume: String(v),
    author: '한별', publisher: '새싹출판', pub_year: '2023', class_no: '813.8', source: '국립중앙도서관',
  })),
  // ② 같은 책을 도서관마다 다르게 분류 → 2건 (자연과학 vs 수필)
  { isbn: '9791100000027', title: '바다를 건너는 새들', series_title: '', volume: '', author: '윤서진', publisher: '푸른숲길', pub_year: '2021', class_no: '498', source: '가람시립도서관' },
  { isbn: '9791100000027', title: '바다를 건너는 새들', series_title: '', volume: '', author: '윤서진', publisher: '푸른숲길', pub_year: '2021', class_no: '816', source: '누리작은도서관' },
  // ③ 개정판: 같은 ISBN으로 판이 다른 기록 → 2건
  { isbn: '9791100000034', title: '처음 만나는 우리 역사', series_title: '', volume: '', author: '이도담', publisher: '한빛나래', pub_year: '2018', class_no: '911', source: '국립중앙도서관' },
  { isbn: '9791100000034', title: '처음 만나는 우리 역사 (개정판)', series_title: '', volume: '', author: '이도담', publisher: '한빛나래', pub_year: '2024', class_no: '911', source: '국립중앙도서관' },
  // ④ 1건: 바로 채워짐
  { isbn: '9791100000041', title: '작은 도서관 운영 안내', series_title: '', volume: '', author: '김하늘', publisher: '그루터기출판', pub_year: '2024', class_no: '020', source: '국립중앙도서관' },
]
