<script lang="ts" setup>
import { currentYear } from '@site/definitions/date';
</script>

<template>
    <footer>
        <div class="container">
            <div class="side">
                <span>&copy; {{ currentYear }}. 그루터기작은도서관. All rights reserved.</span>
            </div>
            <div class="side">
                <div class="wrapper">
                    <router-link to="/location" class="address">서울 은평구 은평로10길 17</router-link>
                    <span class="divider"></span>
                    <a href="tel:07087791340" class="phone">070-8779-1340</a>
                </div>
                <span class="divider"></span>
                <router-link to="/privacy" class="privacy">개인정보처리방침</router-link>
            </div>
        </div>
    </footer>
</template>

<style lang="scss" scoped>
footer {
    background: #fff;
    border-top: var(--px1) solid var(--color-border-light);
    padding: var(--px40) 0;
    display: flex;
    align-items: center;

    .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--px20);
        flex-wrap: wrap;

        .side {
            display: flex;
            align-items: center;
            gap: var(--px12);
            color: inherit;

            .divider {
                width: var(--px1);
                height: var(--px14);
                background: #232121;
            }

            >.wrapper {
                display: flex;
                align-items: center;
                gap: var(--px12);

                .divider {
                    display: inline;
                }
            }

            a.freepik,
            a.address,
            a.phone,
            a.privacy {
                color: inherit;
                text-decoration: none;
                transition: all var(--transition-time);

                &:hover {
                    color: inherit;
                    text-decoration: underline;
                }
            }
        }
    }

    @media(max-width: 767px) {
        padding: var(--px20) 0;

        .container {
            flex-direction: column;
            align-items: center;
            gap: var(--px10);
            text-align: center;

            .side {
                flex-direction: column;
                align-items: center;
                gap: var(--px1);

                .divider {
                    display: none;
                }
            }
        }
    }
}
</style>