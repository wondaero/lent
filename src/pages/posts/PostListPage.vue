<script setup>
import { computed, onActivated, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { posts } from '@/api'
import { POST_CATEGORY, POST_STATUS } from '@/lib/constants'
import { fmtDate, num } from '@/lib/format'
import { usePagedList } from '@/lib/usePagedList'
import SearchBox from '@/components/SearchBox.vue'
import Pagination from '@/components/Pagination.vue'

defineOptions({ name: 'PostListPage' })

const router = useRouter()
const { filters, page, rows, total, loading, perPage, load } = usePagedList(posts.list, { category: 'notice', keyword: '', status: '' })

const withPhotos = computed(() => POST_CATEGORY[filters.category].photos)
const statusTabs = [{ v: '', label: '전체' }, ...Object.entries(POST_STATUS).map(([v, s]) => ({ v, label: s.label }))]

let mounted = false
onMounted(() => { load(); mounted = true })
onActivated(() => { if (mounted) load() })
</script>

<template>
  <div>
    <div class="toolbar">
      <div class="seg" role="tablist" aria-label="분류">
        <button v-for="(c, k) in POST_CATEGORY" :key="k" role="tab" :aria-selected="filters.category === k" :class="{ on: filters.category === k }" @click="filters.category = k">{{ c.label }}</button>
      </div>
      <SearchBox v-model="filters.keyword" placeholder="제목, 본문" />
      <div class="seg">
        <button v-for="t in statusTabs" :key="t.v" :class="{ on: filters.status === t.v }" @click="filters.status = t.v">{{ t.label }}</button>
      </div>
      <div class="grow" />
      <router-link :to="{ path: '/posts/new', query: { category: filters.category } }" class="btn primary">+ 글쓰기</router-link>
    </div>

    <div class="card">
      <div class="card-head">
        <span class="muted">{{ POST_CATEGORY[filters.category].label }} 총 <strong class="num" style="color: var(--text)">{{ num(total) }}</strong>건</span>
      </div>
      <div v-if="loading" class="loading-bar" />
      <div class="tbl-wrap">
        <table class="tbl">
          <colgroup>
            <col v-if="withPhotos" style="width: 84px" />
            <col />
            <col style="width: 96px" />
            <col style="width: 112px" />
          </colgroup>
          <thead>
            <tr><th v-if="withPhotos">사진</th><th>제목</th><th>상태</th><th>게시일</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in rows" :key="p.id" class="clickable" @click="router.push(`/posts/${p.id}`)">
              <td v-if="withPhotos" class="thumb-cell">
                <img v-if="p.thumb_url" :src="p.thumb_url" alt="" loading="lazy" class="thumb" />
                <span v-else class="thumb none" />
              </td>
              <td class="post-title">
                <span v-if="p.pinned" class="badge amber pin">고정</span>
                <strong>{{ p.title }}</strong>
                <span v-if="p.image_count" class="muted count num">사진 {{ p.image_count }}</span>
              </td>
              <td><span class="badge" :class="POST_STATUS[p.status]?.tone">{{ POST_STATUS[p.status]?.label }}</span></td>
              <td class="nowrap num muted">{{ fmtDate(p.published_at) || '-' }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="!loading && !rows.length" class="empty">글이 없습니다.</div>
      </div>
      <Pagination v-model="page" :total="total" :per-page="perPage" />
    </div>
  </div>
</template>

<style scoped>
.tbl { table-layout: fixed; }
.post-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pin { margin-right: 6px; }
.count { margin-left: 8px; font-size: 12.5px; }
.thumb-cell { padding-top: 6px; padding-bottom: 6px; }
.thumb { display: block; width: 60px; height: 45px; object-fit: cover; border-radius: 6px; background: var(--hover); }
.thumb.none { border: 1px dashed var(--line); background: transparent; }
</style>
