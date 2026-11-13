<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageTitle from '@site/components/PageTitle.vue';
import Pagination from '@site/components/Pagination.vue';
import BookRows from '@site/components/BookRows.vue';
import BookSheet from '@site/components/BookSheet.vue';
import { BookApi } from '@site/services/api';
import LoadError from '@site/components/LoadError.vue';
import type { Book } from '@site/types/models';

const route = useRoute();
const router = useRouter();

const PAGE_SIZE = 20;

const state = reactive({
    searchText: '',
    loading: true,
    error: null as unknown,
    books: [] as Book[],
    total: 0,
    page: 1,
});

const selected = ref<Book | null>(null);

const load = async () => {
    state.searchText = String(route.query.q ?? '');
    state.page = Math.max(1, Number(route.query.page) || 1);
    state.loading = true;
    state.error = null;

    try {
        const res = await BookApi.listNew({ q: state.searchText, page: state.page, size: PAGE_SIZE });
        state.books = res.items;
        state.total = res.total;
    } catch (error) {
        state.error = error;
        state.books = [];
        state.total = 0;
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

watch(() => route.query, load, { immediate: true });
</script>

<template>
    <div class="new-books page">
        <div class="container">
            <div class="header">
                <PageTitle title="신간 도서" desc="최근 한 달 동안 도서관에 새로 들어온 책이에요." />
                <form class="search-bar" @submit.prevent="onSearch">
                    <input v-model="state.searchText" type="search" class="form-control" placeholder="신간 안에서 검색"
                        enterkeyhint="search" />
                    <button type="submit" class="btn-search">
                        <img src="/assets/images/common.search.white.svg" alt="검색" />
                    </button>
                </form>
            </div>
            <div class="toolbar">
                <div class="count"><template v-if="!state.error">총 <b>{{ state.total.toLocaleString() }}</b>권</template></div>
            </div>
            <LoadError v-if="state.error && !state.loading" :error="state.error" @retry="load" />
            <BookRows v-else :books="state.books" :loading="state.loading" show-date @select="selected = $event">
                <template #empty>최근 한 달 동안 새로 들어온 책이 없어요.</template>
            </BookRows>
            <Pagination :page="state.page" :size="PAGE_SIZE" :total="state.total" @change="onPage" />
        </div>
        <BookSheet :book="selected" @close="selected = null" />
    </div>
</template>

<style lang="scss" scoped>
.new-books {
    .header {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: var(--px20);
        margin-bottom: var(--px20);

        .page-title {
            margin-bottom: 0;
        }

        .search-bar {
            width: min(100%, var(--px360));

            input,
            .btn-search {
                height: var(--px48);
            }

            .btn-search {
                width: var(--px48);
            }
        }

        @media(max-width: 767px) {
            flex-direction: column;
            align-items: stretch;
        }
    }
}
</style>
