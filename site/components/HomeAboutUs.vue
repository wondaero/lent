<script setup lang="ts">
import { ref, watch } from 'vue';
import { useCountUp, useInView } from '@site/composable/useInView';

// 숫자는 실제 회원 수·장서 수(홈에서 받아 넘김). 화면에 보이고 숫자가 도착하면 그때 올라간다
const props = defineProps<{ books: number | null; members: number | null }>();

const root = ref<HTMLElement | null>(null);
const visible = useInView(root);

const { value: memberCount, start: startMembers } = useCountUp(1600);
const { value: bookCount, start: startBooks } = useCountUp(2000);

watch(() => [visible.value, props.books, props.members] as const, ([v, books, members]) => {
    if (!v || books == null || members == null) return;
    startMembers(members);
    startBooks(books);
}, { immediate: true });
</script>

<template>
    <section ref="root" class="home-about-us" :class="{ visible }">
        <div class="container">
            <div class="intro">
                <span class="eyebrow">ABOUT US</span>
                <p class="description">
                    우리의 아이들이
                    <br class="d-block d-sm-none" />
                    <b>올바른 가치관</b>을 품고
                    <br class="d-block d-sm-none" />
                    나라와 열방을 이끌 소중한 세대로
                    <br class="d-block d-sm-none" />
                    세워지기를 원합니다.
                </p>
            </div>
            <div class="stats">
                <div class="stat-card">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-12 9a8 8 0 0 1 16 0" />
                    </svg>
                    <!-- 숫자를 받기 전·받지 못했을 때 0을 보이면 "회원·장서가 없다"로 읽혀서 "-" -->
                    <div class="value">{{ members == null ? '-' : memberCount.toLocaleString() }}</div>
                    <div class="label">전체 회원 수</div>
                </div>
                <div class="stat-card">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5v-16ZM4 21.5A2.5 2.5 0 0 1 6.5 19H20" />
                    </svg>
                    <div class="value">{{ books == null ? '-' : bookCount.toLocaleString() }}</div>
                    <div class="label">관내 비치된 책</div>
                </div>
            </div>
        </div>
    </section>
</template>

<style lang="scss" scoped>
.home-about-us {
    background: linear-gradient(135deg, #2C4198 0%, #4a63c9 100%);
    color: #fff;
    padding: var(--px70) 0;
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.7s ease, transform 0.7s ease;

    &.visible {
        opacity: 1;
        transform: none;
    }

    .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--px50);
    }

    .intro {
        flex: 1;

        .eyebrow {
            display: inline-block;
            padding: var(--px6) var(--px14);
            border: 1px solid rgba(255, 255, 255, 0.5);
            border-radius: 999px;
            font-size: var(--px14);
            letter-spacing: 0.12em;
        }

        .description {
            margin: var(--px20) 0 0;
            font-size: var(--px26);
            line-height: 1.5;

            b {
                box-shadow: inset 0 -0.4em 0 rgba(255, 229, 0, 0.45);
            }
        }
    }

    .stats {
        display: flex;
        gap: var(--px20);
    }

    .stat-card {
        min-width: var(--px230);
        padding: var(--px30);
        border-radius: var(--px16);
        background: rgba(255, 255, 255, 0.12);
        backdrop-filter: blur(6px);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: transform var(--transition-time), background var(--transition-time);

        &:hover {
            transform: translateY(-4px);
            background: rgba(255, 255, 255, 0.18);
        }

        svg {
            width: var(--px32);
            height: var(--px32);
            fill: none;
            stroke: #ffe500;
            stroke-width: 1.8;
            stroke-linecap: round;
            stroke-linejoin: round;
        }

        .value {
            margin-top: var(--px14);
            font-size: var(--px47);
            font-weight: 700;
            font-variant-numeric: tabular-nums;

            small {
                font-size: 0.6em;
                margin-left: 2px;
            }
        }

        .label {
            margin-top: var(--px4);
            font-size: var(--px18);
            opacity: 0.85;
        }
    }

    @media (max-width: 991px) {
        padding: var(--px40) 0;

        .container {
            flex-direction: column;
            align-items: stretch;
            gap: var(--px24);
            text-align: center;
        }

        .intro .description {
            font-size: var(--px22);
        }

        .stats {
            gap: var(--px12);
        }

        .stat-card {
            flex: 1;
            min-width: 0;
            padding: var(--px20) var(--px10);

            .value {
                font-size: var(--px37);
            }

            .label {
                font-size: var(--px15);
            }
        }
    }

    @media (prefers-reduced-motion: reduce) {
        opacity: 1;
        transform: none;
        transition: none;
    }
}
</style>
