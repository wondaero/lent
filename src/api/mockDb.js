// 목업 데이터베이스 — Supabase 연동 전까지 사용.
// 테이블/컬럼 구조는 Supabase(Postgres)에 만들 스키마와 동일하게 맞춘다.
//
// books   : id, reg_no, isbn, title, series_title, author, publisher, pub_year,
//           class_no, author_mark, volume, copy_no, call_sort_key, status, label_printed, memo, created_at
import { callSortKey, makeAuthorMark } from '@/lib/callNumber'
import { fmtRegNo } from '@/lib/regNo'
// members : id, member_no, name, phone, birth, gender, address, loan_limit, loan_days,
//           status, memo, created_at, deleted_at
// loans   : id, book_id, member_id, loaned_at, due_at, extended_due_at, returned_at
//           due_at = 대출 때 정한 반납 예정일(변경 안 함), extended_due_at = 마지막 연장 반납일(없으면 null)
// settings: key, value — barcode_last_no = 마지막으로 출력한 바코드 라벨 번호(등록번호 숫자 부분)

let seed = 20240123
function rand() {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min

const DAY = 86400000
const now = Date.now()

const TITLES = {
  0: ['정보의 이해', '도서관 이야기', '백과사전 읽기', '컴퓨터 첫걸음', '지식의 지도'],
  1: ['철학 콘서트', '생각하는 힘', '마음의 법칙', '심리학 수업', '행복의 조건'],
  2: ['세계의 종교', '신화의 세계', '성경 이야기', '불교 입문'],
  3: ['경제학 콘서트', '정의란 무엇인가', '사회학 입문', '교육의 미래', '법과 생활', '돈의 속성'],
  4: ['코스모스', '이기적 유전자', '수학의 즐거움', '물리학 산책', '공룡 대백과', '곤충 도감'],
  5: ['요리의 기초', '집 고치기', '건강한 몸', '자동차 구조', '로봇 만들기'],
  6: ['미술관 가는 길', '음악의 역사', '사진 잘 찍는 법', '축구 교본', '그림 그리기'],
  7: ['우리말 바로쓰기', '영어 첫걸음', '한자 교실', '일본어 회화'],
  8: ['어린 왕자', '해리 포터', '나미야 잡화점의 기적', '소년이 온다', '채식주의자', '아몬드', '불편한 편의점', '달러구트 꿈 백화점', '구름빵', '마당을 나온 암탉', '82년생 김지영', '셜록 홈즈'],
  9: ['한국사 편지', '세계사 산책', '삼국유사', '조선왕조실록', '여행의 기술', '먼나라 이웃나라'],
}
const SUB_CLASS = {
  0: ['004', '020', '030'], 1: ['100', '180', '189'], 2: ['200', '220', '230'],
  3: ['320', '331', '340', '370'], 4: ['400', '410', '420', '470', '490'],
  5: ['510', '590', '594', '550'], 6: ['650', '670', '692', '660'],
  7: ['710', '740', '730'], 8: ['800', '810', '813.6', '813.7', '863', '843', '833.6'], 9: ['911', '909', '981'],
}
const AUTHORS = ['김영하', '한강', '손원평', '정유정', '히가시노 게이고', '조앤 롤링', '생텍쥐페리',
  '칼 세이건', '리처드 도킨스', '유시민', '황선미', '백희나', '이원복', '마이클 샌델', '김호연', '이미예',
  '아서 코난 도일', '채사장', '김정운', '조남주']
const PUBLISHERS = ['문학동네', '창비', '민음사', '김영사', '사이언스북스', '비룡소', '현암사', '위즈덤하우스', '다산책방', '한빛미디어']

const LAST = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권']
const FIRST = ['민준', '서연', '도윤', '하은', '시우', '지유', '주원', '서윤', '하준', '지민', '예준', '수아', '지호', '채원', '건우', '소율']
const ROADS = ['중앙로', '도서관길', '학교로', '공원로', '시장길']


const iso = (t) => new Date(t).toISOString()

function build() {
  const books = []
  const BOOK_COUNT = 1200
  for (let i = 1; i <= BOOK_COUNT; i++) {
    const major = rand() < 0.38 ? 8 : int(0, 9)
    const title = pick(TITLES[major])
    const author = pick(AUTHORS)
    const volume = rand() < 0.15 ? String(int(1, 5)) : ''
    books.push({
      id: i,
      reg_no: fmtRegNo(i),
      isbn: `97889${String(int(10000000, 99999999))}`,
      title: volume ? `${title} ${volume}` : title,
      series_title: volume ? title : '',
      author,
      publisher: pick(PUBLISHERS),
      pub_year: String(int(1995, 2025)),
      class_no: pick(SUB_CLASS[major]),
      author_mark: makeAuthorMark({ author, title: volume ? `${title} ${volume}` : title, seriesTitle: volume ? title : '' }).mark || '',
      volume,
      copy_no: rand() < 0.1 ? String(int(2, 3)) : '',
      status: rand() < 0.015 ? 'lost' : rand() < 0.015 ? 'repair' : 'available',
      label_printed: rand() > 0.06,
      memo: '',
      created_at: iso(now - (BOOK_COUNT - i) * DAY * 0.6 - int(0, DAY)),
    })
  }
  books.forEach((b) => (b.call_sort_key = callSortKey(b)))

  const members = []
  const MEMBER_COUNT = 260
  for (let i = 1; i <= MEMBER_COUNT; i++) {
    members.push({
      id: i,
      member_no: `M${String(i).padStart(5, '0')}`,
      name: pick(LAST) + pick(FIRST),
      phone: `010-${int(1000, 9999)}-${int(1000, 9999)}`,
      birth: `${int(1950, 2018)}-${String(int(1, 12)).padStart(2, '0')}-${String(int(1, 28)).padStart(2, '0')}`,
      gender: rand() < 0.5 ? 'M' : 'F',
      address: `행복시 ${pick(ROADS)} ${int(1, 300)}`,
      loan_limit: pick([5, 5, 5, 7, 10]),
      loan_days: pick([14, 14, 14, 21]),
      status: rand() < 0.04 ? 'suspended' : 'active',
      memo: '',
      created_at: iso(now - int(5, 700) * DAY),
      deleted_at: null,
    })
  }

  // 대출 이력: 최근 365일. 오래된 건 반납 완료, 최근 일부는 대출중/연체
  const loans = []
  const activeByMember = new Map()
  let loanId = 1
  for (let d = 365; d >= 0; d--) {
    const weekend = new Date(now - d * DAY).getDay() % 6 === 0
    const count = int(weekend ? 6 : 2, weekend ? 16 : 9)
    for (let k = 0; k < count; k++) {
      const book = books[int(0, books.length - 1)]
      if (book.status !== 'available') continue
      const member = members[int(0, members.length - 1)]
      const loanedAt = now - d * DAY - int(0, DAY / 2)
      const dueAt = loanedAt + member.loan_days * DAY
      let returnedAt = null
      const keep = d < 30 ? rand() < 0.55 : d < 60 ? rand() < 0.05 : false
      const active = activeByMember.get(member.id) || 0
      if (!keep || active >= member.loan_limit) {
        const late = rand() < 0.12
        returnedAt = loanedAt + int(1, member.loan_days + (late ? 10 : 0)) * DAY
        // 미래 시점이면 대출일~현재 사이로 분산
        if (returnedAt >= now) returnedAt = loanedAt + rand() * (now - loanedAt)
      } else {
        book.status = 'loaned'
        activeByMember.set(member.id, active + 1)
      }
      loans.push({
        id: loanId++,
        book_id: book.id,
        member_id: member.id,
        loaned_at: iso(loanedAt),
        due_at: iso(dueAt),
        extended_due_at: null,
        returned_at: returnedAt ? iso(returnedAt) : null,
      })
    }
  }

  // 기존 도서 번호까지는 바코드 라벨이 출력된 상태로 시작
  return { books, members, loans, settings: { barcode_last_no: BOOK_COUNT } }
}

export const db = build()
export const nextId = {
  books: db.books.length + 1,
  members: db.members.length + 1,
  loans: db.loans.length + 1,
}

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
