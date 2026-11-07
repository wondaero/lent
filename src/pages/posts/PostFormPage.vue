<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { posts } from '@/api'
import { POST_CATEGORY, POST_STATUS } from '@/lib/constants'
import { fmtDateTime } from '@/lib/format'
import { toast } from '@/stores/toast'
import PostPhotos from './PostPhotos.vue'

const props = defineProps({ id: String })
const route = useRoute()
const router = useRouter()
const isEdit = computed(() => !!props.id)

const form = reactive({
  category: POST_CATEGORY[route.query.category] ? route.query.category : 'notice',
  title: '', body: '', pinned: false, status: 'published',
})
const photos = ref([])
const meta = ref(null)
const invalidTitle = ref(false)
const busy = ref(false)
const photoBusy = ref(false)

const cat = computed(() => POST_CATEGORY[form.category])

onMounted(async () => {
  if (!isEdit.value) return
  try {
    const p = await posts.get(props.id)
    Object.keys(form).forEach((k) => (form[k] = p[k]))
    photos.value = p.images
    meta.value = p
  } catch (e) {
    toast.error(e)
    router.replace('/posts')
  }
})

// 새 글에서만 분류를 바꿀 수 있다. 사진이 있는데 공지사항으로 바꾸면 사진이 빠지므로 확인
function setCategory(k) {
  if (k === form.category) return
  if (!POST_CATEGORY[k].photos && photos.value.length && !confirm(`${POST_CATEGORY[k].label}에는 사진을 올릴 수 없습니다. 추가한 사진 ${photos.value.length}장을 빼고 바꿀까요?`)) return
  if (!POST_CATEGORY[k].photos) photos.value = []
  form.category = k
}

async function save() {
  invalidTitle.value = !form.title.trim()
  if (invalidTitle.value) return toast('제목을 입력해주세요.', 'error')
  busy.value = true
  const data = {
    ...form,
    pinned: form.category === 'notice' && form.pinned,
    images: cat.value.photos ? photos.value : [],
  }
  try {
    if (isEdit.value) {
      const p = await posts.update(props.id, data)
      photos.value.forEach((x) => x.blob && URL.revokeObjectURL(x.url))
      photos.value = p.images
      meta.value = p
      toast('저장했습니다.')
    } else {
      const p = await posts.create(data)
      toast(form.status === 'draft' ? '임시저장했습니다.' : '게시했습니다.')
      router.replace(`/posts/${p.id}`)
    }
  } catch (e) {
    toast.error(e)
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (!confirm(`"${meta.value.title}" 글을 삭제하시겠습니까?${photos.value.length ? ` 사진 ${photos.value.length}장도 함께 삭제됩니다.` : ''}`)) return
  try {
    await posts.remove(props.id)
    toast('삭제했습니다.')
    router.replace('/posts')
  } catch (e) {
    toast.error(e)
  }
}
</script>

<template>
  <form class="layout" @submit.prevent="save">
    <section class="card">
      <div class="card-head">
        <h3>{{ isEdit ? `${cat.label} 글` : '새 글' }}</h3>
        <div v-if="!isEdit" class="seg" role="tablist" aria-label="분류">
          <button v-for="(c, k) in POST_CATEGORY" :key="k" type="button" role="tab" :aria-selected="form.category === k" :class="{ on: form.category === k }" @click="setCategory(k)">{{ c.label }}</button>
        </div>
      </div>
      <div class="card-body stack">
        <label class="field" :class="{ invalid: invalidTitle }">
          <span>제목<b class="req">*</b></span>
          <input v-model="form.title" class="input" maxlength="100" @input="invalidTitle = false" />
        </label>
        <label class="field">
          <span>본문</span>
          <textarea v-model="form.body" class="textarea body" />
        </label>
        <div v-if="cat.photos" class="field">
          <span>사진</span>
          <PostPhotos v-model="photos" :disabled="busy" @busy="photoBusy = $event" />
        </div>
      </div>
    </section>

    <aside class="side stack">
      <section class="card card-body opts">
        <div class="field">
          <span>상태</span>
          <div class="radio-row">
            <label v-for="(s, k) in POST_STATUS" :key="k"><input v-model="form.status" type="radio" :value="k" />{{ s.label }}</label>
          </div>
          <small class="muted">임시저장 글은 메인페이지에 보이지 않습니다.</small>
        </div>
        <label v-if="form.category === 'notice'" class="check">
          <input v-model="form.pinned" type="checkbox" />목록 맨 위에 고정
        </label>
        <div v-if="meta" class="summary">
          <div><span class="muted">작성</span><span class="num">{{ fmtDateTime(meta.created_at) }}</span></div>
          <div><span class="muted">게시</span><span class="num">{{ fmtDateTime(meta.published_at) || '-' }}</span></div>
          <div><span class="muted">수정</span><span class="num">{{ fmtDateTime(meta.updated_at) }}</span></div>
        </div>
      </section>
      <div class="actions">
        <button class="btn primary lg" type="submit" :disabled="busy || photoBusy">{{ photoBusy ? '사진 처리 중…' : isEdit ? '저장' : form.status === 'draft' ? '임시저장' : '게시' }}</button>
        <button v-if="isEdit" class="btn danger lg" type="button" :disabled="busy" @click="remove">삭제</button>
        <router-link to="/posts" class="btn ghost lg">목록</router-link>
      </div>
    </aside>
  </form>
</template>

<style scoped>
.layout { display: grid; grid-template-columns: 1fr 280px; gap: 18px; align-items: start; }
.side { position: sticky; top: 80px; }
.actions { display: grid; gap: 8px; }
.body { min-height: 260px; resize: vertical; line-height: 1.6; }
.opts { display: grid; gap: 14px; }
.check { display: inline-flex; gap: 6px; align-items: center; font-size: 14px; cursor: pointer; }
.summary { display: grid; gap: 8px; font-size: 13.5px; padding-top: 12px; border-top: 1px solid var(--line); }
.summary > div { display: flex; justify-content: space-between; gap: 8px; }
@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .side { position: static; }
}
</style>
