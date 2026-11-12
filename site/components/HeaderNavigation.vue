<script lang="ts" setup>
import { useRoute } from 'vue-router';
import menus from '@site/definitions/menus';
import type { Menu } from '@site/types/menu';
import Anchor from './Anchor.vue';

const route = useRoute();

const visibleMenus = menus;

const isActive = (menu: Menu) => {
    const checkPath = (path: string) => {
        return path === '/' ? route.path === path : route.path.startsWith(path);
    };

    if (checkPath(menu.url)) {
        return true;
    }

    if (menu.children && menu.children.length > 0) {
        return menu.children.some(child => checkPath(child.url));
    }

    return false;
}
</script>

<template>
    <div class="header-navigation">
        <ul class="items">
            <li v-for="m1 in visibleMenus" :key="m1.url" class="item">
                <Anchor :url="m1.url" :target="m1.target" :class="{ active: isActive(m1) }">
                    <span class="value">{{ m1.title }}</span>
                </Anchor>
                <ul v-if="m1.children && m1.children.length > 0" class="submenus">
                    <li v-for="m2 in m1.children" :key="m2.url" class="submenu-item">
                        <router-link :to="m2.url" :class="{ active: isActive(m2) }">
                            {{ m2.title }}
                        </router-link>
                    </li>
                </ul>
            </li>
        </ul>
    </div>
</template>

<style lang="scss" scoped>
.header-navigation {
    .items {
        display: flex;
        gap: var(--px30);
        list-style: none;
        margin: 0;
        padding: 0;

        .item {
            position: relative;

            >a {
                text-decoration: none;
                padding: var(--px8) 0;
                display: block;

                .value {
                    font-size: var(--px18);
                    position: relative;
                    padding: 0 var(--px2);

                    img {
                        height: var(--px22);
                    }
                }

                &:hover {
                    opacity: 0.76;
                }

                &.active {
                    .value {
                        font-weight: 600;
                        opacity: 1;
                    }
                }
            }

            .submenus {
                display: none;
                position: absolute;
                top: 100%;
                left: var(--px-18);
                background: #fff;
                flex-direction: column;
                list-style: none;
                margin: 0;
                padding: 0;
                min-width: var(--px150);
                border: var(--px1) solid var(--color-border-light);
                border-radius: var(--px4);
                z-index: 10;

                .submenu-item {
                    a {
                        display: block;
                        padding: var(--px10) var(--px20);
                        text-decoration: none;
                        font-size: var(--px16);

                        &:hover {
                            background-color: var(--color-background);
                        }

                        &.active {
                            font-weight: 600;
                        }
                    }
                }
            }

            &:hover {
                .submenus {
                    display: flex;
                }
            }
        }
    }

    @media(max-width: 767px) {
        .items {
            gap: 0;
            flex-direction: column;
            padding: var(--px30) 0;
            width: 100%;
            gap: var(--px20);

            .item {
                >a {
                    display: flex;
                    align-items: center;
                    gap: var(--px11);
                    padding: 0;

                    .value {
                        padding: 0;
                    }
                }

                .submenus {
                    display: flex;
                    position: relative;
                    top: 0;
                    left: 0;
                    padding: var(--px10) 0 0 0;
                    min-width: auto;
                    gap: var(--px8);
                    flex-direction: column;
                    border: 0;
                    border-radius: 0;
                    margin-left: var(--px11);

                    .submenu-item {
                        padding: 0 0 0 var(--px20);
                        position: relative;

                        a {
                            padding: 0;

                            &:hover {
                                background: transparent;
                                opacity: 0.76;
                            }

                            &.active {
                                color: rgba(0, 0, 0, 1);
                            }
                        }

                        &:before {
                            content: "";
                            display: block;
                            position: absolute;
                            top: var(--px11);
                            left: 0;
                            width: var(--px12);
                            height: var(--px1);
                            border-top: var(--px1) dashed var(--color-default);
                        }
                    }

                    &:before {
                        content: "";
                        display: block;
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: var(--px1);
                        height: calc(100% - var(--px15));
                        border-left: var(--px1) dashed var(--color-default);
                    }
                }
            }
        }
    }
}
</style>
