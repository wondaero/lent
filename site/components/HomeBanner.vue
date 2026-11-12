<script setup lang="ts">
</script>

<template>
    <div class="home-banner">
        <div class="container">
            <div class="wrapper">
                <div class="inner">
                    <div class="top left side">
                        <div class="bar"></div>
                        <div class="text">THIS LIBRARY WAS BUILT IN</div>
                        <img class="year" src="/assets/images/component.home.banner.year.svg" alt="2022" />
                    </div>
                    <div class="image">
                        <img src="/assets/images/page.home.people.svg" loading="lazy" />
                    </div>
                    <div class="top right side">
                        <div class="bible">JOHN 13:34</div>
                        <div class="text">
                            A new commandment I give unto you,
                            <br />
                            That ye love one another;
                            <br />
                            as I have loved you,
                            <br />
                            that ye also love one another.
                        </div>
                    </div>
                    <div class="bottom right side">
                        <router-link to="/location" class="map" title="오시는 길">
                            <img src="/assets/images/component.home.banner.position.svg" alt="지도" loading="lazy" />
                        </router-link>
                        <router-link to="/intro" class="quick" title="도서관 소개">
                            <img src="/assets/images/component.home.banner.quick.svg" alt="바로가기" loading="lazy" />
                        </router-link>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.home-banner {
    .container {
        .wrapper {
            background: #f4f5f9;
            border-radius: var(--px6);
            padding: var(--px40) var(--px50);

            .inner {
                position: relative;
                display: flex;
                flex-direction: column;
                gap: var(--px21);
                align-items: center;

                .side {
                    position: absolute;

                    &.top {
                        top: 0;

                        &.left {
                            left: 0;

                            .bar {
                                width: var(--px190);
                                height: var(--px28);
                                background: #232121;
                            }

                            .text {
                                position: absolute;
                                left: 0;
                                top: var(--px50);
                                width: fit-content;
                                writing-mode: sideways-lr;
                                white-space: nowrap;
                            }

                            .year {
                                position: absolute;
                                left: var(--px35);
                                top: var(--px50);
                            }
                        }

                        &.right {
                            display: flex;
                            flex-direction: column;
                            justify-content: flex-end;
                            align-items: flex-end;
                            right: 0;
                            text-align: right;
                            gap: var(--px15);

                            .bible {
                                font-size: var(--px24);
                                font-weight: 800;
                            }
                        }
                    }

                    &.bottom {
                        bottom: 0;

                        &.right {
                            right: 0;
                            display: flex;
                            flex-direction: column;
                            gap: 12px;

                            a {
                                width: var(--px64);
                                height: var(--px64);
                                border-radius: 50%;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                background: #000;

                                &.map {
                                    background: var(--color-point);

                                    img {
                                        height: var(--px33);
                                    }
                                }

                                &.quick {
                                    background: #F183A6;

                                    img {
                                        height: var(--px27);
                                    }
                                }
                            }
                        }
                    }
                }

                .image {
                    text-align: center;

                    img {
                        height: var(--px470);
                    }
                }
            }
        }
    }

    @media(max-width:1199px) {
        .container .wrapper {
            padding: var(--px40) var(--px20);

            .inner .side {
                display: none !important;
            }
        }
    }

    @media(max-width:767px) {
        .container {
            padding-left: 0;
            padding-right: 0;

            .wrapper {
                border-radius: 0;
                padding-left: var(--px15);
                padding-right: var(--px15);

                .inner {
                    .image img {
                        height: auto;
                        width: 100%;
                    }
                }
            }
        }
    }
}
</style>
