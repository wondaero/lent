<script lang="ts" setup>
import { onMounted, onUnmounted } from 'vue';
import { useGlobalStore } from '@site/stores/global';
import HeaderNavigation from './HeaderNavigation.vue';

const globalStore = useGlobalStore();

const onLogoClick = () => {
    globalStore.headerDrawerOpen = false;
}

const onDrawerClick = () => {
    globalStore.headerDrawerOpen = !globalStore.headerDrawerOpen;
}

const onClick = (e: Event) => {
    const $elem = (e.target as HTMLElement);
    !$elem.closest(".drawer") && globalStore.headerDrawerOpen && (globalStore.headerDrawerOpen = false);
}

onMounted(() => {
    document.addEventListener("click", onClick);
});

onUnmounted(() => {
    document.removeEventListener("click", onClick);
});
</script>

<template>
    <header ref="rootRef" :class="{ 'drawer-open': globalStore.headerDrawerOpen }">
        <div class="top">
            <div class="container">
                <div class="left section">
                    <router-link to="/" class="logo text-decoration-none" @click="onLogoClick">
                        <img src="/assets/images/common.logo.svg" alt="로고 이미지" loading="lazy" />
                    </router-link>
                    <HeaderNavigation class="desktop-nav" />
                </div>
                <div class="right section">
                    <router-link to="/search" class="search">
                        <img src="/assets/images/common.search.svg" alt="검색" loading="lazy" />
                    </router-link>
                    <div class="drawer" @click="onDrawerClick">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                </div>
            </div>
        </div>
        <nav class="mobile-nav">
            <div class="container">
                <HeaderNavigation />
            </div>
        </nav>
    </header>
</template>

<style lang="scss" scoped>
header {
    background: #fff;
    width: 100%;

    >.top {
        padding: var(--px30) 0;

        >.container {
            display: flex;
            align-items: center;
            justify-content: space-between;

            >.section {
                display: flex;
                align-items: center;

                &.left {
                    align-items: center;
                    gap: var(--px70);

                    >.logo {
                        display: flex;
                        gap: var(--px8);
                        align-items: center;

                        >img {
                            height: var(--px45);
                        }

                        >span {
                            font-weight: 700;
                            font-size: var(--px21);
                            letter-spacing: var(--px-1);
                        }
                    }
                }

                &.right {
                    gap: var(--px5);

                    >.account {
                        display: flex;
                        align-items: center;
                        gap: var(--px2);

                        .icon-btn {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: var(--px40);
                            height: var(--px40);
                            padding: 0;
                            border: 0;
                            border-radius: 50%;
                            background: none;
                            color: var(--color-default);
                            cursor: pointer;
                            transition: background var(--transition-time), color var(--transition-time);

                            svg {
                                width: var(--px22);
                                height: var(--px22);
                                fill: none;
                                stroke: currentColor;
                                stroke-width: 1.8;
                                stroke-linecap: round;
                                stroke-linejoin: round;
                            }

                            &:hover {
                                background: var(--color-tag);
                                color: var(--color-point);
                            }
                        }
                    }

                    >.drawer {
                        display: none;
                        width: var(--px26);
                        height: var(--px22);
                        position: relative;
                        cursor: pointer;
                        flex-direction: column;
                        justify-content: space-between;
                        align-items: flex-end;

                        span {
                            display: block;
                            height: var(--px2);
                            width: 100%;
                            background: #000;
                            border-radius: var(--px1);
                            transition: all var(--transition-time);

                            &:nth-child(1) {
                                width: 76%;
                            }

                            &:nth-child(3) {
                                width: 76%;
                            }
                        }
                    }

                    >.search {
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: var(--px8);
                        transition: opacity var(--transition-time);

                        svg {
                            width: var(--px24);
                            height: var(--px24);
                            color: inherit;
                        }

                        &:hover {
                            opacity: 0.76;
                        }
                    }
                }
            }
        }
    }

    >.mobile-nav {
        display: none;
    }

    @media(max-width: 991px) {
        >.top>.container>.section.left {
            gap: var(--px40);
        }
    }

    @media(max-width: 767px) {
        position: sticky;
        top: 0;
        z-index: 15;
        width: 100%;

        >.top {
            padding: var(--px30) 0;
            border-bottom: var(--px1) solid var(--color-border-light);

            >.container {
                gap: var(--px15);

                >.section {
                    &.left {
                        gap: var(--px15);

                        >.logo img {
                            height: var(--px37);
                        }

                        .desktop-nav {
                            display: none;
                        }
                    }

                    &.right {
                        >.account {
                            display: none;
                        }

                        >.drawer {
                            display: flex;
                        }
                    }
                }
            }
        }

        >.mobile-nav {
            display: block;
            background: #fff;
            position: absolute;
            top: 100%;
            left: 0;
            width: 100%;
            opacity: 0;
            visibility: hidden;
            transition: opacity var(--transition-time), visibility var(--transition-time);
            z-index: 25;

            .mobile-account {
                display: flex;
                align-items: center;
                gap: var(--px16);
                padding: var(--px20) 0 0;
                font-size: var(--px15);

                a,
                button {
                    padding: 0;
                    border: 0;
                    background: none;
                    color: inherit;
                    text-decoration: none;
                }

                .name {
                    font-weight: 600;
                }

                .link {
                    color: var(--color-secondary);
                }
            }
        }
    }

    &.drawer-open {
        @media(max-width: 767px) {
            >.mobile-nav {
                opacity: 1;
                visibility: visible;
            }

            >.top>.container>.section.right {
                >.drawer {
                    height: var(--px26);

                    span {
                        &:nth-child(1) {
                            width: var(--px32);
                            transform: rotate(45deg) translate(var(--px13), var(--px4));
                            margin-right: var(--px2);
                        }

                        &:nth-child(2) {
                            opacity: 0;
                        }

                        &:nth-child(3) {
                            width: var(--px32);
                            transform: rotate(-45deg) translate(var(--px13), var(--px-4));
                            margin-right: var(--px2);
                        }
                    }
                }
            }
        }
    }
}
</style>