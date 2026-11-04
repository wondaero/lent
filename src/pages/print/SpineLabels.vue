<script setup>
// 청구기호 라벨(책등). 도서를 등록하면 "미출력"으로 쌓이고, 라벨지 한 장 분량이 모이면 한 번에 출력한다
import { computed, nextTick, onMounted, ref, shallowRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { books } from '@/api'
import { callNumberLines } from '@/lib/format'
import { useLabelSheet } from '@/lib/useLabelSheet'
import { toast } from '@/stores/toast'
import LabelSheetFields from './LabelSheetFields.vue'
import PrintCheckDialog from './PrintCheckDialog.vue'

const { s, reset, perPage, paginate, sheetStyle } = useLabelSheet('lent.labelSettings', {
  type: 'call',       // call: 청구기호 전체 | class: 분류기호 | author: 저자기호
  showRegNo: false,
  cols: 5,
  width: 38,          // mm
  height: 25,
  gapX: 2,
  gapY: 2,
  top: 10,
  left: 8,
  fontSize: 12,       // pt
  skip: 0,            // 이미 사용한 라벨 칸 수(낱장 재사용)
})

const candidates = shallowRef([])
const selected = ref(new Set())
const loading = ref(false)
const addCode = ref('')

onMounted(loadUnprinted)

async function loadUnprinted() {
  loading.value = true
  try {
    const res = await books.list({ label: 'unprinted', perPage: 1000 })
    candidates.value = res.rows
    selected.value = new Set(res.rows.map((b) => b.id))
  } catch (e) { toast.error(e) }
  finally { loading.value = false }
}

async function addByCode() {
  const code = addCode.value.trim()
  addCode.value = ''
  if (!code) return
  try {
    const b = await books.getByRegNo(code)
    if (!candidates.value.some((x) => x.id === b.id)) candidates.value = [b, ...candidates.value]
    selected.value = new Set(selected.value).add(b.id)
  } catch (e) { toast.error(e) }
}

function toggle(id) {
  const next = new Set(selected.value)
  next.has(id) ? next.delete(id) : next.add(id)
  selected.value = next
}
const allChecked = computed(() => candidates.value.length > 0 && selected.value.size === candidates.value.length)
function toggleAll() {
  selected.value = allChecked.value ? new Set() : new Set(candidates.value.map((b) => b.id))
}

function linesOf(b) {
  if (s.type === 'class') return [b.class_no]
  if (s.type === 'author') return [b.author_mark]
  return callNumberLines(b)
}

const selectedBooks = computed(() => candidates.value.filter((b) => selected.value.has(b.id)))
// 인쇄 중(출력 확인 전)에는 출력한 목록을 고정
const printing = ref(null)    // { books }
const labels = computed(() => printing.value?.books ?? selectedBooks.value)
const pages = computed(() => paginate(labels.value))
// 모아서 출력하기: 마지막 장에 남는 칸 수(라벨지 낭비 판단용)
const emptyCells = computed(() => {
  const used = (Math.min(s.skip, perPage.value - 1) + labels.value.length) % perPage.value
  return used ? perPage.value - used : 0
})

// 출력 완료 표시는 출력물을 확인한 뒤에만(안 나온 책이 목록에서 빠지면 라벨 없이 서가에 꽂힘)
async function print() {
  if (!labels.value.length) return toast('출력할 도서를 선택해주세요.', 'error')
  printing.value = { books: [...labels.value] }
  await nextTick()
  window.print()
}
const printWin = () => window.print()
async function printOk() {
  try {
    await books.markLabelPrinted(printing.value.books.map((b) => b.id))
    printing.value = null
    toast('출력 완료로 표시했습니다.')
    loadUnprinted()
  } catch (e) { toast.error(e) }
}
function printCancel() {
  printing.value = null
  toast('출력 완료로 표시하지 않았습니다. 미출력 목록에 그대로 남습니다.')
}
onBeforeRouteLeave(() => {
  if (!printing.value) return true
  toast('출력물 확인을 먼저 해주세요.', 'error')
  return false
})
</script>

<template>
  <div class="print-page">
    <div class="controls no-print">
      <slot />
      <section class="card">
        <div class="card-head"><h3>출력 대상 <span class="muted num">{{ labels.length }} / {{ candidates.length }}</span></h3></div>
        <div class="card-body stack">
          <p class="sheet-note">
            A4 한 장 <b class="num">{{ perPage }}</b>칸 ·
            <template v-if="emptyCells">마지막 장 <b class="num">{{ emptyCells }}</b>칸 남음</template>
            <template v-else-if="labels.length">빈칸 없이 꽉 참</template>
            <template v-else>등록한 도서가 여기에 쌓입니다</template>
          </p>
          <form class="inline" @submit.prevent="addByCode">
            <input v-model="addCode" class="input num" placeholder="등록번호 스캔으로 추가(재출력)" />
            <button class="btn" type="submit">추가</button>
          </form>
          <div class="pick-head">
            <label><input type="checkbox" :checked="allChecked" @change="toggleAll" /> 전체 선택</label>
            <button class="btn ghost sm" @click="loadUnprinted">미출력 목록 새로고침</button>
          </div>
          <div v-if="loading" class="loading-bar" />
          <ul class="pick">
            <li v-for="b in candidates" :key="b.id">
              <label>
                <input type="checkbox" :checked="selected.has(b.id)" @change="toggle(b.id)" />
                <span class="grow"><span class="t">{{ b.title }}</span><span class="muted num small">{{ b.reg_no }} · {{ callNumberLines(b).join(' ') }}</span></span>
              </label>
            </li>
            <li v-if="!loading && !candidates.length" class="empty small">라벨 미출력 도서가 없습니다.</li>
          </ul>
        </div>
      </section>

      <section class="card">
        <div class="card-head"><h3>라벨 설정</h3><button class="btn ghost sm" @click="reset">기본값</button></div>
        <div class="card-body stack">
          <div class="seg">
            <button :class="{ on: s.type === 'call' }" @click="s.type = 'call'">청구기호</button>
            <button :class="{ on: s.type === 'class' }" @click="s.type = 'class'">분류기호</button>
            <button :class="{ on: s.type === 'author' }" @click="s.type = 'author'">저자기호</button>
          </div>
          <LabelSheetFields :s="s" />
          <label class="check"><input v-model="s.showRegNo" type="checkbox" /> 등록번호 함께 표시</label>
          <button class="btn primary lg" :disabled="!labels.length" @click="print">인쇄 ({{ labels.length }}장 · A4 {{ pages.length }}매)</button>
        </div>
      </section>
    </div>

    <PrintCheckDialog :open="!!printing" @ok="printOk" @retry="printWin" @cancel="printCancel">
      <p v-if="printing">청구기호 라벨 <b class="num">{{ printing.books.length }}</b>장</p>
      <p>라벨이 칸에 맞게, 글자가 잘리지 않고 나왔나요?</p>
    </PrintCheckDialog>

    <div class="preview">
      <div v-for="(cells, pi) in pages" :key="pi" class="sheet" :style="sheetStyle">
        <div v-for="(b, ci) in cells" :key="ci" class="label" :class="{ blank: !b }">
          <template v-if="b">
            <div v-for="(line, li) in linesOf(b)" :key="li" class="line">{{ line }}</div>
            <div v-if="s.showRegNo" class="reg">{{ b.reg_no }}</div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
