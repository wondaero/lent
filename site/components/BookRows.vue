<script lang="ts" setup>
import { bookStatusLabel, formatDate } from '@site/libs/format';
import { className } from '@site/libs/callNumber';
import type { Book } from '@site/types/models';

// 도서 검색·신간 목록 (공개 화면)
defineProps<{ books: Book[]; loading: boolean; showDate?: boolean }>();
const emit = defineEmits<{ select: [book: Book] }>();
</script>

<template>
    <div class="book-rows">
        <div v-if="loading" class="rows">
            <div v-for="i in 5" :key="i" class="row-item">
                <div class="main">
                    <div class="skeleton" style="width: 60%"></div>
                    <div class="skeleton mt-2" style="width: 35%"></div>
                </div>
            </div>
        </div>
        <div v-else-if="books.length" class="rows">
            <div v-for="book in books" :key="book.id" class="row-item clickable" @click="emit('select', book)">
                <div class="main">
                    <div class="title">{{ book.title }}</div>
                    <div class="sub">
                        <span class="cls">{{ className(book.classNo) }}</span>
                        {{ [book.author, book.publisher].filter(Boolean).join(' · ') }}
                    </div>
                </div>
                <div class="side">
                    <span class="call d-none d-md-inline">{{ book.callNumber }}</span>
                    <span v-if="showDate" class="d-none d-md-inline">{{ formatDate(book.createdAt) }}</span>
                    <span class="tag" :class="bookStatusLabel(book).tone">{{ bookStatusLabel(book).text }}</span>
                </div>
            </div>
        </div>
        <div v-else class="empty">
            <slot name="empty">검색 결과가 없어요.</slot>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.book-rows {
    .cls {
        display: inline-block;
        margin-right: var(--px4);
        color: var(--color-point);
        font-weight: 600;
    }

    .call {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: var(--px13);
    }
}
</style>
