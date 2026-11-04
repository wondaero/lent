<script setup>
import { onActivated, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { loans } from '@/api'
import { addDays, dueOf, fmtDate, num, overdueDays } from '@/lib/format'
import { usePagedList } from '@/lib/usePagedList'
import { exportXlsx, fetchAll } from '@/lib/exportXlsx'
import SearchBox from '@/components/SearchBox.vue'
import Pagination from '@/components/Pagination.vue'
import LoanActionDialog from '@/components/LoanActionDialog.vue'
import ExportButton from '@/components/ExportButton.vue'

defineOptions({ name: 'LoanListPage' })

const router = useRouter()
const { filters, page, rows, total, loading, perPage, load } = usePagedList(loans.list, { keyword: '', state: 'active', dateBy: 'loaned_at', from: '', to: '' })

const tabs = [
  { v: 'active', label: '대출중' },
  { v: 'overdue', label: '연체' },
  { v: 'returned', label: '반납완료' },
  { v: '', label: '전체' },
]

// 기간 필터. 빠른 선택은 from/to를 채우고, '기간'은 날짜를 직접 고른다
const periods = [['all', '전체'], ['today', '오늘'], ['week', '이번 주'], ['month', '이번 달'], ['custom', '기간']]
const period = ref('all')
function setPeriod(p) {
  period.value = p
  const today = addDays(0)
  const d = new Date()
  if (p === 'all') Object.assign(filters, { from: '', to: '' })
  else if (p === 'today') Object.assign(filters, { from: today, to: today })
  else if (p === 'week') Object.assign(filters, { from: addDays(-((d.getDay() + 6) % 7)), to: today })   // 월요일 시작
  else if (p === 'month') Object.assign(filters, { from: addDays(1 - d.getDate()), to: today })
  else if (!filters.from) Object.assign(filters, { from: addDays(-30), to: today })
}

function stateOf(l) {
  if (!l.returned_at) return l.overdue ? { label: `연체 ${overdueDays(dueOf(l))}일`, tone: 'red' } : { label: '대출중', tone: 'blue' }
  const late = overdueDays(dueOf(l), l.returned_at)
  return late ? { label: `반납(연체 ${late}일)`, tone: 'amber' } : { label: '반납', tone: 'gray' }
}

// 줄 단위 반납/연장(바코드 훼손, 스캔 누락, 전화 연장 요청 등). 대출/반납 화면과 같은 API를 쓴다
const action = ref({ loan: null, mode: 'return' })
const openAction = (loan, mode) => { action.value = { loan, mode } }
const closeAction = () => { action.value = { loan: null, mode: action.value.mode } }
function onDone() {
  closeAction()
  load()
}

async function exportList() {
  const all = await fetchAll(loans.list, filters)
  await exportXlsx('대출기록', [
    { header: '등록번호', value: (l) => l.book?.reg_no, width: 11 },
    { header: '서명', value: (l) => l.book?.title ?? '(삭제된 도서)', width: 30 },
    { header: '회원번호', value: (l) => l.member?.member_no, width: 10 },
    { header: '회원', value: (l) => l.member?.name, width: 8 },
    { header: '전화번호', value: (l) => l.member?.phone, width: 14 },
    { header: '대출일', value: (l) => fmtDate(l.loaned_at) },
    { header: '반납예정일', value: (l) => fmtDate(l.due_at) },
    { header: '연장 반납일', value: (l) => fmtDate(l.extended_due_at) },
    { header: '반납일', value: (l) => fmtDate(l.returned_at) },
    { header: '상태', value: (l) => stateOf(l).label, width: 14 },
  ], all)
}

let mounted = false
onMounted(() => { load(); mounted = true })
onActivated(() => { if (mounted) load() })
</script>

<template>
  <div>
    <div class="toolbar">
      <SearchBox v-model="filters.keyword" placeholder="서명, 등록번호, 회원 이름" />
      <div class="seg">
        <button v-for="t in tabs" :key="t.v" :class="{ on: filters.state === t.v }" @click="filters.state = t.v">{{ t.label }}</button>
      </div>
      <div class="grow" />
      <router-link to="/circulation" class="btn primary">대출 / 반납</router-link>
    </div>
    <div class="toolbar">
      <div class="seg" role="group" aria-label="기간 기준">
        <button :class="{ on: filters.dateBy === 'loaned_at' }" @click="filters.dateBy = 'loaned_at'">대출일</button>
        <button :class="{ on: filters.dateBy === 'returned_at' }" @click="filters.dateBy = 'returned_at'">반납일</button>
      </div>
      <div class="seg" role="group" aria-label="기간">
        <button v-for="p in periods" :key="p[0]" :class="{ on: period === p[0] }" @click="setPeriod(p[0])">{{ p[1] }}</button>
      </div>
      <template v-if="period === 'custom'">
        <input v-model="filters.from" type="date" class="input date" aria-label="시작일" />
        <span class="muted">~</span>
        <input v-model="filters.to" type="date" class="input date" aria-label="종료일" />
      </template>
    </div>
    <div class="card">
      <div class="card-head">
        <span class="muted">총 <strong class="num" style="color: var(--text)">{{ num(total) }}</strong>건</span>
        <ExportButton :run="exportList" />
      </div>
      <div v-if="loading" class="loading-bar" />
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>도서</th><th>회원</th><th>대출일</th><th>반납예정일</th><th>반납일</th><th>상태</th><th class="act" /></tr></thead>
          <tbody>
            <tr v-for="l in rows" :key="l.id" class="clickable" @click="l.member && router.push(`/members/${l.member.id}`)">
              <td class="title-cell">{{ l.book?.title ?? '(삭제된 도서)' }}<span class="sub num">{{ l.book?.reg_no }}</span></td>
              <td class="nowrap">{{ l.member?.name ?? '-' }}<span class="sub num">{{ l.member?.phone }}</span></td>
              <td class="nowrap num">{{ fmtDate(l.loaned_at) }}</td>
              <td class="nowrap num">{{ fmtDate(dueOf(l)) }}<span v-if="l.extended_due_at" class="sub">연장 · 처음 {{ fmtDate(l.due_at) }}</span></td>
              <td class="nowrap num">{{ fmtDate(l.returned_at) || '-' }}</td>
              <td><span class="badge" :class="stateOf(l).tone">{{ stateOf(l).label }}</span></td>
              <td class="act" @click.stop>
                <template v-if="!l.returned_at">
                  <button class="btn sm secondary" @click="openAction(l, 'return')">반납</button>
                  <button class="btn sm" @click="openAction(l, 'extend')">연장</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !rows.length" class="empty">기록이 없습니다.</div>
      </div>
      <Pagination v-model="page" :total="total" :per-page="perPage" />
    </div>
    <LoanActionDialog :loan="action.loan" :mode="action.mode" @close="closeAction" @done="onDone" />
  </div>
</template>

<style scoped>
.act { width: 1%; white-space: nowrap; text-align: right; }
.act .btn + .btn { margin-left: 4px; }
.date { width: 150px; }
</style>
