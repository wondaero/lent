<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue'
import { useRouter } from 'vue-router'
import { books, loans } from '@/api'
import { BOOK_STATUS, HOLD_REASONS, REGISTERING } from '@/lib/constants'
import { callNumberLines, dueOf, fmtDate, fmtDateTime, overdueDays } from '@/lib/format'
import { makeAuthorMark } from '@/lib/callNumber'
import { useLeaveGuard } from '@/lib/useLeaveGuard'
import { fmtRegNo, normalizeRegNo, parseRegNo } from '@/lib/regNo'
import KdcTag from '@/components/KdcTag.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { toast } from '@/stores/toast'

const props = defineProps({ id: String })
const router = useRouter()
const isEdit = computed(() => !!props.id)

const empty = () => ({
  reg_no: '', isbn: '', title: '', series_title: '', author: '', publisher: '', pub_year: '',
  class_no: '', author_mark: '', volume: '', copy_no: '', status: 'available', hold_reason: '', memo: '',
})
const form = reactive(empty())
const meta = ref(null)
// 저장하지 않고 다른 메뉴로 가면 확인(입력한 서지가 말없이 사라지지 않게)
const guard = useLeaveGuard(() => form)

// 대출 이력(책 입장): 이 책을 누가 언제 빌렸는지. 회원 화면의 대출 이력과 같은 모양
const history = shallowRef([])
const historyLoading = ref(false)
const borrowerCount = computed(() => new Set(history.value.map((l) => l.member_id)).size)
async function loadHistory() {
  historyLoading.value = true
  try { history.value = await loans.byBook(props.id) }
  catch (e) { toast.error(e) }
  finally { historyLoading.value = false }
}
function loanState(l) {
  if (!l.returned_at) return l.overdue ? { label: `연체 ${overdueDays(dueOf(l))}일`, tone: 'red' } : { label: '대출중', tone: 'blue' }
  const late = overdueDays(dueOf(l), l.returned_at)
  return late ? { label: `반납(연체 ${late}일)`, tone: 'amber' } : { label: '반납', tone: 'gray' }
}
const errors = ref({})
const busy = ref(false)
const lookingUp = ref(false)

// 등록번호: 미리 출력해 책에 붙인 바코드를 스캔해서 넣는다(자동 번호는 책의 라벨과 어긋날 수 있어 쓰지 않음)
const regInput = ref(null)
const barcode = ref(null)   // { lastIssued } — 아직 출력하지 않은 번호로 등록하려 할 때 확인용
const regNoBad = computed(() => !!form.reg_no.trim() && parseRegNo(form.reg_no) == null)
// 스캐너는 번호 뒤에 Enter를 보낸다 → 저장하지 않고 ISBN 칸으로
function onRegEnter() {
  form.reg_no = normalizeRegNo(form.reg_no)
  if (parseRegNo(form.reg_no) == null) return toast('등록번호 형식이 올바르지 않습니다. (예: EM00005724)', 'error')
  document.getElementById('isbn')?.focus()
}
function confirmUnissued() {
  const n = parseRegNo(form.reg_no)
  if (isEdit.value || !barcode.value || n <= barcode.value.lastIssued) return true
  return confirm(`${form.reg_no}은(는) 아직 바코드 라벨로 출력하지 않은 번호입니다.\n책에 붙은 바코드 번호가 맞나요?`)
}
async function newEntry() {
  barcode.value = await books.barcodeState()
  nextTick(() => regInput.value?.focus())
}

onMounted(async () => {
  try {
    if (isEdit.value) {
      const b = await books.get(props.id)
      Object.keys(form).forEach((k) => (form[k] = b[k] ?? ''))
      guard.snapshot()
      meta.value = { created_at: b.created_at, spine_label_printed: b.spine_label_printed, loan: b.loan ?? null }
      loadHistory()
    } else {
      await newEntry()
    }
  } catch (e) {
    toast.error(e)
    router.replace('/books')
  }
})

// ISBN 조회: 1건이면 바로 채우고, 여러 건이면 선택 창
const candidates = ref([])
const hasSource = computed(() => candidates.value.some((c) => c.source))

// 개발용: 여러 건이 나오는 상황을 바로 볼 수 있는 예시 ISBN (api/devCatalog.js, 가상의 책)
const isDev = import.meta.env.DEV
const SAMPLE_ISBNS = [
  { label: '세트 5권', isbn: '9791100000010' },
  { label: '분류가 다른 기록 2건', isbn: '9791100000027' },
  { label: '개정판 2건', isbn: '9791100000034' },
  { label: '1건', isbn: '9791100000041' },
]
function tryIsbn(isbn) {
  form.isbn = isbn
  lookup()
}

// ISBN-10과 ISBN-13을 같은 책으로 보고 비교 (978 + 앞 9자리 + 새 체크숫자)
const searchedIsbn = ref('')
function toIsbn13(v) {
  const d = String(v || '').replace(/[^0-9Xx]/g, '')
  if (d.length !== 10) return d
  const core = '978' + d.slice(0, 9)
  const sum = [...core].reduce((s, c, i) => s + +c * (i % 2 ? 3 : 1), 0)
  return core + ((10 - (sum % 10)) % 10)
}
const sameIsbn = (a, b) => !a || !b || toIsbn13(a) === toIsbn13(b)

async function lookup() {
  if (!form.isbn.trim()) return toast('ISBN을 입력해주세요.', 'error')
  lookingUp.value = true
  searchedIsbn.value = form.isbn.trim()
  try {
    const rows = await books.lookupIsbn(form.isbn.trim())
    if (rows.length === 1) applyCandidate(rows[0])
    else candidates.value = rows
  } catch (e) {
    toast.error(e)
  } finally {
    lookingUp.value = false
  }
}

function applyCandidate(r) {
  const { isbn, title, series_title, volume, author, publisher, pub_year, class_no } = r
  Object.assign(form, { isbn, title, series_title, volume, author, publisher, pub_year, class_no })
  candidates.value = []
  form.author_mark = ''
  genMark()   // 고른 책 기준으로 저자기호 다시 생성
  toast('서지 정보를 불러왔습니다.')
}

function onKeydown(e) {
  if (e.key === 'Escape' && candidates.value.length) candidates.value = []
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

// 저자기호: 리재철 제5표(총서명 우선, 없으면 저자). 한글이 아닌 이름은 한글 두 글자를 받아 생성
const koreanFor = ref('')     // 한글 입력이 필요한 기준 이름(예: Rowling,J.K.). 비어 있으면 입력칸 숨김
const korean = ref('')
const koreanInput = ref(null)

function genMark() {
  const r = makeAuthorMark({ title: form.title, seriesTitle: form.series_title, author: form.author, korean: korean.value })
  if (r.error) return toast(r.error, 'error')
  if (r.needKorean) {
    // 자동으로 못 만들면(영문 이름, 저자 칸 형식 문제 등) 빨간 테두리 + 안내 문구로 직접 입력칸을 연다(사용자 결정).
    // 사라지는 알림 대신 고칠 때까지 보이게. 깨진 기호를 저장하지 않는다
    koreanFor.value = r.base
    nextTick(() => koreanInput.value?.focus())
    return
  }
  form.author_mark = r.mark
  koreanFor.value = ''
  korean.value = ''
}

function validate() {
  const e = {}
  if (parseRegNo(form.reg_no) == null) e.reg_no = true
  if (!form.title.trim()) e.title = true
  if (!form.author.trim()) e.author = true
  if (!form.class_no.trim()) e.class_no = true
  if (form.pub_year && !/^\d{4}$/.test(form.pub_year)) e.pub_year = true
  if (form.status === 'hold' && !form.hold_reason.trim()) e.hold_reason = true
  errors.value = e
  return !Object.keys(e).length
}

async function save() {
  if (!validate()) return toast('필수 항목을 확인해주세요.', 'error')
  if (!confirmUnissued()) return
  busy.value = true
  try {
    const data = { ...form, reg_no: normalizeRegNo(form.reg_no), title: form.title.trim() }
    if (isEdit.value) {
      await books.update(props.id, data)
      guard.snapshot()
      toast('저장했습니다.')
    } else {
      const row = await books.create(data)
      guard.skip()
      toast('도서를 등록했습니다.')
      router.replace(`/books/${row.id}`)
    }
  } catch (e) {
    toast.error(e)
  } finally {
    busy.value = false
  }
}

async function saveAndNew() {
  if (!validate()) return toast('필수 항목을 확인해주세요.', 'error')
  if (!confirmUnissued()) return
  busy.value = true
  try {
    await books.create({ ...form, reg_no: normalizeRegNo(form.reg_no) })
    toast(`"${form.title}" 등록 완료`)
    // 같은 책 복본/다음 권 연속 등록을 위해 서지는 유지. 등록번호는 다음 책의 바코드를 스캔
    const keep = { series_title: form.series_title, author: form.author, publisher: form.publisher, pub_year: form.pub_year, class_no: form.class_no, author_mark: form.author_mark }
    Object.assign(form, empty(), keep)
    guard.snapshot()   // 남겨 둔 서지만 있는 상태는 "작성 중"으로 보지 않음
    await newEntry()
  } catch (e) {
    toast.error(e)
  } finally {
    busy.value = false
  }
}

// 삭제: 대출 중인 책은 확인 창을 띄우지 않고 바로 알린다(최종 검사는 서버에서 한 번 더)
const delOpen = ref(false)
const deleting = ref(false)
function askRemove() {
  if (meta.value?.loan) return toast('대출 중인 도서는 삭제할 수 없습니다. 먼저 반납 처리해주세요.', 'error')
  delOpen.value = true
}
async function remove() {
  deleting.value = true
  try {
    await books.remove(props.id)
    delOpen.value = false
    guard.skip()
    toast('삭제했습니다.')
    router.replace('/books')
  } catch (e) {
    delOpen.value = false
    toast.error(e)
  } finally {
    deleting.value = false
  }
}

const preview = computed(() => callNumberLines(form))
</script>

<template>
  <div class="stack">
  <form class="layout" @submit.prevent="save">
    <div class="stack">
      <section class="card">
        <div class="card-head"><h3>서지 정보</h3></div>
        <div class="card-body form-grid">
          <label class="field span-2" :class="{ invalid: errors.reg_no || regNoBad }">
            <span>등록번호<b class="req">*</b></span>
            <input ref="regInput" v-model="form.reg_no" class="input num" :placeholder="isEdit ? '' : '책에 붙인 바코드를 스캔하세요'" @keydown.enter.prevent="onRegEnter" />
            <small v-if="regNoBad">형식: EM + 숫자 8자리 (예: EM00005724)</small>
            <small v-else-if="!isEdit && barcode">바코드 라벨은 {{ fmtRegNo(barcode.lastIssued) }}까지 출력되어 있습니다</small>
          </label>
          <div class="field span-2">
            <label for="isbn">ISBN</label>
            <div class="inline">
              <input id="isbn" v-model="form.isbn" class="input" inputmode="numeric" placeholder="978…" @keydown.enter.prevent="lookup" />
              <button type="button" class="btn secondary" :disabled="lookingUp" @click="lookup">{{ lookingUp ? '조회 중…' : '서지 조회' }}</button>
            </div>
            <div v-if="isDev && !isEdit" class="samples">
              <span class="muted">예시 (개발용)</span>
              <button v-for="s in SAMPLE_ISBNS" :key="s.isbn" type="button" class="btn sm" :title="s.isbn" @click="tryIsbn(s.isbn)">{{ s.label }}</button>
            </div>
          </div>
          <label class="field span-2" :class="{ invalid: errors.title }">
            <span>서명<b class="req">*</b></span>
            <input v-model="form.title" class="input" />
          </label>
          <label class="field span-2">
            <span>총서명</span>
            <input v-model="form.series_title" class="input" placeholder="시리즈명 (있을 때만)" />
          </label>
          <label class="field" :class="{ invalid: errors.author }">
            <span>저자<b class="req">*</b></span>
            <input v-model="form.author" class="input" />
          </label>
          <label class="field">
            <span>출판사</span>
            <input v-model="form.publisher" class="input" />
          </label>
          <label class="field" :class="{ invalid: errors.pub_year }">
            <span>출판년도</span>
            <input v-model="form.pub_year" class="input" inputmode="numeric" maxlength="4" placeholder="YYYY" />
          </label>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>청구기호 · 소장 정보</h3></div>
        <div class="card-body form-grid">
          <label class="field" :class="{ invalid: errors.class_no }">
            <span>분류기호(KDC)<b class="req">*</b></span>
            <input v-model="form.class_no" class="input" placeholder="813.6" />
          </label>
          <div class="field">
            <label for="author-mark">저자기호</label>
            <div class="inline">
              <input id="author-mark" v-model="form.author_mark" class="input" placeholder="마15ㄷ" />
              <button type="button" class="btn" title="리재철 제5표로 생성 (총서명 우선, 없으면 저자)" @click="genMark">생성</button>
            </div>
            <div v-if="koreanFor" class="inline korean">
              <input ref="koreanInput" v-model="korean" class="input" maxlength="10" placeholder="한글 두 글자 (예: 롤링)" @keydown.enter.prevent="genMark" />
              <button type="button" class="btn" @click="genMark">적용</button>
            </div>
            <small v-if="koreanFor" class="mark-tip">자동으로 만들지 못했습니다. "{{ koreanFor }}"의 앞 두 글자를 한글로 입력하세요. (예: Rowling → 롤링)</small>
            <small v-else>리재철 제5표 · 총서명이 있으면 총서명 기준</small>
          </div>
          <label class="field">
            <span>권차</span>
            <input v-model="form.volume" class="input" placeholder="예: 2" />
          </label>
          <label class="field">
            <span>복본</span>
            <input v-model="form.copy_no" class="input" placeholder="예: 2" />
          </label>
          <label class="field">
            <span>상태</span>
            <select v-model="form.status" class="select" :disabled="form.status === 'loaned'">
              <option v-for="(s, k) in BOOK_STATUS" :key="k" :value="k" :disabled="k === 'loaned'">{{ s.label }}</option>
            </select>
            <!-- 등록중: 대출가능으로 저장돼도 청구기호 라벨을 출력하기 전에는 빌려줄 수 없다(사용자 결정) -->
            <small v-if="form.status === 'available' && (!meta || !meta.spine_label_printed)" class="reg-tip">
              <span class="badge amber">{{ REGISTERING.label }}</span> 청구기호 라벨을 출력하면 대출가능이 됩니다.
            </small>
          </label>
          <label v-if="form.status === 'hold'" class="field" :class="{ invalid: errors.hold_reason }">
            <span>보류 사유<b class="req">*</b></span>
            <input v-model="form.hold_reason" class="input" list="hold-reasons" placeholder="예: 파손" maxlength="40" />
            <datalist id="hold-reasons"><option v-for="r in HOLD_REASONS" :key="r" :value="r" /></datalist>
          </label>
          <label class="field span-all">
            <span>메모</span>
            <textarea v-model="form.memo" class="textarea" />
          </label>
        </div>
      </section>
    </div>

    <aside class="side stack">
      <section class="card">
        <div class="card-head"><h3>라벨 미리보기</h3></div>
        <div class="card-body">
          <div class="spine num">
            <div v-for="(line, i) in preview" :key="i">{{ line }}</div>
            <div v-if="!preview.length" class="muted">분류기호 입력</div>
          </div>
          <dl v-if="meta" class="meta">
            <dt>등록일</dt><dd class="num">{{ fmtDateTime(meta.created_at) }}</dd>
            <dt>라벨</dt><dd>{{ meta.spine_label_printed ? '출력 완료' : '미출력(등록중 · 대출 불가)' }}</dd>
            <template v-if="meta.loan">
              <dt>대출자</dt><dd><router-link :to="`/members/${meta.loan.member_id}`">{{ meta.loan.member_name }}</router-link></dd>
              <dt>반납 예정</dt><dd class="num">{{ fmtDate(meta.loan.due_at) }}</dd>
            </template>
          </dl>
        </div>
      </section>
      <div class="actions">
        <button class="btn primary lg" type="submit" :disabled="busy">{{ isEdit ? '저장' : '등록' }}</button>
        <button v-if="!isEdit" class="btn lg secondary" type="button" :disabled="busy" @click="saveAndNew">등록 후 계속</button>
        <button v-if="isEdit" class="btn danger lg" type="button" @click="askRemove">삭제</button>
        <router-link to="/books" class="btn ghost lg">목록</router-link>
      </div>
    </aside>

    <!-- ISBN 조회 결과가 여러 건일 때 선택 창 -->
    <Teleport to="body">
      <div v-if="candidates.length" class="modal-scrim" @click.self="candidates = []">
        <div class="modal card" role="dialog" aria-modal="true" aria-labelledby="cand-title">
          <div class="card-head">
            <h3 id="cand-title">
              검색 결과 {{ candidates.length }}건<span v-if="candidates.total > candidates.length" class="muted small"> (전체 {{ candidates.total }}건 중)</span>
              <span class="muted small hint">— 등록할 책을 선택하세요</span>
            </h3>
            <button type="button" class="btn ghost sm" aria-label="닫기" @click="candidates = []">✕</button>
          </div>
          <div class="tbl-wrap modal-body">
            <table class="tbl">
              <thead><tr><th>서명</th><th>권차</th><th>저자</th><th>출판사</th><th>연도</th><th>분류기호</th><th v-if="hasSource">출처</th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in candidates" :key="i" class="clickable" tabindex="0" @click="applyCandidate(c)" @keydown.enter="applyCandidate(c)">
                  <td class="title-cell">
                    {{ c.title }}<span v-if="c.series_title" class="sub">{{ c.series_title }}</span>
                    <!-- KOLIS-NET은 엉뚱한 기록이 섞여 올 때가 있음 → 조회한 ISBN과 다르면 빨간색 -->
                    <span class="sub num" :class="{ mismatch: !sameIsbn(c.isbn, searchedIsbn) }">ISBN {{ c.isbn }}<template v-if="!sameIsbn(c.isbn, searchedIsbn)"> · 조회한 ISBN과 다름</template></span>
                  </td>
                  <td class="num nowrap">{{ c.volume ? `v.${c.volume}` : '-' }}</td>
                  <td class="nowrap">{{ c.author }}</td>
                  <td class="nowrap">{{ c.publisher }}</td>
                  <td class="num nowrap">{{ c.pub_year }}</td>
                  <td><KdcTag :class-no="c.class_no" /></td>
                  <td v-if="hasSource" class="nowrap muted">{{ c.source }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Teleport>
  </form>

  <section v-if="isEdit" class="card">
    <div class="card-head">
      <h3>대출 이력 <span class="muted num">총 {{ history.length }}회 · {{ borrowerCount }}명</span></h3>
    </div>
    <div v-if="historyLoading" class="loading-bar" />
    <div class="tbl-wrap">
      <table class="tbl">
        <thead><tr><th>회원</th><th class="fit">대출일</th><th class="fit">반납예정일</th><th class="fit">반납일</th><th class="fit">상태</th></tr></thead>
        <tbody>
          <tr v-for="l in history" :key="l.id">
            <td class="title-cell">
              <router-link v-if="l.member && !l.member.deleted" :to="`/members/${l.member.id}`" class="cell-link">{{ l.member.name }}</router-link>
              <template v-else>{{ l.member?.name ?? '(삭제된 회원)' }}</template>
              <span class="sub num">{{ l.member?.phone }} · {{ l.member?.member_no }}</span>
              <span v-if="l.loan_memo" class="sub memo">대출 메모: {{ l.loan_memo }}</span>
              <span v-if="l.return_memo" class="sub memo">반납 메모: {{ l.return_memo }}</span>
            </td>
            <td class="nowrap num">{{ fmtDate(l.loaned_at) }}</td>
            <td class="nowrap num">{{ fmtDate(dueOf(l)) }}<span v-if="l.extended_due_at" class="sub">연장</span></td>
            <td class="nowrap num">{{ fmtDate(l.returned_at) || '-' }}</td>
            <td><span class="badge" :class="loanState(l).tone">{{ loanState(l).label }}</span></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!historyLoading && !history.length" class="empty">아직 대출된 적이 없습니다.</div>
    </div>
  </section>

  <ConfirmDialog :open="delOpen" title="도서 삭제" :busy="deleting" @confirm="remove" @cancel="delOpen = false">
    <dl class="cd-meta">
      <dt>등록번호</dt><dd class="num">{{ form.reg_no }}</dd>
      <dt>서명</dt><dd>{{ form.title }}</dd>
    </dl>
    <p class="cd-note">되돌릴 수 없습니다. 대출 기록에는 등록번호·서명과 "(삭제된 도서)"로 남습니다.</p>
  </ConfirmDialog>
  </div>
</template>

<style scoped>
.memo { color: var(--amber); }
.layout { display: grid; grid-template-columns: 1fr 280px; gap: 18px; align-items: start; }
.side { position: sticky; top: 80px; }
.inline { display: flex; gap: 6px; }
.field > label { font-size: 13px; font-weight: 600; color: var(--text-2); }
.korean .input { border-color: var(--red); }
.field small.mark-tip { color: var(--red); }
.samples { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12.5px; }
.modal-scrim { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / .35); display: grid; place-items: center; padding: 16px; }
.modal { width: min(860px, 100%); max-height: min(80vh, 640px); display: flex; flex-direction: column; box-shadow: var(--shadow); }
.modal-body { overflow: auto; }
.small { font-size: 13px; font-weight: 400; }
.hint { margin-left: 6px; }
.sub.mismatch { color: var(--red); }
.spine { margin: 0 auto; width: 120px; min-height: 120px; border: 1px solid var(--line-strong); border-radius: 6px; padding: 14px 8px; display: grid; align-content: center; justify-items: center; gap: 4px; font-size: 16px; font-weight: 600; background: var(--surface-2); }
.meta { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 18px 0 0; font-size: 13px; }
.meta dt { color: var(--text-3); }
.meta dd { margin: 0; }
.reg-tip { display: flex; align-items: center; gap: 6px; margin-top: 6px; font-size: 12.5px; color: var(--text-3); }
.actions { display: grid; gap: 8px; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .side { position: static; }
}
</style>
