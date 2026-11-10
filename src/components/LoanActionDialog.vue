<script setup>
// 대출 한 건의 반납 / 연장 확인 창. 날짜를 확인·변경한 뒤 확정한다(목록에서 다른 줄을 잘못 누르는 실수 방지)
import { computed, nextTick, ref, watch } from 'vue'
import { loans } from '@/api'
import { addDays, dueOf, fmtDate, overdueDays } from '@/lib/format'
import { useToday } from '@/lib/useToday'
import { toast } from '@/stores/toast'

const props = defineProps({
  loan: { type: Object, default: null },
  mode: { type: String, default: 'return' },   // 'return' | 'extend'
})
const emit = defineEmits(['close', 'done'])

// 창을 열 때마다 오늘을 다시 계산(대출 기록 화면은 캐시되어 며칠씩 열려 있을 수 있음)
const { today, saturday: sat, refresh } = useToday()
const date = ref(today.value)
const busy = ref(false)
const dateInput = ref(null)

watch(() => props.loan, (l) => {
  if (!l) return
  refresh()
  // 연장 기본값 = 오늘 + 회원 대출기간. 고정이 아니라 바꿀 수 있다
  date.value = props.mode === 'extend' ? addDays(l.member?.loan_days ?? 14) : today.value
  nextTick(() => dateInput.value?.focus())
}, { immediate: true })

const late = computed(() => props.loan && props.mode === 'return' ? overdueDays(dueOf(props.loan), date.value) : 0)
const invalid = computed(() => !date.value || (props.mode === 'extend' ? date.value < today.value : date.value > today.value))

async function submit() {
  if (invalid.value || busy.value) return
  busy.value = true
  try {
    if (props.mode === 'extend') {
      await loans.extend(props.loan.id, date.value)
      toast(`${fmtDate(date.value)}까지 연장했습니다.`)
    } else {
      await loans.process({ returnIds: [props.loan.id], returnDate: date.value })
      toast(late.value ? `반납했습니다. (연체 ${late.value}일)` : '반납했습니다.')
    }
    emit('done')
  } catch (e) {
    toast.error(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="loan" class="modal-scrim" @click.self="emit('close')" @keydown.esc="emit('close')">
      <form class="modal card" role="dialog" aria-modal="true" aria-labelledby="loan-act-title" @submit.prevent="submit">
        <div class="card-head">
          <h3 id="loan-act-title">{{ mode === 'extend' ? '대출 연장' : '반납' }}</h3>
          <button type="button" class="btn ghost sm" aria-label="닫기" @click="emit('close')">✕</button>
        </div>
        <div class="body">
          <dl class="meta">
            <dt>도서</dt><dd>{{ loan.book?.title ?? '(삭제된 도서)' }} <span class="muted num">{{ loan.book?.reg_no }}</span></dd>
            <dt>회원</dt><dd>{{ loan.member?.name ?? '-' }} <span class="muted num">{{ loan.member?.phone }}</span></dd>
            <dt>대출일</dt><dd class="num">{{ fmtDate(loan.loaned_at) }}</dd>
            <dt>반납예정일</dt>
            <dd class="num">
              {{ fmtDate(dueOf(loan)) }}
              <span v-if="loan.extended_due_at" class="muted">(연장됨 · 처음 {{ fmtDate(loan.due_at) }})</span>
              <span v-if="loan.overdue" class="badge red">연체 {{ overdueDays(dueOf(loan)) }}일</span>
            </dd>
          </dl>
          <label class="line">
            <span class="lbl">{{ mode === 'extend' ? '연장 반납일' : '반납 처리일' }}</span>
            <input ref="dateInput" v-model="date" type="date" class="input date" :min="mode === 'extend' ? today : undefined" :max="mode === 'return' ? today : undefined" required />
            <template v-if="mode === 'return'">
              <button type="button" class="btn sm" :class="{ on: date === today }" @click="date = today">오늘</button>
              <button type="button" class="btn sm" :class="{ on: date === sat }" @click="date = sat">지난 토요일</button>
            </template>
          </label>
          <p v-if="mode === 'return' && late" class="note t-red">이 날짜 기준 연체 {{ late }}일</p>
        </div>
        <div class="foot">
          <button type="button" class="btn" @click="emit('close')">취소</button>
          <button type="submit" class="btn primary" :disabled="invalid || busy">{{ mode === 'extend' ? '연장' : '반납' }}</button>
        </div>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-scrim { position: fixed; inset: 0; z-index: 50; background: rgb(0 0 0 / .35); display: grid; place-items: center; padding: 16px; }
.modal { width: min(460px, 100%); box-shadow: var(--shadow); }
.body { padding: 16px 18px 4px; display: grid; gap: 14px; }
.meta { display: grid; grid-template-columns: 78px 1fr; gap: 6px 10px; margin: 0; font-size: 13.5px; }
.meta dt { color: var(--text-3); }
.meta dd { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.lbl { width: 78px; font-size: 13px; font-weight: 600; color: var(--text-2); }
.date { width: 160px; }
.note { margin: 0; font-size: 13px; }
.t-red { color: var(--red); }
.foot { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 18px 16px; }
</style>
