<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { useRouter } from 'vue-router';
import { BoardApi } from '@site/services/api';
import { boardByName } from '@site/definitions/boards';
import { toast } from '@site/composable/useFeedback';
import LoadError from '@site/components/LoadError.vue';
import { useGlobalStore } from '@site/stores/global';
import { formatDate } from '@site/libs/format';
import commonLib from '@site/libs/commonLib';
import type { BoardName, PostDetail } from '@site/types/models';

const props = defineProps<{ board: BoardName; id: string }>();

const router = useRouter();
const globalStore = useGlobalStore();

const definition = computed(() => boardByName(props.board));

const state = reactive({
    loading: true,
    error: null as unknown,
    post: null as PostDetail | null,
});

// 본문은 일반 텍스트(업무 화면 게시판에서 작성) → 특수문자를 바꾼 뒤 주소만 링크로
const contentHtml = computed(() => commonLib.linkify(commonLib.escapeHtml(state.post?.content ?? '')));

const load = async () => {
    state.loading = true;
    state.error = null;
    try {
        const post = await BoardApi.get(Number(props.id));
        // 없는 글·임시저장 글이거나, 주소의 분류가 다르면(공지 번호를 활동 주소로) 목록으로
        if (!post || post.board !== props.board) {
            toast('글을 찾을 수 없어요.', 'error');
            router.replace(definition.value.path);
            return;
        }
        state.post = post;
        globalStore.updateSiteTitle(post.title);
    } catch (error) {
        state.error = error;
        state.post = null;
    } finally {
        state.loading = false;
    }
};

watch(() => props.id, load, { immediate: true });
</script>

<template>
    <div class="board-post page">
        <div class="container">
            <router-link :to="definition.path" class="back">← {{ definition.title }}</router-link>

            <article v-if="state.loading" class="post">
                <div class="skeleton" style="width: 50%; height: 28px"></div>
                <div class="skeleton mt-3" style="height: 160px"></div>
            </article>
            <LoadError v-else-if="state.error" :error="state.error" @retry="load" />
            <article v-else-if="state.post" class="post" :class="{ 'has-photos': state.post.images.length }">
                <header>
                    <h1>{{ state.post.title }}</h1>
                    <div class="meta">
                        <span>{{ formatDate(state.post.publishedAt) }}</span>
                    </div>
                </header>
                <div class="content pre-wrap" v-html="contentHtml"></div>
                <div v-if="state.post.images.length" class="photos">
                    <a v-for="(img, i) in state.post.images" :key="img.url" :href="img.url" target="_blank" rel="noopener">
                        <img :src="img.url" :alt="`${state.post.title} 사진 ${i + 1}`" :width="img.width" :height="img.height" loading="lazy" />
                    </a>
                </div>
            </article>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.board-post {
    .back {
        display: inline-block;
        margin-bottom: var(--px16);
        color: var(--color-secondary);
        text-decoration: none;
        font-size: var(--px15);

        &:hover {
            color: var(--color-default);
        }
    }

    .post {
        border-top: var(--px2) solid var(--color-default);

        header {
            padding: var(--px20) 0 var(--px14);
            border-bottom: var(--px1) solid var(--color-border-light);

            h1 {
                font-size: var(--px22);
                font-weight: 700;
                margin: 0 0 var(--px8);
            }

            .meta {
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: var(--px12);
                color: var(--color-secondary);
                font-size: var(--px14);

                .actions {
                    margin-left: auto;
                    display: flex;
                    gap: var(--px6);
                }
            }
        }

        .content {
            padding: var(--px30) 0 var(--px40);
            min-height: var(--px160);
            font-size: var(--px16);
            line-height: 1.8;
            border-bottom: var(--px1) solid var(--color-border-light);

            :deep(img) {
                max-width: 100%;
                height: auto;
            }

            :deep(p) {
                margin-bottom: var(--px8);
            }
        }
    }

    .photos {
        display: grid;
        gap: var(--px16);
        padding: var(--px24) 0 var(--px40);
        border-bottom: var(--px1) solid var(--color-border-light);

        a {
            display: block;
        }

        img {
            display: block;
            max-width: 100%;
            height: auto;
            margin: 0 auto;
            border-radius: var(--px8);
            background: var(--color-background);
        }
    }

    .post.has-photos .content {
        min-height: 0;
        border-bottom: 0;
        padding-bottom: 0;
    }
}
</style>
