<script lang="ts" setup>
import Header from '@site/components/Header.vue';
import Footer from '@site/components/Footer.vue';
import Climb from '@site/components/Climb.vue';
import { onMounted, onUnmounted, reactive, useTemplateRef } from 'vue';
import { useGlobalStore } from '@site/stores/global';


const globalStore = useGlobalStore();


const state = reactive({
    climb: false,
    styles: {
        mainPaddingTop: 30,
        mainPaddingBottom: 30,
    }
})

const onScroll = () => {
    state.climb = window.scrollY > 100;
}

const onResize = () => {
    globalStore.setWindowSize(window.innerWidth, window.innerHeight)
}

onResize();

onMounted(() => {
    window.addEventListener("scroll", onScroll);
    window.addEventListener("resize", onResize);
});

onUnmounted(() => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
});
</script>

<template>
    <div class="ground">
        <Header />
        <div class="wrapper" :class="{ cloudy: globalStore.headerDrawerOpen }">
            <main>
                <RouterView />
            </main>
            <Footer />
        </div>
        <Climb :visible="state.climb" />
    </div>
</template>

<style lang="scss" scoped>
.ground {
    >.wrapper {
        position: relative;

        main {
            padding: 0 0 var(--px50);
        }

        &:after {
            content: "";
            display: block;
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            z-index: 10;
            background-color: transparent;
            visibility: hidden;
            transition: background-color var(--transition-time), visibility var(--transition-time);
        }

        &.cloudy:after {
            background-color: rgba(0, 0, 0, 0.5);
            visibility: visible;
        }
    }

    @media(max-width: 767px) {
        >.wrapper main {
            padding-bottom: var(--px30);
        }
    }
}
</style>
