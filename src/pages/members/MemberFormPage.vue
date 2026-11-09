<script setup>
import { computed, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { members, loans } from '@/api'
import { MEMBER_STATUS } from '@/lib/constants'
import { addDays, dueOf, fmtDate, fmtDateTime, overdueDays } from '@/lib/format'
import { toast } from '@/stores/toast'
import { exportXlsx } from '@/lib/exportXlsx'
import ExportButton from '@/components/ExportButton.vue'

const props = defineProps({ id: String })
const router = useRouter()
const isEdit = computed(() => !!props.id)

const form = reactive({
  name: '', phone: '', birth_date: '', gender: 'M', address: '',
  loan_limit: 5, loan_days: 14, status: 'active', memo: '',
})
const meta = ref(null)
const errors = ref({})
const busy = ref(false)

// 대출 이력
const range = ref('3m')
const customFrom = ref(addDays(-30))
const customTo = ref(addDays(0))
const history = shallowRef([])
const historyLoading = ref(false)

onMounted(async () => {
  if (!isEdit.value) return
  try {
    const m = await members.get(props.id)
    Object.keys(form).forEach((k) => (form[k] = m[k] ?? ''))
    meta.value = m
    loadHistory()
  } catch (e) {
    toast.error(e)
    router.replace('/members')
  }
})

function rangeDates() {
  if (range.value === 'custom') return { from: customFrom.value, to: customTo.value }
  if (range.value === 'all') return {}
  const months = { '1m': 1, '3m': 3, '6m': 6, '12m': 12 }[range.value]
  const d = new Date(); d.setMonth(d.getMonth() - months)
  return { from: fmtDate(d) }
}

async function loadHistory() {
  historyLoading.value = true
  try { history.value = await loans.byMember(props.id, rangeDates()) }
  catch (e) { toast.error(e) }
  finally { historyLoading.value = false }
}
watch([range, customFrom, customTo], () => isEdit.value && loadHistory())

function onPhone(e) {
  // 숫자만 받아 010-0000-0000 형태로 정리
  const d = e.target.value.replace(/\D/g, '').slice(0, 11)
  form.phone = d.length < 4 ? d : d.length < 8 ? `${d.slice(0, 3)}-${d.slice(3)}` : `${d.slice(0, 3)}-${d.slice(3, d.length - 4)}-${d.slice(-4)}`
}

function validate() {
  const e = {}
  if (!form.name.trim()) e.name = true
  if (!/^\d{2,3}-\d{3,4}-\d{4}$/.test(form.phone)) e.phone = true
  if (!(+form.loan_limit >= 1)) e.loan_limit = true
  if (!(+form.loan_days >= 1)) e.loan_days = true
  errors.value = e
  return !Object.keys(e).length
}

async function save() {
  if (!validate()) return toast('필수 항목을 확인해주세요.', 'error')
  busy.value = true
  const data = { ...form, name: form.name.trim(), loan_limit: +form.loan_limit, loan_days: +form.loan_days }
  try {
    if (isEdit.value) {
      await members.update(props.id, data)
      toast('저장했습니다.')
    } else {
      const row = await members.create(data)
      toast(`${row.name} 회원을 등록했습니다.`)
      router.replace(`/members/${row.id}`)
    }
  } catch (e) {
    toast.error(e)
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!confirm(`"${meta.value.name}" 회원을 삭제하시겠습니까?`)) return
  try {
    await members.remove(props.id)
    toast('삭제했습니다.')
    router.replace('/members')
  } catch (e) {
    toast.error(e)
  }
}

function exportHistory() {
  return exportXlsx(`대출이력_${form.name}`, [
    { header: '등록번호', value: (l) => l.book?.reg_no, width: 11 },
    { header: '서명', value: (l) => l.book?.title ?? '(삭제된 도서)', width: 30 },
    { header: '저자', value: (l) => l.book?.author, width: 14 },
    { header: '대출일', value: (l) => fmtDate(l.loaned_at) },
    { header: '반납예정일', value: (l) => fmtDate(l.due_at) },
    { header: '연장 반납일', value: (l) => fmtDate(l.extended_due_at) },
    { header: '반납일', value: (l) => fmtDate(l.returned_at) },
    { header: '상태', value: (l) => loanState(l).label, width: 14 },
    { header: '대출 메모', value: (l) => l.loan_memo, width: 24 },
    { header: '반납 메모', value: (l) => l.return_memo, width: 24 },
  ], history.value)
}

function loanState(l) {
  if (!l.returned_at) return l.overdue ? { label: `연체 ${overdueDays(dueOf(l))}일`, tone: 'red' } : { label: '대출중', tone: 'blue' }
  const late = overdueDays(dueOf(l), l.returned_at)
  return late ? { label: `반납(연체 ${late}일)`, tone: 'amber' } : { label: '반납', tone: 'gray' }
}
</script>

<template>
  <div class="stack">
    <form class="layout" @submit.prevent="save">
      <section class="card">
        <div class="card-head">
          <h3>{{ isEdit ? '회원 정보' : '신규 회원' }}</h3>
          <span v-if="meta" class="muted num">{{ meta.member_no }}</span>
        </div>
        <div class="card-body form-grid">
          <label class="field" :class="{ invalid: errors.name }">
            <span>이름<b class="req">*</b></span>
            <input v-model="form.name" class="input" />
          </label>
          <label class="field" :class="{ invalid: errors.phone }">
            <span>전화번호<b class="req">*</b></span>
            <input :value="form.phone" class="input num" inputmode="tel" placeholder="010-0000-0000" @input="onPhone" />
          </label>
          <label class="field">
            <span>생년월일</span>
            <input v-model="form.birth_date" class="input" type="date" />
          </label>
          <div class="field">
            <span>성별</span>
            <div class="radio-row">
              <label><input v-model="form.gender" type="radio" value="M" />남</label>
              <label><input v-model="form.gender" type="radio" value="F" />여</label>
            </div>
          </div>
          <label class="field span-2">
            <span>주소</span>
            <input v-model="form.address" class="input" />
          </label>
          <label class="field" :class="{ invalid: errors.loan_limit }">
            <span>최대 대출 권수<b class="req">*</b></span>
            <input v-model="form.loan_limit" class="input" type="number" min="1" />
          </label>
          <label class="field" :class="{ invalid: errors.loan_days }">
            <span>대출 기간(일)<b class="req">*</b></span>
            <input v-model="form.loan_days" class="input" type="number" min="1" />
          </label>
          <label class="field">
            <span>상태</span>
            <select v-model="form.status" class="select">
              <option v-for="(s, k) in MEMBER_STATUS" :key="k" :value="k">{{ s.label }}</option>
            </select>
          </label>
          <label class="field span-all">
            <span>메모</span>
            <textarea v-model="form.memo" class="textarea" />
          </label>
        </div>
      </section>
      <aside class="side stack">
        <section v-if="meta" class="card card-body summary">
          <div><span class="muted">대출 중</span><strong class="num">{{ meta.active_loans }} / {{ meta.loan_limit }}</strong></div>
          <div><span class="muted">연체</span><strong class="num" :class="{ red: meta.overdue_count }">{{ meta.overdue_count }}건</strong></div>
          <div><span class="muted">가입일</span><span class="num">{{ fmtDateTime(meta.created_at) }}</span></div>
        </section>
        <div class="actions">
          <button class="btn primary lg" type="submit" :disabled="busy">{{ isEdit ? '저장' : '등록' }}</button>
          <router-link v-if="isEdit" :to="{ path: '/circulation', query: { member: id } }" class="btn lg secondary">대출하기</router-link>
          <button v-if="isEdit" class="btn danger lg" type="button" @click="remove">삭제</button>
          <router-link to="/members" class="btn ghost lg">목록</router-link>
        </div>
      </aside>
    </form>

    <section v-if="isEdit" class="card">
      <div class="card-head wrap">
        <h3>대출 이력 <span class="muted num">{{ history.length }}건</span></h3>
        <div class="filters">
          <div class="seg">
            <button v-for="r in [['1m','1개월'],['3m','3개월'],['6m','6개월'],['12m','1년'],['all','전체'],['custom','기간']]" :key="r[0]" :class="{ on: range === r[0] }" @click="range = r[0]">{{ r[1] }}</button>
          </div>
          <template v-if="range === 'custom'">
            <input v-model="customFrom" type="date" class="input date" aria-label="시작일" />
            <span class="muted">~</span>
            <input v-model="customTo" type="date" class="input date" aria-label="종료일" />
          </template>
          <ExportButton v-if="history.length" :run="exportHistory" />
        </div>
      </div>
      <div v-if="historyLoading" class="loading-bar" />
      <div class="tbl-wrap">
        <table class="tbl">
          <thead><tr><th class="fit">등록번호</th><th>서명</th><th class="fit">대출일</th><th class="fit">반납예정일</th><th class="fit">반납일</th><th class="fit">상태</th></tr></thead>
          <tbody>
            <tr v-for="l in history" :key="l.id">
              <td class="nowrap num muted">{{ l.book?.reg_no }}</td>
              <td class="title-cell">
                <router-link v-if="l.book?.id" :to="`/books/${l.book.id}`" class="cell-link">{{ l.book.title }}</router-link>
                <template v-else>{{ l.book?.title ?? '(삭제된 도서)' }}</template>
                <span class="sub">{{ l.book?.author }}</span>
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
        <div v-if="!historyLoading && !history.length" class="empty">기간 내 대출 이력이 없습니다.</div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 1fr 280px; gap: 18px; align-items: start; }
.side { position: sticky; top: 80px; }
.actions { display: grid; gap: 8px; }
.summary { display: grid; gap: 10px; font-size: 14px; }
.summary > div { display: flex; justify-content: space-between; gap: 8px; }
.red { color: var(--red); }
.memo { color: var(--amber); }
.wrap { flex-wrap: wrap; }
.filters { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.date { width: 150px; height: 34px; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .side { position: static; }
}
</style>
