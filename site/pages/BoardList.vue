<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageTitle from '@site/components/PageTitle.vue';
import Pagination from '@site/components/Pagination.vue';
import { BoardApi } from '@site/services/api';
import { boardByName } from '@site/definitions/boards';
import { toastError } from '@site/composable/useFeedback';
import { formatDate } from '@site/libs/format';
import type { BoardName, Post } from '@site/types/models';

const props = defineProps<{ board: BoardName }>();

const route = useRoute();
const router = useRouter();

const definition = computed(() => boardByName(props.board));

const state = reactive({
    searchText: '',
    loading: true,
    posts: [] as Post[],
    total: 0,
    page: 1,
    size: 15,
});

const load = async () => {
    state.searchText = String(route.query.q ?? '');
    state.page = Math.max(1, Number(route.query.page) || 1);
    state.loading = true;

    try {
        const res = await BoardApi.list(props.board, { q: state.searchText, page: state.page });
        state.posts = res.items;
        state.total = res.total;
        state.size = res.size;
    } catch (error) {
        toastError(error);
    } finally {
        state.loading = false;
    }
};

const onSearch = () => {
    router.push({ query: { q: state.searchText.trim() || undefined } });
};

const onPage = (page: number) => {
    router.push({ query: { ...route.query, page } });
    window.scrollTo({ top: 0 });
};

watch(() => [props.board, route.query], load, { immediate: true });
</script>

<template>
    <div class="board-list page">
        <div class="container">
            <PageTitle :title="definition.title" :desc="definition.desc" />
            <div class="toolbar">
                <div class="count">총 <b>{{ state.total.toLocaleString() }}</b>건</div>
                <div class="actions">
                    <form class="mini-search" @submit.prevent="onSearch">
                        <input v-model="state.searchText" type="search" class="form-control" placeholder="제목·내용" />
                        <button type="submit" class="btn btn-light-line">검색</button>
                    </form>
                </div>
            </div>

            <div v-if="state.loading" class="rows">
                <div v-for="i in 5" :key="i" class="row-item">
                    <div class="main">
                        <div class="skeleton" style="width: 55%"></div>
                    </div>
                </div>
            </div>
            <div v-else-if="state.posts.length" class="rows">
                <router-link v-for="post in state.posts" :key="post.id" :to="`${definition.path}/${post.id}`"
                    class="row-item clickable">
                    <div class="main">
                        <div class="title">
                            <span v-if="post.pinned" class="pin">공지</span>
                            {{ post.title }}
                            <span v-if="post.imageCount" class="photos">사진 {{ post.imageCount }}</span>
                        </div>
                        <div class="sub d-md-none">{{ formatDate(post.publishedAt) }}</div>
                    </div>
                    <div class="side d-none d-md-flex">
                        <span>{{ formatDate(post.publishedAt) }}</span>
                    </div>
                    <img v-if="post.thumbUrl" :src="post.thumbUrl" alt="" loading="lazy" class="thumb" />
                </router-link>
            </div>
            <div v-else class="empty">아직 올라온 글이 없어요.</div>

            <Pagination :page="state.page" :size="state.size" :total="state.total" @change="onPage" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.board-list {
    .mini-search {
        display: flex;
        gap: var(--px6);

        input {
            width: var(--px200);
        }
    }

    .pin {
        display: inline-block;
        margin-right: var(--px6);
        padding: 0 var(--px6);
        border-radius: var(--px4);
        background: var(--color-tag);
        color: var(--color-point);
        font-size: var(--px13);
        font-weight: 600;
    }

    .photos {
        margin-left: var(--px6);
        color: var(--color-secondary);
        font-size: var(--px13);
    }

    .thumb {
        flex: none;
        width: var(--px80);
        height: var(--px60);
        object-fit: cover;
        border-radius: var(--px6);
        background: var(--color-background);
    }

    @media(max-width: 575px) {
        .toolbar .actions {
            width: 100%;

            .mini-search {
                flex: 1;

                input {
                    width: auto;
                    flex: 1;
                }
            }
        }
    }
}
</style>
