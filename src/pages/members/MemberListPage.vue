<script setup>
import { onActivated, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { members } from '@/api'
import { MEMBER_STATUS } from '@/lib/constants'
import { fmtDate, num } from '@/lib/format'
import { usePagedList } from '@/lib/usePagedList'
import SearchBox from '@/components/SearchBox.vue'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'

defineOptions({ name: 'MemberListPage' })

const router = useRouter()
const { filters, page, rows, total, loading, perPage, load } = usePagedList(members.list, { keyword: '', status: '' })

const tabs = [
  { v: '', label: '전체' },
  { v: 'loaning', label: '대여중' },
  { v: 'overdue', label: '연체' },
  { v: 'suspended', label: '대여정지' },
]

let mounted = false
onMounted(() => { load(); mounted = true })
onActivated(() => { if (mounted) load() })
</script>

<template>
  <div>
    <div class="toolbar">
      <SearchBox v-model="filters.keyword" placeholder="이름, 전화번호, 회원번호" />
      <div class="seg">
        <button v-for="t in tabs" :key="t.v" :class="{ on: filters.status === t.v }" @click="filters.status = t.v">{{ t.label }}</button>
      </div>
      <div class="grow" />
      <router-link to="/members/new" class="btn primary">+ 회원 등록</router-link>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="muted">총 <strong class="num" style="color: var(--text)">{{ num(total) }}</strong>명</span>
      </div>
      <div v-if="loading" class="loading-bar" />
      <div class="tbl-wrap">
        <table class="tbl">
          <thead>
            <tr><th>회원번호</th><th>이름</th><th>전화번호</th><th class="c">대여현황</th><th>상태</th><th>가입일</th></tr>
          </thead>
          <tbody>
            <tr v-for="m in rows" :key="m.id" class="clickable" @click="router.push(`/members/${m.id}`)">
              <td class="nowrap num muted">{{ m.member_no }}</td>
              <td class="nowrap"><strong>{{ m.name }}</strong></td>
              <td class="nowrap num">{{ m.phone }}</td>
              <td class="c nowrap num">
                <span :class="{ full: m.active_loans >= m.loan_limit }">{{ m.active_loans }} / {{ m.loan_limit }}</span>
                <span v-if="m.overdue_count" class="badge red" style="margin-left: 6px">연체 {{ m.overdue_count }}</span>
              </td>
              <td><span class="badge" :class="MEMBER_STATUS[m.status]?.tone">{{ MEMBER_STATUS[m.status]?.label }}</span></td>
              <td class="nowrap num muted">{{ fmtDate(m.created_at) }}</td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!loading && !rows.length" art="search" title="찾는 회원이 없어요" text="이름이나 전화번호를 다시 확인해 보세요." />
      </div>
      <Pagination v-model="page" :total="total" :per-page="perPage" />
    </div>
  </div>
</template>

<style scoped>
.full { color: var(--amber); font-weight: 600; }
</style>
