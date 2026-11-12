<script setup lang="ts">
</script>

<template>
    <div class="ready">
        <div class="container">
            <div class="wrapper">
                <div class="image">
                    <img src="/assets/images/page.catch.svg" alt="찾을 수 없음" loading="lazy" />
                </div>
                <div class="texts">
                    <div class="text">
                        <span>이 페이지는 </span>
                        <b>존재하지 않습니다.</b>
                    </div>
                    <div class="text en">
                        This page does not exist.
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.ready {
    padding-top: var(--px30);

    >.container>.wrapper {
        display: flex;
        justify-content: center;
        flex-direction: column;
        align-items: center;
        gap: var(--px30);

        .image {
            img {
                height: var(--px200)
            }
        }

        .texts {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: var(--px5);

            .text {
                font-size: var(--px24);
                text-align: center;

                &.en {
                    font-size: var(--px18);
                }
            }
        }
    }

    @media(max-width: 767px) {}
}
</style>
