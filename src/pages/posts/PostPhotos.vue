<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { POST_PHOTO } from '@/lib/constants'
import { fmtBytes, preparePhoto } from '@/lib/imageResize'
import { toast } from '@/stores/toast'

// 사진 목록 편집: 추가(선택·끌어놓기) → 브라우저에서 줄이기 → 순서 변경 → 삭제.
// 항목: 기존 사진 { id, url, width, height } / 새 사진 { key, url(미리보기), blob, thumbBlob, width, height, size, originalSize }
const photos = defineModel({ type: Array, default: () => [] })
const props = defineProps({ disabled: Boolean })
const emit = defineEmits(['busy'])

const fileInput = ref(null)
const progress = ref(null) // { done, total }
const dragOver = ref(false)
let seq = 0

const remain = computed(() => POST_PHOTO.maxCount - photos.value.length)
// 이번에 새로 올리는 사진의 절감 효과(원본 → 줄인 크기)
const saving = computed(() => {
  const fresh = photos.value.filter((p) => p.blob)
  if (!fresh.length) return null
  return {
    count: fresh.length,
    before: fresh.reduce((s, p) => s + p.originalSize, 0),
    after: fresh.reduce((s, p) => s + p.size + p.thumbBlob.size, 0),
  }
})

async function addFiles(fileList) {
  if (progress.value) return
  let files = [...fileList].filter((f) => f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))
  if (!files.length) return
  if (files.length > remain.value) {
    toast(`사진은 ${POST_PHOTO.maxCount}장까지입니다. 앞의 ${Math.max(0, remain.value)}장만 추가합니다.`, 'error')
    files = files.slice(0, Math.max(0, remain.value))
  }
  progress.value = { done: 0, total: files.length }
  emit('busy', true)
  const added = []
  try {
    // 한 장씩 처리: 휴대폰 사진 여러 장을 동시에 풀면 메모리가 부족할 수 있음
    for (const f of files) {
      try {
        const p = await preparePhoto(f)
        added.push({ ...p, key: `n${++seq}`, url: URL.createObjectURL(p.blob) })
      } catch (e) {
        toast.error(e)
      }
      progress.value.done++
    }
  } finally {
    photos.value = [...photos.value, ...added]
    progress.value = null
    emit('busy', false)
  }
}

function onPick(e) {
  addFiles(e.target.files)
  e.target.value = '' // 같은 파일을 다시 고를 수 있게
}
function onDrop(e) {
  dragOver.value = false
  if (!props.disabled) addFiles(e.dataTransfer.files)
}

function move(i, d) {
  const arr = [...photos.value]
  ;[arr[i], arr[i + d]] = [arr[i + d], arr[i]]
  photos.value = arr
}
function remove(i) {
  const [p] = photos.value.slice(i, i + 1)
  if (p.blob) URL.revokeObjectURL(p.url)
  photos.value = photos.value.filter((_, k) => k !== i)
}

// 화면을 떠나면 새 사진 미리보기 주소 해제(저장된 사진은 api 쪽이 따로 주소를 만든다)
onBeforeUnmount(() => photos.value.forEach((p) => p.blob && URL.revokeObjectURL(p.url)))
</script>

<template>
  <div class="photos" :class="{ over: dragOver }" @dragover.prevent="dragOver = !disabled" @dragleave.self="dragOver = false" @drop.prevent="onDrop">
    <div class="head">
      <span class="muted">
        사진 <strong class="num">{{ photos.length }}</strong> / {{ POST_PHOTO.maxCount }}장 · 첫 사진이 대표 사진
        <template v-if="saving"> · 새 사진 {{ saving.count }}장 {{ fmtBytes(saving.before) }} → <strong>{{ fmtBytes(saving.after) }}</strong></template>
      </span>
      <button type="button" class="btn sm" :disabled="disabled || !!progress || remain <= 0" @click="fileInput.click()">사진 추가</button>
      <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onPick" />
    </div>

    <div v-if="progress" class="progress">사진 줄이는 중 {{ progress.done }} / {{ progress.total }}</div>

    <ol v-if="photos.length" class="grid">
      <li v-for="(p, i) in photos" :key="p.id ?? p.key">
        <img :src="p.thumb_url || p.url" :alt="`사진 ${i + 1}`" loading="lazy" />
        <span v-if="i === 0" class="badge green rep">대표</span>
        <span v-else class="order num">{{ i + 1 }}</span>
        <div class="tools">
          <button type="button" class="btn ghost sm" :disabled="disabled || i === 0" aria-label="앞으로" @click="move(i, -1)">◀</button>
          <button type="button" class="btn ghost sm" :disabled="disabled || i === photos.length - 1" aria-label="뒤로" @click="move(i, 1)">▶</button>
          <span class="grow" />
          <button type="button" class="btn ghost sm del" :disabled="disabled" aria-label="삭제" @click="remove(i)">✕</button>
        </div>
      </li>
    </ol>
    <div v-else-if="!progress" class="drop muted">사진을 여기로 끌어다 놓거나 [사진 추가]를 누르세요.<br />올리기 전에 긴 변 {{ POST_PHOTO.maxSide }}px로 줄여서 저장합니다.</div>
  </div>
</template>

<style scoped>
.photos { display: grid; gap: 10px; padding: 12px; border: 1px dashed var(--line-strong); border-radius: 8px; }
.photos.over { border-color: var(--brand); background: var(--brand-soft); }
.head { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; font-size: 13px; }
.progress { font-size: 13px; color: var(--brand-ink); }
.grid { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.grid li { position: relative; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--surface-2); }
.grid img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: var(--hover); }
.rep, .order { position: absolute; top: 6px; left: 6px; }
.order { min-width: 22px; height: 22px; padding: 0 6px; border-radius: 6px; font-size: 12px; font-weight: 600; display: grid; place-items: center; background: var(--surface); color: var(--text-2); }
.tools { display: flex; align-items: center; gap: 2px; padding: 4px; }
.tools .grow { flex: 1; }
.del { color: var(--red); }
.drop { padding: 28px 12px; text-align: center; font-size: 13.5px; line-height: 1.6; }
</style>
