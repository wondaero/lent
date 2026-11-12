// 청구기호 해석·저자기호 생성·서가순 정렬 규칙 (CLAUDE.md 5절). 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseCallQuery, classPrefix, callSortKey, makeAuthorMark, mainAuthor, isAuthorMarkOk } from '../src/lib/callNumber.js'

const pick = (q) => parseCallQuery(q)

test('띄어쓰기·순서와 상관없이 같은 청구기호로 해석', () => {
  for (const s of ['813.6마83ㄷ', '813.6 마83ㄷ', '마83ㄷ 813.6']) {
    const q = pick(s)
    assert.equal(q.classNo, '813.6', s)
    assert.equal(q.authorMark, '마83ㄷ', s)
    assert.equal(q.rest, '', s)
  }
})

test('저자기호 끝 글자를 완성형으로 쳐도 초성으로 보정', () => {
  assert.equal(pick('마83다 813.6').authorMark, '마83ㄷ')
})

test('권차·복본', () => {
  const q = pick('813.6 마83ㄷ v.2 c.2')
  assert.equal(q.volume, '2')
  assert.equal(q.copy, '2')
})

test('인식되지 않은 나머지는 키워드', () => {
  const q = pick('813 아몬드')
  assert.equal(q.classNo, '813')
  assert.equal(q.rest, '아몬드')
})

test('ISBN·연도·등록번호·서명 속 숫자는 청구기호로 오인식하지 않음', () => {
  for (const s of ['9788936434120', '978-89-364-3412-0', '2024', '100장면', 'EM00005724']) {
    assert.equal(pick(s).classNo, '', s)
  }
  assert.equal(pick('이야기2').authorMark, '')
  assert.equal(pick('EM00005724').rest, 'EM00005724')
})

test('영문 저자기호는 분류기호와 함께일 때만', () => {
  assert.equal(pick('B612').authorMark, '')
  assert.equal(pick('K2').authorMark, '')
  assert.equal(pick('843 S123').authorMark, 'S123')
})

test('분류기호 계층 검색: 정수부 끝 0 = 하위 전체', () => {
  assert.equal(classPrefix('800'), '8')
  assert.equal(classPrefix('810'), '81')
  assert.equal(classPrefix('813'), '813')
  assert.equal(classPrefix('813.6'), '813.6')
})

test('서가순 정렬: 마8 < 마83 < 마9, v.2 < v.10, 813 < 813.6', () => {
  const k = (class_no, author_mark, volume) => callSortKey({ class_no, author_mark, volume })
  const sorted = (arr) => [...arr].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  const marks = [k('813', '마9'), k('813', '마83'), k('813', '마8')]
  assert.deepEqual(sorted(marks), [k('813', '마8'), k('813', '마83'), k('813', '마9')])
  assert.ok(k('813', '마83', 2) < k('813', '마83', 10))
  assert.ok(k('813', '마83') < k('813.6', '가11'))
})

test('저자기호 생성(리재철 제5표)', () => {
  assert.deepEqual(makeAuthorMark({ author: '마광수', title: '도서관' }), { mark: '마15ㄷ' })
  // ㅊ + ㅏ 이외 모음은 ㅊ 모음표(예전 버그였던 부분): 김철수 → 김83
  assert.equal(makeAuthorMark({ author: '김철수', title: '' }).mark, '김83')
  // 서명이 숫자로 시작하면 첫 글자, 글자가 없으면 붙이지 않음
  assert.equal(makeAuthorMark({ author: '조남주', title: '82년생 김지영' }).mark.slice(-1), 'ㄴ')
  assert.match(makeAuthorMark({ author: '조지오웰', title: '1984' }).mark, /^조\d+$/)
  // 총서명이 있으면 총서명 기준이고 서명 초성을 붙이지 않음
  assert.match(makeAuthorMark({ author: '마광수', seriesTitle: '마법천자문', title: '도서관' }).mark, /^마\d+$/)
})

test('한글이 아닌 이름은 한글 두 글자를 받음', () => {
  assert.equal(makeAuthorMark({ author: 'Rowling', title: 'Harry' }).needKorean, true)
  assert.ok(makeAuthorMark({ author: 'Rowling', title: 'Harry', korean: '롤링' }).mark)
  assert.ok(makeAuthorMark({}).error)
})

test('저자 칸에서 첫 번째 저자 이름만', () => {
  assert.equal(mainAuthor('글·그림: 셰리 저메이징 ;옮김: 이진영'), '셰리 저메이징')
  assert.equal(mainAuthor('기획 구성,이경택,김철수'), '이경택')
  assert.equal(mainAuthor('나관중 지음;이문열 옮김'), '나관중')
  assert.equal(mainAuthor('그림 이수지'), '이수지')
  assert.equal(mainAuthor('편혜영'), '편혜영')
})

test('저자기호 형식 검사', () => {
  for (const m of ['마83ㄷ', '김54', '카297ㅂ', 'S123']) assert.ok(isAuthorMarkOk(m), m)
  for (const m of ['글undefinedundefinedㅍ', '글ㅅ', '', null]) assert.ok(!isAuthorMarkOk(m), String(m))
})
