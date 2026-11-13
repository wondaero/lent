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

const FIELDS = [
    { value: 'all', text: '전체' },
    { value: 'title', text: '서명' },
    { value: 'author', text: '저자' },
    { value: 'publisher', text: '출판사' },
];
const PAGE_SIZE = 20;

const state = reactive({
    searchText: '',
    field: 'all',
    loading: false,
    searched: false,
    error: null as unknown,
    books: [] as Book[],
    total: 0,
    page: 1,
});

const selected = ref<Book | null>(null);

// 주소(?q=&field=&page=)가 검색 상태. 뒤로 가기·공유해도 같은 결과
const load = async () => {
    const q = String(route.query.q ?? '');
    state.searchText = q;
    state.field = FIELDS.some((f) => f.value === route.query.field) ? String(route.query.field) : 'all';
    state.page = Math.max(1, Number(route.query.page) || 1);

    if (!q) {
        state.books = [];
        state.total = 0;
        state.searched = false;
        state.error = null;
        return;
    }

    state.loading = true;
    state.error = null;
    try {
        const res = await BookApi.list({ q, field: state.field, page: state.page, size: PAGE_SIZE });
        state.books = res.items;
        state.total = res.total;
        state.searched = true;
    } catch (error) {
        state.error = error;
        state.books = [];
        state.total = 0;
    } finally {
        state.loading = false;
    }
};

const onSearch = () => {
    const q = state.searchText.trim();
    router.push({ query: { q: q || undefined, field: state.field === 'all' ? undefined : state.field } });
};

const onPage = (page: number) => {
    router.push({ query: { ...route.query, page } });
    window.scrollTo({ top: 0 });
};

watch(() => route.query, load, { immediate: true });
</script>

<template>
    <div class="book-search page">
        <div class="container">
            <PageTitle title="도서 검색" desc="찾으시는 책의 정보를 입력하시고 검색하세요." />
            <form class="search-bar" @submit.prevent="onSearch">
                <select v-model="state.field" class="form-select" aria-label="검색 항목">
                    <option v-for="f in FIELDS" :key="f.value" :value="f.value">{{ f.text }}</option>
                </select>
                <input v-model="state.searchText" type="search" class="form-control" placeholder="책 이름, 저자, 출판사 등 입력"
                    enterkeyhint="search" />
                <button type="submit" class="btn-search">
                    <img src="/assets/images/common.search.white.svg" alt="검색" />
                </button>
            </form>

            <div class="results">
                <LoadError v-if="state.error && !state.loading" :error="state.error" @retry="load" />
                <template v-else-if="state.searched || state.loading">
                    <div class="toolbar">
                        <div class="count">검색 결과 <b>{{ state.total.toLocaleString() }}</b>건</div>
                    </div>
                    <BookRows :books="state.books" :loading="state.loading" @select="selected = $event" />
                    <Pagination :page="state.page" :size="PAGE_SIZE" :total="state.total" @change="onPage" />
                </template>
                <div v-else class="empty">띄어쓰기 없이 검색해도 찾아 드려요. 예) 소년이온다</div>
            </div>
        </div>
        <BookSheet :book="selected" @close="selected = null" />
    </div>
</template>

<style lang="scss" scoped>
.book-search {
    .results {
        margin-top: var(--px30);
    }
}
</style>
