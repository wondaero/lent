<script setup lang="ts">
import { reactive } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const state = reactive({
    searchText: ''
});

const onSearch = () => {
    router.push({ path: '/search', query: { q: state.searchText.trim() || undefined } });
};
</script>

<template>
    <section class="home-search">
        <div class="container">
            <div class="head">
                <div class="icon">
                    <img src="/assets/images/componnet.home.search.book.svg" alt="" loading="lazy" />
                </div>
                <h2 class="title">도서 검색</h2>
                <p class="subtitle">찾으시는 책이 있으신가요?</p>
            </div>
            <form class="core" @submit.prevent="onSearch">
                <input type="text" v-model="state.searchText" placeholder="책 이름, 저자, 출판사 등 입력"
                    aria-label="도서 검색어" />
                <button type="submit" class="btn">
                    <img src="/assets/images/common.search.white.svg" alt="" loading="lazy" />
                    <span>검색</span>
                </button>
            </form>
        </div>
    </section>
</template>

<style lang="scss" scoped>
.home-search {
    width: 100%;
    padding: var(--px60) 0;
    background: linear-gradient(180deg, var(--color-tag) 0%, #fff 100%);

    .container {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--px24);
    }

    .head {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--px8);
        text-align: center;

        .icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: var(--px64);
            height: var(--px64);
            border-radius: 50%;
            background: #fff;
            box-shadow: 0 8px 24px rgba(44, 65, 152, 0.16);

            img {
                width: var(--px24);
                height: var(--px28);
            }
        }

        .title {
            margin: var(--px8) 0 0;
            font-size: var(--px32);
            font-weight: 700;
        }

        .subtitle {
            margin: 0;
            font-size: var(--px18);
            color: var(--color-secondary);
        }
    }

    .core {
        display: flex;
        width: 100%;
        height: var(--px80);
        border-radius: 999px;
        background: #fff;
        border: 2px solid transparent;
        box-shadow: 0 12px 40px rgba(44, 65, 152, 0.16);
        overflow: hidden;
        transition: border-color var(--transition-time);

        &:focus-within {
            border-color: var(--color-point);
        }

        input {
            flex: 1;
            min-width: 0;
            padding: 0 var(--px32);
            border: 0;
            background: transparent;
            font-size: var(--px18);
            outline: none;

            &::placeholder {
                color: #999;
            }
        }

        .btn {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: var(--px10);
            padding: 0 var(--px40);
            border: 0;
            background: var(--color-point);
            color: #fff;
            font-size: var(--px18);
            font-weight: 600;
            cursor: pointer;
            transition: filter var(--transition-time);

            img {
                width: var(--px22);
                height: var(--px22);
            }

            &:hover {
                filter: brightness(1.12);
            }
        }
    }

    @media (max-width: 767px) {
        padding: var(--px36) 0;

        .head .title {
            font-size: var(--px26);
        }

        .core {
            height: var(--px60);

            input {
                padding: 0 var(--px20);
                font-size: var(--px16);
            }

            .btn {
                padding: 0 var(--px20);

                span {
                    display: none;
                }
            }
        }
    }
}
</style>
