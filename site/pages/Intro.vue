<script setup lang="ts">
import PageTitle from '@site/components/PageTitle.vue';
</script>

<template>
    <div class="info-intro">
        <div class="container">
            <PageTitle title="도서관 소개" desc="그루터기작은도서관을 소개합니다." />
            <div class="content">
                <div class="top">
                    <div class="image">
                        <!-- 실제 관장 사진을 받기 전까지 캐릭터 그림(2026-11-13 사용자 요청) -->
                        <img src="/assets/images/page.intro.leader.svg" alt="도서관장 캐릭터" loading="lazy" />
                    </div>
                    <div class="text">
                        <div class="header">
                            <h2 class="title">도서관 소개 메시지</h2>
                            <p class="quote">"이 작은 도서관을 통해서 우리의 아이들이 올바른 가치관을 품고 나라와 열망을 이루 소중한 세대로 세워지기를 바랍니다."</p>
                        </div>
                        <div class="full">
                            <p>가치관의 홍수 속에서 어떻게 하면 우리의 자녀들이 건강한 정체성과 분별력을 가지고 누군가에게 선한 영향력을 끼치는 리더로 자랄 수 있을까?</p>
                            <p>그루터기작은도서관은 그러한 고민으로부터 시작되었습니다. 그루터기작은도서관은 그루터기를 통해서 싹이 나고 줄기가 생기며 열매가 맺히고 그 열매의 씨가 다시 새로운
                                나무를 자라게 하는 것처럼 이 도서관을 통해서 다음세대와 지역사회가 새롭게 세워지는 것을 목표로 하고 있습니다.</p>
                            <p>그러기 때문에 이 작은 도서관을 통해서 우리의 아이들이 올바른 가치관을 품고 나라와 열방을 이끌 소중한 세대로 세워지기를 바랍니다.</p>
                            <p>또한 그루터기작은도서관은 지역사회의 문화 활동의 중심지가 되기를 원합니다.</p>
                            <p>
                                서로 소통하고 즐거움을 나눌 수 있는 곳이 되기를 원합니다.
                                <br class="d-none d-sm-block">
                                유익한 정보들과 좋은 만남이 있는 곳이 되기를 바랍니다.
                            </p>
                            <div class="signature">
                                <img src="/assets/images/page.intro.message.sign.svg" alt="그루터기작은도서관장 김경태"
                                    loading="lazy" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="history">
                    <PageTitle title="도서관 발자취" />
                    <div class="timeline">
                        <div class="history-card">
                            <div class="header">
                                <h4 class="year">2020년</h4>
                                <p class="date">11월</p>
                                <div class="divider"></div>
                                <p class="description">도서관 설립 논의</p>
                            </div>
                            <div class="image">
                                <img src="/assets/images/page.intro.history.202011.png" alt="작은 도서관 설립 논의"
                                    loading="lazy" />
                            </div>
                        </div>
                        <div class="history-card">
                            <div class="header">
                                <h4 class="year">2020년</h4>
                                <p class="date">12월</p>
                                <div class="divider"></div>
                                <p class="description">환경 준비</p>
                            </div>
                            <div class="image">
                                <img src="/assets/images/page.intro.history.202012.png" alt="환경 준비" loading="lazy" />
                            </div>
                        </div>
                        <div class="history-card">
                            <div class="header">
                                <h4 class="year">2020년</h4>
                                <p class="date">12월 26일</p>
                                <div class="divider"></div>
                                <p class="description">도서관 설립 승인</p>
                            </div>
                            <div class="image">
                                <img src="/assets/images/page.intro.history.20201226.png" alt="도서관 설립 승인"
                                    loading="lazy" />
                            </div>
                        </div>
                        <div class="history-card">
                            <div class="header">
                                <h4 class="year">2021년</h4>
                                <p class="date">3월 15일</p>
                                <div class="divider"></div>
                                <p class="description">개관식</p>
                            </div>
                            <div class="image">
                                <img src="/assets/images/page.intro.history.20210315.png" alt="개관식" loading="lazy" />
                            </div>
                        </div>
                        <div class="history-card">
                            <div class="header">
                                <h4 class="year">2021년</h4>
                                <p class="date">4월 1일</p>
                                <div class="divider"></div>
                                <p class="description">정식 개관</p>
                            </div>
                            <div class="image">
                                <img src="/assets/images/page.intro.history.20210401.png" alt="정식 개관" loading="lazy" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.info-intro {
    padding-top: var(--px20);

    >.container {
        .content {
            display: flex;
            flex-direction: column;
            gap: var(--px70);

            .top {
                display: grid;
                grid-template-columns: var(--px285) 1fr;
                gap: var(--px40);
                align-items: start;

                >.image {
                    position: relative;
                    aspect-ratio: 3 / 4;
                    border-radius: var(--px20);
                    background: var(--color-tag);

                    &::after {
                        content: '';
                        position: absolute;
                        inset: var(--px14) calc(-1 * var(--px14)) calc(-1 * var(--px14)) var(--px14);
                        border-radius: var(--px20);
                        background: linear-gradient(135deg, var(--color-point), var(--color-primary));
                        opacity: 0.14;
                    }

                    img {
                        position: relative;
                        z-index: 1;
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                        object-position: top;
                        border-radius: var(--px20);
                    }
                }

                >.text {
                    display: flex;
                    flex-direction: column;
                    gap: var(--px30);

                    .header {
                        position: relative;
                        padding: var(--px30) var(--px40);
                        border-radius: var(--px16);
                        color: #fff;
                        background: linear-gradient(135deg, var(--color-point) 0%, #1b2a73 100%);
                        display: flex;
                        flex-direction: column;
                        gap: var(--px12);
                        overflow: hidden;

                        .title {
                            margin: 0;
                            font-size: var(--px14);
                            font-weight: 600;
                            letter-spacing: 0.08em;
                            color: rgba(255, 255, 255, 0.7);
                        }

                        .quote {
                            margin: 0;
                            font-size: var(--px20);
                            font-weight: 600;
                            line-height: 1.6;
                            word-break: keep-all;
                            letter-spacing: -0.4px;
                        }
                    }

                    .full {
                        display: flex;
                        flex-direction: column;
                        gap: var(--px14);

                        p {
                            margin: 0;
                            line-height: 1.85;
                            color: var(--color-default);
                            letter-spacing: -0.3px;
                            word-break: keep-all;
                        }

                        .signature {
                            margin-top: var(--px10);
                            padding-top: var(--px20);
                            border-top: var(--px1) solid var(--color-border);
                            text-align: right;
                        }
                    }
                }
            }

            .history {
                .timeline {
                    position: relative;
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: var(--px16);
                    padding-top: var(--px30);

                    &::before {
                        content: '';
                        position: absolute;
                        top: var(--px8);
                        left: 0;
                        right: 0;
                        height: var(--px2);
                        background: var(--color-border);
                    }

                    .history-card {
                        position: relative;
                        display: flex;
                        flex-direction: column;
                        background: #fff;
                        border: var(--px1) solid var(--color-border);
                        border-radius: var(--px16);
                        transition: transform .2s ease, box-shadow .2s ease;

                        &::before {
                            content: '';
                            position: absolute;
                            top: calc(-1 * var(--px30) + var(--px2));
                            left: var(--px20);
                            width: var(--px14);
                            height: var(--px14);
                            box-sizing: border-box;
                            border-radius: 50%;
                            background: #fff;
                            border: var(--px3) solid var(--color-point);
                        }

                        &:hover {
                            transform: translateY(calc(-1 * var(--px4)));
                            box-shadow: 0 var(--px12) var(--px28) rgba(44, 65, 152, 0.15);

                            .image img {
                                filter: none;
                                transform: scale(1.05);
                            }
                        }

                        .header {
                            padding: var(--px20);
                            display: flex;
                            flex-direction: column;
                            gap: var(--px4);
                            flex: 1;

                            .year {
                                margin: 0;
                                font-size: var(--px14);
                                font-weight: 700;
                                color: var(--color-point);
                            }

                            .date {
                                margin: 0;
                                font-size: var(--px20);
                                font-weight: 700;
                                color: var(--color-default);
                            }

                            .divider {
                                width: var(--px24);
                                height: var(--px3);
                                margin: var(--px8) 0;
                                border-radius: var(--px2);
                                background: var(--color-point);
                            }

                            .description {
                                margin: 0;
                                font-size: var(--px15);
                                color: var(--color-secondary);
                                word-break: keep-all;
                            }
                        }

                        .image {
                            height: var(--px140);
                            overflow: hidden;
                            border-radius: 0 0 var(--px16) var(--px16);

                            img {
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                                filter: grayscale(1);
                                transition: filter .3s ease, transform .3s ease;
                            }
                        }
                    }
                }
            }
        }
    }

    @media(max-width: 1199px) {
        >.container .content .history .timeline {
            grid-template-columns: repeat(3, 1fr);
        }
    }

    @media(max-width: 767px) {
        padding-top: var(--px27);

        >.container .content {
            gap: var(--px40);

            .top {
                grid-template-columns: 1fr;
                gap: var(--px30);

                >.image {
                    width: var(--px200);
                    margin: 0 auto;
                    aspect-ratio: 1;
                    border-radius: 50%;

                    &::after,
                    img {
                        border-radius: 50%;
                    }
                }

                >.text .header {
                    padding: var(--px24);

                    .quote {
                        font-size: var(--px17);
                    }
                }
            }

            .history .timeline {
                grid-template-columns: 1fr;
                padding: 0 0 0 var(--px28);
                gap: var(--px20);

                &::before {
                    top: 0;
                    bottom: 0;
                    left: var(--px7);
                    right: auto;
                    width: var(--px2);
                    height: auto;
                }

                .history-card {
                    flex-direction: row;

                    &::before {
                        top: var(--px20);
                        left: calc(-1 * var(--px28));
                    }

                    .header {
                        padding: var(--px16);
                    }

                    .image {
                        width: var(--px120);
                        height: auto;
                        flex-shrink: 0;
                        border-radius: 0 var(--px16) var(--px16) 0;
                    }
                }
            }
        }
    }
}
</style>
