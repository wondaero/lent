// 등록번호 정리 규칙 (CLAUDE.md 7절). 실행: npm test
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeRegNo, parseRegNo, fmtRegNo } from '../src/lib/regNo.js'

test('한글 자판 상태로 스캔한 값을 되돌림', () => {
  assert.equal(normalizeRegNo('뜨00004055'), 'EM00004055')
})

test('공백 제거·대문자', () => {
  assert.equal(normalizeRegNo(' em 00004055 '), 'EM00004055')
})

test('형식 검사와 번호 만들기', () => {
  assert.equal(parseRegNo('EM00005724'), 5724)
  assert.equal(parseRegNo('뜨00005724'), 5724)
  assert.equal(parseRegNo('EM123'), null)
  assert.equal(parseRegNo('9788936434120'), null)
  assert.equal(fmtRegNo(5724), 'EM00005724')
})
