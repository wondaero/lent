<script setup>
import { computed, onActivated, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { books } from '@/api'
import { BOOK_STATUS, KDC, bookStatusText } from '@/lib/constants'
import { fmtDate, num, callNumberLines } from '@/lib/format'
import { parseCallQuery, hasCallTokens, classPrefix } from '@/lib/callNumber'
import { usePagedList } from '@/lib/usePagedList'
import SearchBox from '@/components/SearchBox.vue'
import Pagination from '@/components/Pagination.vue'
import KdcTag from '@/components/KdcTag.vue'
import ExportButton from '@/components/ExportButton.vue'
import { exportXlsx, fetchAll } from '@/lib/exportXlsx'

defineOptions({ name: 'BookListPage' })

const router = useRouter()
const { filters, page, rows, total, loading, perPage, load } = usePagedList(books.list, { keyword: '', status: '', category: '', sort: 'recent' })

// 검색어 해석 결과를 보여줘서 "어떻게 찾고 있는지" 확인 가능하게
const parsed = computed(() => parseCallQuery(filters.keyword))
const chips = computed(() => {
  const q = parsed.value
  const out = []
  if (q.classNo) {
    const p = classPrefix(q.classNo)
    out.push({ label: '분류', value: q.classNo, hint: p.length < 3 && !p.includes('.') ? `${p.padEnd(3, 'x')} 전체` : '하위 포함' })
  }
  if (q.authorMark) out.push({ label: '저자기호', value: q.authorMark })
  if (q.volume) out.push({ label: '권차', value: `v.${q.volume}` })
  if (q.copy) out.push({ label: '복본', value: `c.${q.copy}` })
  if (q.rest && out.length) out.push({ label: '키워드', value: q.rest })
  return out
})

// 청구기호로 찾을 때는 서가 순서로 보는 게 자연스러움
watch(() => hasCallTokens(parsed.value), (isCall) => {
  if (isCall && filters.sort === 'recent') filters.sort = 'call'
})

async function exportList() {
  const all = await fetchAll(books.list, filters)
  await exportXlsx('도서목록', [
    { header: '등록번호', value: (b) => b.reg_no, width: 11 },
    { header: '청구기호', value: (b) => callNumberLines(b).join(' '), width: 18 },
    { header: '서명', value: (b) => b.title, width: 30 },
    { header: '총서명', value: (b) => b.series_title, width: 16 },
    { header: '저자', value: (b) => b.author, width: 14 },
    { header: '출판사', value: (b) => b.publisher, width: 12 },
    { header: '발행연도', value: (b) => b.pub_year, width: 8 },
    { header: 'ISBN', value: (b) => b.isbn, width: 15 },
    { header: '상태', value: (b) => bookStatusText(b), width: 12 },
    { header: '대출자', value: (b) => b.loan?.member_name, width: 8 },
    { header: '반납예정일', value: (b) => fmtDate(b.loan?.due_at) },
    { header: '등록일', value: (b) => fmtDate(b.created_at) },
  ], all)
}

let mounted = false
onMounted(() => { load(); mounted = true })
// 캐시된 화면으로 돌아왔을 때 수정/삭제 결과 반영
onActivated(() => { if (mounted) load() })
</script>

<template>
  <div>
    <div class="toolbar">
      <SearchBox v-model="filters.keyword" placeholder="청구기호(813.6 마83ㄷ), 서명, 저자, 등록번호" />
      <select v-model="filters.status" class="select w-auto" aria-label="상태">
        <option value="">전체 상태</option>
        <option v-for="(s, k) in BOOK_STATUS" :key="k" :value="k">{{ s.label }}</option>
      </select>
      <select v-model="filters.category" class="select w-auto" aria-label="분류">
        <option value="">전체 분류</option>
        <option v-for="(k, i) in KDC" :key="i" :value="String(i)">{{ i }}00 {{ k }}</option>
      </select>
      <div class="grow" />
      <router-link to="/books/new" class="btn primary">+ 도서 등록</router-link>
    </div>

    <div v-if="chips.length" class="parsed">
      <span class="muted">청구기호로 검색</span>
      <span v-for="c in chips" :key="c.label" class="chip">
        <b>{{ c.label }}</b> {{ c.value }}<small v-if="c.hint">· {{ c.hint }}</small>
      </span>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="muted">총 <strong class="num" style="color: var(--text)">{{ num(total) }}</strong>권</span>
        <div class="head-right">
          <select v-model="filters.sort" class="select sort" aria-label="정렬">
            <option value="recent">최신 등록순</option>
            <option value="call">청구기호순 (서가순)</option>
            <option value="title">서명순</option>
          </select>
          <ExportButton :run="exportList" />
        </div>
      </div>
      <div v-if="loading" class="loading-bar" />
      <div class="tbl-wrap">
        <!-- 고정 레이아웃: 등록번호/등록일 등은 최소 고정폭, 남는 폭은 전부 서명에 -->
        <table class="tbl fixed">
          <colgroup>
            <col class="w-regno" />
            <col class="w-call" />
            <col />
            <col class="w-author" />
            <col class="w-pub" />
            <col class="w-status" />
            <col class="w-date" />
          </colgroup>
          <thead>
            <tr><th>등록번호</th><th>청구기호</th><th>서명</th><th>저자</th><th>출판사</th><th>상태</th><th>등록일</th></tr>
          </thead>
          <tbody>
            <tr v-for="b in rows" :key="b.id" class="clickable" @click="router.push(`/books/${b.id}`)">
              <td class="num muted">{{ b.reg_no }}</td>
              <td class="call">
                <KdcTag :class-no="b.class_no" />
                <span class="mark num">{{ callNumberLines(b).slice(1).join(' ') }}</span>
              </td>
              <td class="title">{{ b.title }}<span v-if="b.series_title" class="sub">{{ b.series_title }}</span></td>
              <td class="ellipsis" :title="b.author">{{ b.author }}</td>
              <td class="ellipsis" :title="b.publisher">{{ b.publisher }}</td>
              <td class="ellipsis">
                <span class="badge" :class="BOOK_STATUS[b.status]?.tone">{{ BOOK_STATUS[b.status]?.label }}</span>
                <span v-if="b.status === 'hold' && b.hold_reason" class="sub">{{ b.hold_reason }}</span>
                <span v-if="b.loan" class="sub">{{ b.loan.member_name }} · ~{{ fmtDate(b.loan.due_at) }}</span>
              </td>
              <td class="num muted">{{ fmtDate(b.created_at) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !rows.length" class="empty">검색 결과가 없습니다.</div>
      </div>
      <Pagination v-model="page" :total="total" :per-page="perPage" />
    </div>
  </div>
</template>

<style scoped>
.head-right { display: flex; align-items: center; gap: 8px; }
.w-auto { width: auto; }
.sort { width: auto; height: 32px; font-size: 13.5px; }
.parsed { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: -4px 0 12px; font-size: 13px; }
.chip { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 10px; border-radius: 13px; background: var(--brand-soft); color: var(--brand-ink); }
.chip b { font-weight: 600; }
.chip small { color: var(--text-3); }
.fixed { table-layout: fixed; min-width: 980px; }
.w-regno { width: 100px; }
.w-call { width: 180px; }
.w-author { width: 130px; }
.w-pub { width: 120px; }
.w-status { width: 140px; }
.w-date { width: 108px; }
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.call { white-space: nowrap; }
.call .mark { margin-left: 6px; font-weight: 600; }
.title { font-weight: 500; overflow-wrap: anywhere; }
</style>
