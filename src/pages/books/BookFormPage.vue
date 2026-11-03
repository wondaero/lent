<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { books } from '@/api'
import { BOOK_STATUS } from '@/lib/constants'
import { callNumberLines, fmtDateTime } from '@/lib/format'
import { makeAuthorMark } from '@/lib/callNumber'
import KdcTag from '@/components/KdcTag.vue'
import { toast } from '@/stores/toast'

const props = defineProps({ id: String })
const router = useRouter()
const isEdit = computed(() => !!props.id)

const empty = () => ({
  reg_no: '', isbn: '', title: '', series_title: '', author: '', publisher: '', pub_year: '',
  class_no: '', author_mark: '', volume: '', copy_no: '', status: 'available', memo: '',
})
const form = reactive(empty())
const meta = ref(null)
const errors = ref({})
const busy = ref(false)
const lookingUp = ref(false)

onMounted(async () => {
  try {
    if (isEdit.value) {
      const b = await books.get(props.id)
      Object.keys(form).forEach((k) => (form[k] = b[k] ?? ''))
      meta.value = { created_at: b.created_at, label_printed: b.label_printed }
    } else {
      form.reg_no = await books.nextRegNo()
    }
  } catch (e) {
    toast.error(e)
    router.replace('/books')
  }
})

// ISBN 조회: 1건이면 바로 채우고, 여러 건이면 선택 창
const candidates = ref([])
const hasSource = computed(() => candidates.value.some((c) => c.source))

// 개발용: 여러 건이 나오는 상황을 바로 볼 수 있는 예시 ISBN (mockDb의 CATALOG, 가상의 책)
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

async function lookup() {
  if (!form.isbn.trim()) return toast('ISBN을 입력해주세요.', 'error')
  lookingUp.value = true
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
    koreanFor.value = r.base
    nextTick(() => koreanInput.value?.focus())
    if (korean.value) toast('한글 두 글자를 입력해주세요.', 'error')
    return
  }
  form.author_mark = r.mark
  koreanFor.value = ''
  korean.value = ''
}

function validate() {
  const e = {}
  if (!form.reg_no.trim()) e.reg_no = true
  if (!form.title.trim()) e.title = true
  if (!form.author.trim()) e.author = true
  if (!form.class_no.trim()) e.class_no = true
  if (form.pub_year && !/^\d{4}$/.test(form.pub_year)) e.pub_year = true
  errors.value = e
  return !Object.keys(e).length
}

async function save() {
  if (!validate()) return toast('필수 항목을 확인해주세요.', 'error')
  busy.value = true
  try {
    const data = { ...form, reg_no: form.reg_no.trim(), title: form.title.trim() }
    if (isEdit.value) {
      await books.update(props.id, data)
      toast('저장했습니다.')
    } else {
      const row = await books.create(data)
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
  busy.value = true
  try {
    await books.create({ ...form })
    toast(`"${form.title}" 등록 완료`)
    // 같은 책 복본/다음 권 연속 등록을 위해 서지는 유지하고 번호만 갱신
    const keep = { series_title: form.series_title, author: form.author, publisher: form.publisher, pub_year: form.pub_year, class_no: form.class_no, author_mark: form.author_mark }
    Object.assign(form, empty(), keep, { reg_no: await books.nextRegNo() })
  } catch (e) {
    toast.error(e)
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!confirm(`"${form.title}" 도서를 삭제하시겠습니까?`)) return
  try {
    await books.remove(props.id)
    toast('삭제했습니다.')
    router.replace('/books')
  } catch (e) {
    toast.error(e)
  }
}

const preview = computed(() => callNumberLines(form))
</script>

<template>
  <form class="layout" @submit.prevent="save">
    <div class="stack">
      <section class="card">
        <div class="card-head"><h3>서지 정보</h3></div>
        <div class="card-body form-grid">
          <div class="field span-2">
            <label for="isbn">ISBN</label>
            <div class="inline">
              <input id="isbn" v-model="form.isbn" class="input" inputmode="numeric" placeholder="978…" @keydown.enter.prevent="lookup" />
              <button type="button" class="btn" :disabled="lookingUp" @click="lookup">{{ lookingUp ? '조회 중…' : '서지 조회' }}</button>
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
            <small v-if="koreanFor">"{{ koreanFor }}"은(는) 한글이 아니라서 한글 두 글자로 입력해주세요.</small>
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
          <label class="field" :class="{ invalid: errors.reg_no }">
            <span>등록번호<b class="req">*</b></span>
            <input v-model="form.reg_no" class="input num" />
            <small>바코드에 사용되는 번호</small>
          </label>
          <label class="field">
            <span>상태</span>
            <select v-model="form.status" class="select" :disabled="form.status === 'loaned'">
              <option v-for="(s, k) in BOOK_STATUS" :key="k" :value="k" :disabled="k === 'loaned'">{{ s.label }}</option>
            </select>
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
            <dt>라벨</dt><dd>{{ meta.label_printed ? '출력 완료' : '미출력' }}</dd>
          </dl>
        </div>
      </section>
      <div class="actions">
        <button class="btn primary lg" type="submit" :disabled="busy">{{ isEdit ? '저장' : '등록' }}</button>
        <button v-if="!isEdit" class="btn lg" type="button" :disabled="busy" @click="saveAndNew">등록 후 계속</button>
        <button v-if="isEdit" class="btn danger lg" type="button" @click="remove">삭제</button>
        <router-link to="/books" class="btn ghost lg">목록</router-link>
      </div>
    </aside>

    <!-- ISBN 조회 결과가 여러 건일 때 선택 창 -->
    <Teleport to="body">
      <div v-if="candidates.length" class="modal-scrim" @click.self="candidates = []">
        <div class="modal card" role="dialog" aria-modal="true" aria-labelledby="cand-title">
          <div class="card-head">
            <h3 id="cand-title">검색 결과 {{ candidates.length }}건 <span class="muted small">— 등록할 책을 선택하세요</span></h3>
            <button type="button" class="btn ghost sm" aria-label="닫기" @click="candidates = []">✕</button>
          </div>
          <div class="tbl-wrap modal-body">
            <table class="tbl">
              <thead><tr><th>서명</th><th>권차</th><th>저자</th><th>출판사</th><th>연도</th><th>분류기호</th><th v-if="hasSource">출처</th></tr></thead>
              <tbody>
                <tr v-for="(c, i) in candidates" :key="i" class="clickable" tabindex="0" @click="applyCandidate(c)" @keydown.enter="applyCandidate(c)">
                  <td class="title-cell">{{ c.title }}<span v-if="c.series_title" class="sub">{{ c.series_title }}</span></td>
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
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 1fr 280px; gap: 18px; align-items: start; }
.side { position: sticky; top: 80px; }
.inline { display: flex; gap: 6px; }
.field > label { font-size: 13px; font-weight: 600; color: var(--text-2); }
.korean .input { border-color: var(--amber); }
.samples { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; font-size: 12.5px; }
.modal-scrim { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / .35); display: grid; place-items: center; padding: 16px; }
.modal { width: min(860px, 100%); max-height: min(80vh, 640px); display: flex; flex-direction: column; box-shadow: var(--shadow); }
.modal-body { overflow: auto; }
.small { font-size: 13px; font-weight: 400; }
.spine { margin: 0 auto; width: 120px; min-height: 120px; border: 1px solid var(--line-strong); border-radius: 6px; padding: 14px 8px; display: grid; align-content: center; justify-items: center; gap: 4px; font-size: 16px; font-weight: 600; background: var(--surface-2); }
.meta { display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; margin: 18px 0 0; font-size: 13px; }
.meta dt { color: var(--text-3); }
.meta dd { margin: 0; }
.actions { display: grid; gap: 8px; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .side { position: static; }
}
</style>
