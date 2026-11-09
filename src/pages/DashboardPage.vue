<script setup>
import { computed, onMounted, ref, shallowRef, watch } from 'vue'
import { stats, loans } from '@/api'
import { KDC } from '@/lib/constants'
import { num, fmtDate, overdueDays, dueOf, addDays } from '@/lib/format'
import { toast } from '@/stores/toast'
import ChartCanvas from '@/components/ChartCanvas.vue'

const summary = shallowRef(null)
const trend = shallowRef(null)
const unit = ref('day')
const overdue = shallowRef([])

const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim()

onMounted(async () => {
  try {
    const [s, o] = await Promise.all([
      stats.dashboard(),
      loans.list({ state: 'overdue', perPage: 8 }),
      loadTrend(),
    ])
    summary.value = s
    overdue.value = o.rows
  } catch (e) { toast.error(e) }
})

// 대출 순위(사용자 결정): 많이 빌려진 책 + 많이 빌린 회원(이름은 DB에서 가려 옴, 홍*동). 회원 순위는 나중에 뺄 수 있음
const rankPeriod = ref('year')
const rankPeriods = [['month', '이번 달'], ['year', '올해'], ['all', '전체']]
const rankings = shallowRef(null)
async function loadRankings() {
  const d = new Date()
  const from = rankPeriod.value === 'month' ? addDays(1 - d.getDate()) : rankPeriod.value === 'year' ? `${d.getFullYear()}-01-01` : ''
  rankings.value = await stats.rankings({ from, limit: 10 })
}
watch(rankPeriod, () => loadRankings().catch(toast.error))
onMounted(() => loadRankings().catch(toast.error))

async function loadTrend() {
  trend.value = await stats.loanTrend(unit.value)
}
watch(unit, () => loadTrend().catch(toast.error))

const tiles = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: '전체 도서', value: s.totalBooks, unit: '권', to: '/books' },
    { label: '대출 중', value: s.loanedBooks, unit: '권', to: '/loans', sub: `대출률 ${((s.loanedBooks / s.totalBooks) * 100).toFixed(1)}%` },
    { label: '연체', value: s.overdueLoans, unit: '건', to: '/loans', tone: s.overdueLoans ? 'red' : '' },
    { label: '회원', value: s.totalMembers, unit: '명', to: '/members' },
    { label: '오늘 대출 / 반납', value: `${s.todayLoans} / ${s.todayReturns}`, unit: '건', to: '/circulation' },
    { label: '라벨 미출력', value: s.unprintedLabels, unit: '권', to: '/print', tone: s.unprintedLabels ? 'amber' : '' },
  ]
})

const categoryConfig = computed(() => {
  const s = summary.value
  if (!s) return null
  return {
    type: 'bar',
    data: {
      labels: KDC.map((k, i) => `${i}00 ${k}`),
      // 막대 색 = 도서 목록의 분류 태그 색(--kdc-N). 화면 전체에서 같은 분류는 같은 색
      datasets: [{ data: s.category, backgroundColor: KDC.map((_, i) => css(`--kdc-${i}`)), borderRadius: 4, barThickness: 14 }],
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (c) => ` ${num(c.raw)}권 (${((c.raw / s.totalBooks) * 100).toFixed(1)}%)` } },
      },
      scales: { x: { grid: { color: css('--line') }, ticks: { precision: 0 } }, y: { grid: { display: false } } },
    },
  }
})

const trendConfig = computed(() => {
  const t = trend.value
  if (!t) return null
  return {
    type: 'bar',
    data: {
      labels: t.labels,
      datasets: [
        { label: '대출', data: t.loans, backgroundColor: css('--brand'), borderRadius: 3, order: 2 },
        { label: '반납', data: t.returns, type: 'line', borderColor: css('--blue'), backgroundColor: css('--blue'), pointRadius: 0, pointHoverRadius: 4, borderWidth: 2, tension: 0.3, order: 1 },
      ],
    },
    options: {
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'top', align: 'end', reverse: true, labels: { boxWidth: 10, boxHeight: 10 } } },
      scales: { x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } }, y: { beginAtZero: true, grid: { color: css('--line') }, ticks: { precision: 0 } } },
    },
  }
})

const trendTotal = computed(() => trend.value?.loans.reduce((a, b) => a + b, 0) ?? 0)
</script>

<template>
  <div class="stack">
    <section class="tiles">
      <template v-if="summary">
        <router-link v-for="t in tiles" :key="t.label" :to="t.to" class="tile card" :class="t.tone">
          <span class="label">{{ t.label }}</span>
          <strong class="value num">{{ typeof t.value === 'number' ? num(t.value) : t.value }}<small>{{ t.unit }}</small></strong>
          <span v-if="t.sub" class="sub">{{ t.sub }}</span>
        </router-link>
      </template>
      <div v-else v-for="i in 6" :key="i" class="tile card skeleton" />
    </section>

    <section class="charts">
      <div class="card">
        <div class="card-head">
          <h3>기간별 대출 <span class="muted num total">총 {{ num(trendTotal) }}건</span></h3>
          <div class="seg">
            <button :class="{ on: unit === 'day' }" @click="unit = 'day'">일별</button>
            <button :class="{ on: unit === 'week' }" @click="unit = 'week'">주별</button>
            <button :class="{ on: unit === 'month' }" @click="unit = 'month'">월별</button>
          </div>
        </div>
        <div class="card-body chart-h"><ChartCanvas v-if="trendConfig" :config="trendConfig" /></div>
      </div>
      <div class="card">
        <div class="card-head"><h3>분류별 장서 (KDC)</h3></div>
        <div class="card-body chart-h"><ChartCanvas v-if="categoryConfig" :config="categoryConfig" /></div>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h3>대출 순위</h3>
        <div class="seg">
          <button v-for="p in rankPeriods" :key="p[0]" :class="{ on: rankPeriod === p[0] }" @click="rankPeriod = p[0]">{{ p[1] }}</button>
        </div>
      </div>
      <div class="ranks">
        <div>
          <h4 class="rank-title">많이 빌려진 책</h4>
          <ol v-if="rankings?.books.length" class="rank-list">
            <li v-for="(b, i) in rankings.books" :key="b.title">
              <span class="no num">{{ i + 1 }}</span>
              <span class="grow"><span class="t">{{ b.title }}</span><span class="sub">{{ b.author }}<template v-if="b.copies > 1"> · {{ b.copies }}권 소장</template></span></span>
              <strong class="cnt num">{{ num(b.loans) }}회</strong>
            </li>
          </ol>
          <div v-else-if="rankings" class="empty small">대출 기록이 없습니다.</div>
        </div>
        <div>
          <h4 class="rank-title">많이 빌린 회원</h4>
          <ol v-if="rankings?.members.length" class="rank-list">
            <li v-for="(m, i) in rankings.members" :key="i">
              <span class="no num">{{ i + 1 }}</span>
              <span class="grow t">{{ m.name }}</span>
              <strong class="cnt num">{{ num(m.loans) }}권</strong>
            </li>
          </ol>
          <div v-else-if="rankings" class="empty small">대출 기록이 없습니다.</div>
        </div>
      </div>
    </section>

    <section class="card">
      <div class="card-head">
        <h3>연체 도서</h3>
        <router-link to="/loans" class="btn ghost sm">전체 보기</router-link>
      </div>
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th>도서</th><th class="fit">회원</th><th class="fit">대출일</th><th class="fit">반납예정일</th><th class="r fit">연체</th></tr></thead>
          <tbody>
            <tr v-for="l in overdue" :key="l.id">
              <td class="title-cell">
                <router-link v-if="l.book?.id" :to="`/books/${l.book.id}`" class="cell-link">{{ l.book.title }}</router-link>
                <template v-else>{{ l.book?.title }}</template>
                <span class="sub">{{ l.book?.reg_no }}</span>
              </td>
              <td class="nowrap">
                <router-link v-if="l.member" :to="`/members/${l.member.id}`" class="cell-link">{{ l.member.name }}</router-link>
                <span class="sub">{{ l.member?.phone }}</span>
              </td>
              <td class="nowrap num">{{ fmtDate(l.loaned_at) }}</td>
              <td class="nowrap num">{{ fmtDate(dueOf(l)) }}</td>
              <td class="r"><span class="badge red num">{{ overdueDays(dueOf(l)) }}일</span></td>
            </tr>
          </tbody>
        </table>
        <div v-if="summary && !overdue.length" class="empty">연체 도서가 없습니다.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.tiles { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
@media (max-width: 1280px) { .tiles { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 560px) { .tiles { grid-template-columns: repeat(2, 1fr); } }
.tile { display: grid; gap: 4px; padding: 16px 18px; text-decoration: none; color: var(--text); min-height: 96px; transition: border-color .15s; }
.tile:hover { border-color: var(--line-strong); }
.tile .label { font-size: 13px; color: var(--text-3); font-weight: 500; }
.tile .value { font-size: 26px; font-weight: 700; letter-spacing: -.02em; }
.tile .value small { font-size: 14px; font-weight: 500; color: var(--text-3); margin-left: 3px; }
.tile .sub { font-size: 12px; color: var(--text-3); }
.tile.red .value { color: var(--red); }
.tile.amber .value { color: var(--amber); }
.skeleton { background: linear-gradient(90deg, var(--surface) 25%, var(--hover) 50%, var(--surface) 75%); background-size: 200% 100%; animation: sk 1.2s infinite; }
@keyframes sk { from { background-position: 100% 0; } to { background-position: -100% 0; } }
.charts { display: grid; grid-template-columns: 3fr 2fr; gap: 18px; }
.chart-h { height: 320px; }
.total { font-size: 13px; font-weight: 500; margin-left: 6px; }
@media (max-width: 1100px) { .charts { grid-template-columns: 1fr; } }
.ranks { display: grid; grid-template-columns: 3fr 2fr; gap: 0; }
.ranks > div { padding: 14px 18px 16px; min-width: 0; }
.ranks > div + div { border-left: 1px solid var(--line); }
.rank-title { margin: 0 0 8px; font-size: 13px; font-weight: 700; color: var(--text-3); }
.rank-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; }
.rank-list li { display: flex; align-items: center; gap: 10px; padding: 6px 4px; border-bottom: 1px solid var(--line); min-width: 0; }
.rank-list li:last-child { border-bottom: 0; }
.rank-list .no { flex: 0 0 22px; text-align: right; font-weight: 700; color: var(--text-3); }
.rank-list li:nth-child(-n+3) .no { color: var(--brand-ink); }
.rank-list .grow { flex: 1; min-width: 0; display: grid; }
.rank-list .t { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-list .sub { font-size: 12.5px; color: var(--text-3); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rank-list .cnt { flex: none; font-size: 14px; }
.small { padding: 24px 8px; font-size: 13px; }
@media (max-width: 900px) { .ranks { grid-template-columns: 1fr; } .ranks > div + div { border-left: 0; border-top: 1px solid var(--line); } }
</style>
