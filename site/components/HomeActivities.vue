<script setup lang="ts">
import { ref } from 'vue';
import { useInView } from '@site/composable/useInView';
import { formatDate } from '@site/libs/format';
import type { HomeSummary } from '@site/types/models';

// 사진이 있는 최근 활동 글(최대 5개). 칸이 넓어(최대 약 600px) 목록용 작은 사진(400px)은 흐려서 원본(1280px)을 쓴다
defineProps<{ items: HomeSummary['activities'] }>();

const root = ref<HTMLElement | null>(null);
const visible = useInView(root, 0.1);
</script>

<template>
    <section ref="root" class="home-activities" :class="{ visible }">
        <div class="container">
            <header class="head">
                <h2 class="title">OUR <b>ACTIVITIES</b></h2>
                <span class="line"></span>
            </header>
            <div class="grid">
                <router-link v-for="(item, i) in items" :key="item.id" :to="`/activities/${item.id}`" class="item"
                    :class="`n${i + 1}`" :style="{ transitionDelay: `${i * 90}ms` }">
                    <img :src="item.image.url" :alt="item.title" loading="lazy" />
                    <div class="caption">
                        <div class="date">{{ formatDate(item.publishedAt) }}</div>
                        <div class="name">{{ item.title }}</div>
                    </div>
                </router-link>
            </div>
        </div>
    </section>
</template>

<style lang="scss" scoped>
.home-activities {
    .head {
        display: flex;
        align-items: center;
        gap: var(--px20);
        margin-bottom: var(--px24);

        .title {
            margin: 0;
            font-size: var(--px32);
            font-weight: 400;

            b {
                font-weight: 700;
                color: var(--color-point);
            }
        }

        .line {
            flex: 1;
            height: 1px;
            background: var(--color-border);
        }
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(6, 1fr);
        grid-auto-rows: var(--px200);
        gap: var(--px20);
    }

    .item {
        position: relative;
        overflow: hidden;
        border-radius: var(--px16);
        background: #f0f0f0;
        opacity: 0;
        transform: translateY(28px);
        transition: opacity 0.6s ease, transform 0.6s ease, box-shadow var(--transition-time);
        grid-column: span 2;

        &.n1 {
            grid-column: span 3;
            grid-row: span 2;
        }

        &.n2,
        &.n3 {
            grid-column: span 3;
        }

        &.n4 {
            grid-column: span 2;
        }

        &.n5 {
            grid-column: span 4;
        }

        img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            display: block;
            transition: transform 0.6s ease;
        }

        .caption {
            position: absolute;
            inset: auto 0 0 0;
            padding: var(--px40) var(--px20) var(--px18);
            color: #fff;
            background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
            transform: translateY(8px);
            transition: transform var(--transition-time);

            .date {
                font-size: var(--px14);
                opacity: 0.8;
            }

            .name {
                margin-top: var(--px2);
                font-size: var(--px20);
                font-weight: 700;
            }
        }

        &:hover {
            box-shadow: 0 14px 30px rgba(0, 0, 0, 0.18);

            img {
                transform: scale(1.06);
            }

            .caption {
                transform: none;
            }
        }
    }

    &.visible .item {
        opacity: 1;
        transform: none;
    }

    @media (max-width: 991px) {
        .head .title {
            font-size: var(--px28);
        }

        .grid {
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: var(--px160);
            gap: var(--px12);
        }

        .item,
        .item.n1,
        .item.n2,
        .item.n3,
        .item.n4,
        .item.n5 {
            grid-column: span 1;
            grid-row: span 1;
        }

        .item.n1,
        .item.n5 {
            grid-column: span 2;
        }

        .item .caption .name {
            font-size: var(--px16);
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .item {
            opacity: 1;
            transform: none;
            transition: none;
        }
    }
}
</style>
