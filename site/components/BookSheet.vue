<script lang="ts" setup>
import { computed } from 'vue';
import BottomSheet from './BottomSheet.vue';
import { bookStatusLabel, formatDate } from '@site/libs/format';
import { classDetailName } from '@site/libs/callNumber';
import type { Book } from '@site/types/models';

// 도서 검색·신간 목록에서 책을 누르면 여는 상세 시트
const props = defineProps<{ book: Book | null }>();
const emit = defineEmits<{ close: [] }>();

const status = computed(() => props.book ? bookStatusLabel(props.book) : null);
</script>

<template>
    <BottomSheet :open="!!book" title="도서 정보" @close="emit('close')">
        <div v-if="book" class="book-sheet">
            <div class="head">
                <div class="title">{{ book.title }}</div>
                <span v-if="status" class="tag" :class="status.tone">{{ status.text }}</span>
            </div>
            <dl class="info-list">
                <template v-if="book.seriesTitle">
                    <dt>총서</dt>
                    <dd>{{ book.seriesTitle }}<template v-if="book.volume"> ; {{ book.volume }}</template></dd>
                </template>
                <dt>저자</dt>
                <dd>{{ book.author || '-' }}</dd>
                <dt>출판사</dt>
                <dd>{{ book.publisher || '-' }}<template v-if="book.pubYear"> ({{ book.pubYear }})</template></dd>
                <dt>분야</dt>
                <dd>{{ classDetailName(book.classNo) }}</dd>
                <dt>청구기호</dt>
                <dd><b>{{ book.callNumber || '-' }}</b></dd>
                <dt>등록번호</dt>
                <dd>{{ book.regNo }}</dd>
                <template v-if="book.status === 'loaned' && book.dueOn">
                    <dt>반납 예정</dt>
                    <dd>{{ formatDate(book.dueOn) }}</dd>
                </template>
            </dl>
            <p class="notice">책은 도서관에 오셔서 청구기호로 찾으시면 돼요. 대출은 도서관에서 회원증(회원번호)으로 할 수 있어요.</p>
        </div>
    </BottomSheet>
</template>

<style lang="scss" scoped>
.book-sheet {
    .head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--px12);
        margin-bottom: var(--px16);

        .title {
            font-size: var(--px18);
            font-weight: 700;
            line-height: 1.45;
        }

        .tag {
            margin-top: var(--px3);
        }
    }

    .notice {
        margin: var(--px20) 0 0;
        padding: var(--px12) var(--px14);
        border-radius: var(--px8);
        background: var(--color-background);
        font-size: var(--px14);
        color: var(--color-secondary);
    }
}
</style>
