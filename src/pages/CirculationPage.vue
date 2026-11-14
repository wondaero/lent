<script setup>
import { computed, nextTick, onActivated, onDeactivated, ref, shallowRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { members, loans } from '@/api'
import { MEMBER_STATUS, bookStatusText, isRegistering } from '@/lib/constants'
import { normalizeRegNo } from '@/lib/regNo'
import { addDays, dueOf, fmtDate, overdueDays } from '@/lib/format'
import { useToday } from '@/lib/useToday'
import { toast } from '@/stores/toast'
import KdcTag from '@/components/KdcTag.vue'
import LoanActionDialog from '@/components/LoanActionDialog.vue'

// 대출/반납 통합 (위 → 아래 한 흐름)
//   스캔 → 처리 목록(대출 중이면 '반납', 아니면 '대출'로 자동 분류)
//   → 반납이 있으면 '반납 처리일', 대출이 있으면 '대출할 회원' 칸이 나타남 → 처리하기
// 반납은 회원 없이 처리(주말 반납함 등), 대출은 한 명씩 처리 후 회원을 자동으로 비움.

// 캐시(keep-alive): 스캔해 둔 목록을 둔 채 회원 화면 등을 보고 돌아와도 목록·소급일·메모가 남게
defineOptions({ name: 'CirculationPage' })

const route = useRoute()
const scanInput = ref(null)
const memberInput = ref(null)

const code = ref('')
const queue = ref([])            // { type: 'return' | 'loan', book, loan? }
const busy = ref(false)

const member = ref(null)
const memberLoans = shallowRef([])
const memberKw = ref('')
const memberResults = shallowRef([])
const showMemberLoans = ref(false)
const dueDate = ref(addDays(14))
// 이번 처리 전체에 남길 메모(선택). 예: "곤충 도감 반납 불필요", "가족이 대신 반납". 처리하면 비운다
const memo = ref('')

// 반납 처리일: 주말 반납함 도서는 월요일에 처리해도 실제 넣은 날로 소급해야 부당한 연체가 안 생김
const { today, saturday: lastSaturday } = useToday()
const returnDate = ref(today.value)
// 켜 둔 채 날짜가 넘어가면 "오늘"로 두었던 처리일도 새 오늘로(직접 고른 소급일은 그대로)
watch(today, (now, before) => { if (returnDate.value === before) returnDate.value = now })
const lateOf = (q) => overdueDays(dueOf(q.loan), returnDate.value)

const returns = computed(() => queue.value.filter((q) => q.type === 'return'))
const lends = computed(() => queue.value.filter((q) => q.type === 'loan'))
const returningIds = computed(() => new Set(returns.value.map((q) => q.loan.id)))

// 반납에는 회원이 필요 없음. 반납 도서의 대출자는 '대출할 회원' 후보로만 제안(자동 선택 X)
// → 가족이 대신 반납하고 본인 카드로 빌리는 경우 엉뚱한 회원에게 대출되는 것 방지
const borrowers = computed(() => {
  const map = new Map()
  for (const q of returns.value) {
    const m = q.loan.member
    if (m && !map.has(m.id)) map.set(m.id, { ...m, count: 0 })
    if (m) map.get(m.id).count++
  }
  return [...map.values()]
})
async function pickBorrower(id) {
  try { await selectMember(await members.get(id)) } catch (e) { toast.error(e) }
}

// 처리 후 회원이 보유하게 될 권수 (이번에 반납하는 본인 책은 제외)
const afterCount = computed(() => {
  if (!member.value) return 0
  const kept = memberLoans.value.filter((l) => !returningIds.value.has(l.id)).length
  return kept + lends.value.length
})
const overLimit = computed(() => member.value && afterCount.value > member.value.loan_limit)
const blocked = computed(() => member.value && member.value.status !== 'active' ? `${MEMBER_STATUS[member.value.status]?.label} 상태인 회원입니다.` : '')
const keptOverdue = computed(() => memberLoans.value.filter((l) => l.overdue && !returningIds.value.has(l.id)))

const problem = computed(() => {
  if (!lends.value.length) return ''
  if (!member.value) return '대출할 회원을 선택해주세요.'
  if (blocked.value) return blocked.value
  if (overLimit.value) return `대출 한도 초과 (${afterCount.value} / ${member.value.loan_limit}권)`
  return ''
})
// 회원의 대출 목록을 받는 중에는 처리 금지(한도·연체 확인이 빈 목록 기준으로 통과되는 것 방지)
const memberLoading = ref(false)
const canProcess = computed(() => queue.value.length > 0 && !problem.value && !busy.value && !memberLoading.value)
// 대출 쪽 문제로 막혀도 반납은 먼저 처리할 수 있게
const canReturnOnly = computed(() => !!problem.value && returns.value.length > 0 && !busy.value)

const focusScan = () => nextTick(() => scanInput.value?.focus())

/* ───── 스캔 ───── */
async function scan() {
  const c = code.value.trim()
  code.value = ''
  if (!c) return
  if (queue.value.some((q) => q.book.reg_no === normalizeRegNo(c))) return toast('이미 목록에 있는 도서입니다.', 'error')
  try {
    const { book, loan } = await loans.lookup(c)
    // 조회를 기다리는 사이 같은 책이 한 번 더 스캔됐을 수 있음(스캐너 이중 입력)
    if (queue.value.some((q) => q.book.id === book.id)) return toast('이미 목록에 있는 도서입니다.', 'error')
    if (loan) {
      queue.value.push({ type: 'return', book, loan })
    } else if (isRegistering(book)) {
      // 등록은 했지만 청구기호 라벨을 아직 출력하지 않은 책: 대출 불가(DB loans_process도 거부)
      toast(`"${book.title}" — 등록중(청구기호 라벨 미출력)이라 대출할 수 없습니다. 라벨 출력 후 대출해주세요.`, 'error')
    } else if (book.status === 'available') {
      queue.value.push({ type: 'loan', book })
    } else {
      toast(`"${book.title}" — ${bookStatusText(book)} 상태라 대출할 수 없습니다.`, 'error')
    }
  } catch (e) {
    toast.error(e)
  } finally {
    focusScan()
  }
}

function removeItem(item) {
  queue.value.splice(queue.value.indexOf(item), 1)
  focusScan()
}

function clearQueue() {
  queue.value = []
  resetMember()
  focusScan()
}

// 대출 책이 목록에서 모두 빠지면 회원도 비운다.
// (숨어 있던 회원이 다음 사람 책을 스캔할 때 다시 나타나 엉뚱한 사람에게 대출되는 것 방지)
watch(() => lends.value.length, (n, before) => { if (n === 0 && before > 0) resetMember() })

/* ───── 회원 ───── */
async function searchMember() {
  const kw = memberKw.value.trim()
  if (!kw) return
  try {
    const rows = await members.search(kw)
    if (rows.length === 1) return selectMember(rows[0])
    memberResults.value = rows
    if (!rows.length) toast('검색된 회원이 없습니다.', 'error')
  } catch (e) { toast.error(e) }
}

let memberSeq = 0
async function loadMemberLoans(id) {
  const seq = ++memberSeq
  memberLoading.value = true
  try {
    const rows = await loans.activeByMember(id)
    if (seq === memberSeq) memberLoans.value = rows   // 그 사이 다른 회원을 골랐으면 버림
  } finally {
    if (seq === memberSeq) memberLoading.value = false
  }
}

async function selectMember(m) {
  member.value = m
  memberLoans.value = []
  memberResults.value = []
  memberKw.value = ''
  showMemberLoans.value = false
  dueDate.value = addDays(m.loan_days)
  try {
    await loadMemberLoans(m.id)
  } catch (e) {
    // 대출 목록을 모르면 한도·연체를 확인할 수 없으므로 선택을 취소
    if (member.value === m) resetMember()
    toast.error(e)
  }
  focusScan()
}

function resetMember() {
  memberSeq++
  memberLoading.value = false
  member.value = null
  memberLoans.value = []
  memberResults.value = []
}

function changeMember() {
  resetMember()
  nextTick(() => memberInput.value?.focus())
}

// 연장: 날짜 확인 창(기본 오늘 + 대출기간, 변경 가능)
const extendTarget = ref(null)
function closeExtend() {
  extendTarget.value = null
  focusScan()
}
async function onExtended() {
  closeExtend()
  if (!member.value) return
  try { await loadMemberLoans(member.value.id) } catch (e) { toast.error(e) }
}

/* ───── 처리 ───── */
// mode: 'all'(반납+대출) | 'returns'(반납만)
async function processQueue(mode = 'all') {
  if (mode === 'all' ? !canProcess.value : !(returns.value.length && !busy.value)) return
  const doLend = mode === 'all' && lends.value.length > 0
  if (doLend && keptOverdue.value.length && !confirm(`연체 중인 도서가 ${keptOverdue.value.length}권 있습니다. 그래도 대출하시겠습니까?`)) return
  busy.value = true
  const who = member.value
  // 이번에 보내는 줄만 기억 → 응답을 기다리는 사이 새로 스캔한 책은 목록에 남긴다
  const sent = new Set([...returns.value, ...(doLend ? lends.value : [])])
  try {
    const r = await loans.process({
      memberId: doLend ? who.id : null,
      returnIds: returns.value.map((q) => q.loan.id),
      bookIds: doLend ? lends.value.map((q) => q.book.id) : [],
      dueAt: dueDate.value,
      returnDate: returnDate.value,
      memo: memo.value,
    })
    const parts = [r.returned && `반납 ${r.returned}권`, r.loaned && `${who.name}님 대출 ${r.loaned}권 (~${dueDate.value})`].filter(Boolean)
    toast(`${parts.join(' · ')} 완료`)
    queue.value = queue.value.filter((q) => !sent.has(q))
    returnDate.value = today.value   // 소급은 한 번만 적용. 다음 처리부터는 다시 오늘
    memo.value = ''
    if (doLend) resetMember()  // 대출은 한 명씩 → 다음 사람 대출이 이전 회원에게 붙는 사고 방지
    else if (member.value) await loadMemberLoans(member.value.id)
  } catch (e) {
    toast.error(e)
  } finally {
    busy.value = false
    focusScan()
  }
}

// Ctrl+Enter: 어디서든 처리하기
function onKey(e) {
  if (extendTarget.value) return
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); processQueue('all') }
}
// keep-alive라서 다른 화면에 있는 동안에는 단축키를 떼어 둔다(onActivated는 처음 열 때도 실행됨)
onActivated(async () => {
  window.addEventListener('keydown', onKey)
  // 회원 화면의 [대출하기]로 들어온 경우(?member=) 그 회원을 선택
  const id = route.query.member
  if (id && String(member.value?.id) !== String(id)) {
    try { await selectMember(await members.get(id)) } catch (e) { toast.error(e) }
  }
  focusScan()
})
onDeactivated(() => window.removeEventListener('keydown', onKey))

const summary = computed(() => [returns.value.length && `반납 ${returns.value.length}`, lends.value.length && `대출 ${lends.value.length}`].filter(Boolean).join(' · '))
</script>

<template>
  <div class="circ">
    <div class="main stack">
      <section class="card scan-bar">
        <form @submit.prevent="scan">
          <label class="sr-only" for="scan">등록번호</label>
          <input id="scan" ref="scanInput" v-model="code" class="input xl num" placeholder="도서 바코드(등록번호)를 스캔하세요" autocomplete="off" />
        </form>
        <p class="muted hint">대출 중인 도서는 <b class="t-return">반납</b>, 대출 가능한 도서는 <b class="t-loan">대출</b>로 자동 분류됩니다 · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 처리하기</p>
      </section>

      <section v-if="queue.length" class="card work">
        <div class="card-head">
          <h3>처리 목록 <span class="muted num">{{ summary }}</span></h3>
          <button class="btn ghost sm" @click="clearQueue">비우기</button>
        </div>

        <!-- 목록: 길어지면 내부 스크롤 → 아래 회원/처리 영역이 화면 밖으로 밀리지 않게 -->
        <div class="queue-scroll">
          <div v-if="returns.length" class="group-wrap">
            <h4 class="group t-return">반납 {{ returns.length }}</h4>
            <ul class="list">
              <li v-for="q in returns" :key="q.book.id" class="return">
                <KdcTag :class-no="q.book.class_no" />
                <div class="grow">
                  <div class="t">{{ q.book.title }}</div>
                  <div class="muted num small">{{ q.book.reg_no }} · {{ q.loan.member?.name }} · 반납예정 {{ fmtDate(dueOf(q.loan)) }}</div>
                  <!-- 대출할 때 남긴 메모를 반납할 때 확인(예: "표지 찢어진 채 대출", "부록 반납 불필요") -->
                  <div v-if="q.loan.loan_memo" class="loan-memo small">대출 메모: {{ q.loan.loan_memo }}</div>
                </div>
                <span v-if="lateOf(q)" class="badge red">연체 {{ lateOf(q) }}일</span>
                <button class="btn ghost sm" aria-label="목록에서 제거" @click="removeItem(q)">✕</button>
              </li>
            </ul>
          </div>
          <div v-if="lends.length" class="group-wrap">
            <h4 class="group t-loan">대출 {{ lends.length }}<span v-if="member" class="muted"> → {{ member.name }}</span></h4>
            <ul class="list">
              <li v-for="q in lends" :key="q.book.id" class="loan">
                <KdcTag :class-no="q.book.class_no" />
                <div class="grow">
                  <div class="t">{{ q.book.title }}</div>
                  <div class="muted num small">{{ q.book.reg_no }} · {{ q.book.author }}</div>
                </div>
                <button class="btn ghost sm" aria-label="목록에서 제거" @click="removeItem(q)">✕</button>
              </li>
            </ul>
          </div>
        </div>

        <div class="panel">
          <!-- 반납이 있을 때만: 반납 처리일 -->
          <!-- 목록 높이 확보를 위해 제목·입력·안내를 한 줄에 -->
          <div v-if="returns.length" class="block line ret-date" :class="{ backdated: returnDate !== today }">
            <span class="block-title">반납 처리일</span>
            <input v-model="returnDate" type="date" class="input date" :max="today" aria-label="반납 처리일" />
            <button class="btn sm" :class="{ on: returnDate === today }" @click="returnDate = today">오늘</button>
            <button class="btn sm" :class="{ on: returnDate === lastSaturday }" @click="returnDate = lastSaturday">지난 토요일 (반납함)</button>
            <small v-if="returnDate !== today" class="note" title="연체일도 이 날짜 기준으로 계산됩니다">소급 처리 · 연체일도 이 날짜 기준</small>
          </div>

          <!-- 대출이 있을 때만: 대출할 회원 -->
          <div v-if="lends.length" class="block member-block">
            <template v-if="!member">
              <form class="line" @submit.prevent="searchMember">
                <span class="block-title">대출할 회원</span>
                <input ref="memberInput" v-model="memberKw" class="input" placeholder="이름 · 전화번호 · 회원번호 입력 후 Enter" />
              </form>
              <div v-if="borrowers.length" class="suggest">
                <span class="muted small">반납한 분이 빌리시나요?</span>
                <!-- 이름만 배지로. 2권 이상 반납했을 때만 알림 숫자 표시(파랑 = 반납 색). 동명이인은 마우스 오버로 전화번호 확인 -->
                <button
                  v-for="b in borrowers.slice(0, 4)" :key="b.id" class="who"
                  :title="`${b.name} · ${b.phone}${b.count > 1 ? ` · 반납 ${b.count}권` : ''}`"
                  @click="pickBorrower(b.id)"
                >
                  {{ b.name }}
                  <span v-if="b.count > 1" class="count num" :aria-label="`반납 ${b.count}권`">{{ b.count }}</span>
                </button>
                <span v-if="borrowers.length > 4" class="muted small">외 {{ borrowers.length - 4 }}명 — 검색으로 선택</span>
              </div>
              <ul v-if="memberResults.length" class="pick">
                <li v-for="m in memberResults" :key="m.id">
                  <button @click="selectMember(m)">
                    <strong>{{ m.name }}</strong>
                    <span class="muted num">{{ m.phone }} · {{ m.member_no }}</span>
                    <span class="num">{{ m.active_loans }}/{{ m.loan_limit }}</span>
                  </button>
                </li>
              </ul>
            </template>

            <template v-else>
              <div class="line">
                <span class="block-title">대출할 회원</span>
                <div class="member-card">
                  <div>
                    <router-link :to="`/members/${member.id}`" class="name">{{ member.name }}</router-link>
                    <span class="muted num small phone">{{ member.phone }} · {{ member.member_no }}</span>
                  </div>
                  <div class="quota num" :class="{ warn: overLimit }">
                    처리 후 <strong>{{ afterCount }}</strong> / {{ member.loan_limit }}권
                  </div>
                </div>
                <button class="btn ghost sm" @click="changeMember">변경</button>
              </div>
              <p v-if="blocked" class="alert red">{{ blocked }}</p>
              <p v-else-if="keptOverdue.length" class="alert amber">반납하지 않은 연체 도서가 {{ keptOverdue.length }}권 있습니다.</p>

              <!-- 반납 예정일 + 현재 대출 중(접기) 한 줄 -->
              <div class="line">
                <label class="line">
                  <span class="block-title">반납 예정일</span>
                  <input v-model="dueDate" type="date" class="input date" :min="today" />
                </label>
                <button v-if="memberLoans.length" class="toggle" @click="showMemberLoans = !showMemberLoans">
                  {{ showMemberLoans ? '▾' : '▸' }} 현재 대출 중 {{ memberLoans.length }}권<span v-if="keptOverdue.length" class="t-red"> · 연체 {{ keptOverdue.length }}</span>
                </button>
              </div>
              <div v-if="memberLoans.length && showMemberLoans">
                <ul class="list compact">
                  <li v-for="l in memberLoans" :key="l.id" :class="{ done: returningIds.has(l.id) }">
                    <div class="grow">
                      <div class="t">{{ l.book.title }}</div>
                      <div class="muted num small">{{ l.book.reg_no }} · 반납예정 {{ fmtDate(dueOf(l)) }}</div>
                    </div>
                    <span v-if="returningIds.has(l.id)" class="badge blue">반납 예정</span>
                    <template v-else>
                      <span v-if="l.overdue" class="badge red">연체 {{ overdueDays(dueOf(l)) }}일</span>
                      <button class="btn sm" @click="extendTarget = l">연장</button>
                    </template>
                  </li>
                </ul>
              </div>
            </template>
          </div>

          <!-- 이번 처리 전체에 메모 하나(대출한 책 = 대출 메모, 반납한 책 = 반납 메모로 저장) -->
          <div class="block line">
            <span class="block-title">메모</span>
            <input v-model="memo" class="input" maxlength="200" placeholder="선택 · 이번 처리 전체에 남김 (예: 곤충 도감 반납 불필요)" />
          </div>

          <p v-if="problem" class="alert red">{{ problem }}</p>

          <div class="actions">
            <button v-if="canReturnOnly" class="btn lg secondary" @click="processQueue('returns')">반납만 처리 ({{ returns.length }}권)</button>
            <button class="btn primary lg grow" :disabled="!canProcess" @click="processQueue('all')">처리하기 ({{ summary }})</button>
          </div>
        </div>
      </section>

      <div v-else class="card idle">도서를 스캔하면 반납/대출이 자동으로 구분되어 여기에 쌓입니다.</div>
    </div>
    <LoanActionDialog :loan="extendTarget" mode="extend" @close="closeExtend" @done="onExtended" />
  </div>
</template>

<style scoped>
.circ { max-width: 980px; }
.scan-bar { padding: 18px; display: grid; gap: 8px; }
.input.xl { height: 56px; font-size: 20px; padding: 0 18px; }
.hint { margin: 0; font-size: 13px; }
kbd { font: inherit; font-size: 11.5px; padding: 1px 5px; border: 1px solid var(--line-strong); border-radius: 4px; background: var(--surface-2); }
.t-return { color: var(--blue); }
.t-loan { color: var(--brand-ink); }
.t-red { color: var(--red); }
.idle { padding: 48px 16px; text-align: center; color: var(--text-3); border-style: dashed; }

.queue-scroll { max-height: min(40vh, 480px); overflow-y: auto; padding: 14px 18px; display: grid; gap: 14px; }
.group { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: var(--text-3); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.list li { display: flex; align-items: center; gap: 10px; padding: 9px 10px 9px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
.list li.return { border-left: 3px solid var(--blue); }
.list li.loan { border-left: 3px solid var(--brand); }
.list li.done { opacity: .55; }
.list li.done .t { text-decoration: line-through; }
.list.compact { margin-top: 6px; }
.list .grow { flex: 1; min-width: 0; }
.list .t { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.small { font-size: 12.5px; }

/* 처리 영역은 화면 하단에 붙어 있어서 목록이 길어도 처리 버튼이 항상 보임 */
.panel { position: sticky; bottom: 0; z-index: 2; border-top: 1px solid var(--line); padding: 14px 18px 18px; display: grid; gap: 12px; background: var(--surface-2); border-radius: 0 0 var(--radius) var(--radius); box-shadow: 0 -6px 16px -10px rgb(0 0 0 / .18); }
.block { display: grid; gap: 8px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 8px; background: var(--surface); }
/* 한 줄 배치: 제목(고정폭) + 입력. 제목 폭을 맞춰 세로로 정렬되게 */
.line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.line > .block-title { flex: 0 0 78px; }
.line > .input:not(.date), .line > .member-card { flex: 1; min-width: 200px; }
.block-title { font-size: 13px; font-weight: 700; color: var(--text-2); }

.input.date { width: 160px; height: 34px; }
.ret-date.backdated { background: var(--amber-soft); border-color: color-mix(in srgb, var(--amber) 40%, transparent); }
.ret-date .note { color: var(--amber); font-size: 12.5px; }
.member-block { border-left: 3px solid var(--brand); }
.loan-memo { margin-top: 2px; color: var(--amber); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.member-card { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 6px 12px; border-radius: 8px; background: var(--brand-soft); flex-wrap: wrap; }
.member-card .name { font-size: 17px; font-weight: 700; color: var(--text); text-decoration: none; }
.member-card .phone { margin-left: 8px; }
.quota { font-size: 13.5px; }
.quota strong { font-size: 18px; }
.quota.warn { color: var(--red); }
.toggle { margin-left: auto; border: 0; background: none; padding: 2px 0; cursor: pointer; font-size: 13px; color: var(--text-2); }

.suggest { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 8px; padding: 4px 0 0 86px; }
.who {
  position: relative; height: 28px; padding: 0 12px; border-radius: 14px; cursor: pointer;
  border: 1px solid var(--line-strong); background: var(--surface); font-size: 13.5px; font-weight: 600;
}
.who:hover { border-color: var(--brand); background: var(--brand-soft); color: var(--brand-ink); }
/* 문자 알림처럼 오른쪽 위에 붙는 숫자 */
.who .count {
  position: absolute; top: -7px; right: -6px; min-width: 18px; height: 18px; padding: 0 5px;
  border-radius: 9px; background: var(--blue); color: #fff; font-size: 11px; font-weight: 700; line-height: 18px;
  box-shadow: 0 0 0 2px var(--surface);
}
.pick { list-style: none; margin: 0; padding: 0; border: 1px solid var(--line); border-radius: 8px; max-height: 240px; overflow: auto; }
.pick li + li { border-top: 1px solid var(--line); }
.pick button { width: 100%; display: flex; gap: 10px; align-items: center; padding: 9px 12px; border: 0; background: none; cursor: pointer; text-align: left; }
.pick button:hover { background: var(--hover); }
.pick button .muted { flex: 1; font-size: 13px; }
.alert { margin: 0; padding: 10px 12px; border-radius: 8px; font-size: 13.5px; }
.alert.red { background: var(--red-soft); color: var(--red); }
.alert.amber { background: var(--amber-soft); color: var(--amber); }
.actions { display: flex; gap: 8px; }
.actions .grow { flex: 1; }
@media (max-width: 640px) { .suggest { padding-left: 0; } }
</style>
