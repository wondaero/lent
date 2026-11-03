<script setup>
import { onActivated, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { loans } from '@/api'
import { fmtDate, num, overdueDays } from '@/lib/format'
import { usePagedList } from '@/lib/usePagedList'
import SearchBox from '@/components/SearchBox.vue'
import Pagination from '@/components/Pagination.vue'

defineOptions({ name: 'LoanListPage' })

const router = useRouter()
const { filters, page, rows, total, loading, perPage, load } = usePagedList(loans.list, { keyword: '', state: 'active' })

const tabs = [
  { v: 'active', label: '대출중' },
  { v: 'overdue', label: '연체' },
  { v: 'returned', label: '반납완료' },
  { v: '', label: '전체' },
]

function stateOf(l) {
  if (!l.returned_at) return l.overdue ? { label: `연체 ${overdueDays(l.due_at)}일`, tone: 'red' } : { label: '대출중', tone: 'blue' }
  const late = overdueDays(l.due_at, l.returned_at)
  return late ? { label: `반납(연체 ${late}일)`, tone: 'amber' } : { label: '반납', tone: 'gray' }
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
    <div class="card">
      <div class="card-head">
        <span class="muted">총 <strong class="num" style="color: var(--text)">{{ num(total) }}</strong>건</span>
      </div>
      <div v-if="loading" class="loading-bar" />
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>도서</th><th>회원</th><th>대출일</th><th>반납예정일</th><th>반납일</th><th>상태</th></tr></thead>
          <tbody>
            <tr v-for="l in rows" :key="l.id" class="clickable" @click="l.member && router.push(`/members/${l.member.id}`)">
              <td class="title-cell">{{ l.book?.title ?? '(삭제된 도서)' }}<span class="sub num">{{ l.book?.reg_no }}</span></td>
              <td class="nowrap">{{ l.member?.name ?? '-' }}<span class="sub num">{{ l.member?.phone }}</span></td>
              <td class="nowrap num">{{ fmtDate(l.loaned_at) }}</td>
              <td class="nowrap num">{{ fmtDate(l.due_at) }}</td>
              <td class="nowrap num">{{ fmtDate(l.returned_at) || '-' }}</td>
              <td><span class="badge" :class="stateOf(l).tone">{{ stateOf(l).label }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !rows.length" class="empty">기록이 없습니다.</div>
      </div>
      <Pagination v-model="page" :total="total" :per-page="perPage" />
    </div>
  </div>
</template>
