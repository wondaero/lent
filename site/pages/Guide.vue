<script setup lang="ts">
import PageTitle from '@site/components/PageTitle.vue';
</script>

<template>
    <div class="info-guide">
        <div class="container">
            <PageTitle title="이용 안내" desc="관내 열람은 회원/비회원 구분없이 누구나 가능하며 도서 대출과 다양한 도서관 서비스를 이용하기 위해서는 회원에 가입하여야 합니다." />
            <div class="content">
                <div class="membership-cards">
                    <div class="card">
                        <div class="card-content">
                            <div class="icon">
                                <img src="/assets/images/page.guide.seoul.svg" alt="서울 거주 시민" loading="lazy" />
                            </div>
                            <p class="description">서울 거주 시민</p>
                        </div>
                        <div class="btn-card">회원가입 자격</div>
                    </div>
                    <div class="card">
                        <div class="card-content">
                            <div class="icon">
                                <img src="/assets/images/page.guide.form.svg" alt="가입 신청서 작성" loading="lazy" />
                            </div>
                            <p class="description">가입 신청서 작성</p>
                        </div>
                        <div class="btn-card">회원가입 방법</div>
                    </div>
                    <div class="card">
                        <div class="card-content">
                            <div class="icon">
                                <img src="/assets/images/page.guide.loan.svg" alt="최대 5권 대출 가능(2주)" loading="lazy" />
                            </div>
                            <p class="description">최대 5권 대출 가능(2주)</p>
                        </div>
                        <div class="btn-card">회원 혜택 1</div>
                    </div>
                    <div class="card">
                        <div class="card-content">
                            <div class="icon">
                                <img src="/assets/images/page.guide.service.svg" alt="다양한 서비스 이용 가능" loading="lazy" />
                            </div>
                            <p class="description">다양한 서비스 이용 가능</p>
                        </div>
                        <div class="btn-card">회원 혜택 2</div>
                    </div>
                </div>
                <div class="usage-time">
                    <PageTitle title="이용 시간" />
                    <div class="timeline-wrapper">
                        <div class="timelines">
                            <div class="timeline">
                                <div class="item">
                                    <p class="day">월요일</p>
                                </div>
                                <div class="line"></div>
                                <div class="item">
                                    <p class="day">금요일</p>
                                </div>
                            </div>
                            <div class="label">
                                <p>도서관 <b>이용이 가능</b>해요.</p>
                            </div>
                        </div>
                        <div class="timelines">
                            <div class="timeline">
                                <div class="item">
                                    <p class="day">토요일</p>
                                </div>
                                <div class="line"></div>
                                <div class="item me-2">
                                    <p class="day">일요일/공휴일/도서관이 지정한 날</p>
                                </div>
                            </div>
                            <div class="label">
                                <p>도서관 <b>휴관일</b>이에요.</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="usage-rules">
                    <PageTitle title="이용 수칙" />
                    <ul class="rules-list">
                        <li>
                            <span>1.</span>
                            <span>흡연, 음주, 잡담 등 다른 사람에게 방해가 되는 행위는 하지 않습니다.(휴대전화는 진동으로)</span>
                        </li>
                        <li>
                            <span>2.</span>
                            <span>음식물은 가급적 밖에서 드시고 입장해 주세요.</span>
                        </li>
                        <li>
                            <span>3.</span>
                            <span>읽은 책은 책꽂이에 정리해 주세요. (14세 미만의 어린이는 읽은 책을 임시 보관 꽂이에 놓아주세요.)</span>
                        </li>
                        <li>
                            <span>4.</span>
                            <span>비치된 도서는 관내에서만 열람 가능하며 도서 대출을 하지 않는 경우에는 절대 관외로 유출하지 않습니다.</span>
                        </li>
                        <li>
                            <span>5.</span>
                            <span>도서 대출 시 반납 기한을 꼭 지켜주세요.</span>
                        </li>
                        <li>
                            <span>6.</span>
                            <span>개인정보 변경 시 도서관으로 꼭 연락해 주세요.</span>
                        </li>
                        <li>
                            <span>7.</span>
                            <span>대출 후 연체된 날 수만큼 대출이 불가합니다.</span>
                        </li>
                        <li>
                            <span>8.</span>
                            <span>도서관의 자료, 물품 및 기타 시설물은 파손하거나 훼손하지 않습니다.</span>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.info-guide {
    padding: var(--px20) 0 0;

    >.container {
        .content {
            display: flex;
            flex-direction: column;
            gap: var(--px60);

            .membership-cards {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: var(--px16);

                .card {
                    display: flex;
                    flex-direction: column-reverse;
                    background: #fff;
                    border: var(--px1) solid var(--color-border);
                    border-radius: var(--px20);
                    overflow: hidden;
                    transition: transform .2s ease, box-shadow .2s ease;

                    &:hover {
                        transform: translateY(calc(-1 * var(--px4)));
                        box-shadow: 0 var(--px12) var(--px28) rgba(44, 65, 152, 0.15);
                    }

                    .card-content {
                        padding: var(--px10) var(--px20) var(--px28);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: var(--px16);

                        .icon {
                            width: var(--px120);
                            height: var(--px120);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 50%;
                            background: var(--color-tag);

                            img {
                                width: 60%;
                                height: 60%;
                                object-fit: contain;
                            }
                        }

                        .description {
                            margin: 0;
                            font-size: var(--px17);
                            font-weight: 600;
                            line-height: 1.5;
                            text-align: center;
                            color: var(--color-default);
                            word-break: keep-all;
                        }
                    }

                    .btn-card {
                        padding: var(--px20) var(--px20) var(--px10);
                        font-size: var(--px13);
                        font-weight: 700;
                        letter-spacing: 0.04em;
                        color: var(--color-point);
                        text-align: center;
                    }
                }
            }

            .usage-time {
                .timeline-wrapper {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--px16);

                    .timelines {
                        display: flex;
                        flex-direction: column;
                        gap: var(--px20);
                        padding: var(--px28);
                        border-radius: var(--px20);
                        border: var(--px1) solid var(--color-border);
                        background: #fff;

                        &:first-child {
                            background: linear-gradient(135deg, var(--color-point), #1b2a73);
                            border-color: transparent;

                            .timeline .item .day {
                                color: #fff;
                            }

                            .timeline .line {
                                border-top-color: rgba(255, 255, 255, 0.5);
                            }

                            .label {
                                background: rgba(255, 255, 255, 0.16);
                                color: #fff;
                            }
                        }

                        .timeline {
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                            gap: var(--px10);

                            .item .day {
                                margin: 0;
                                font-size: var(--px18);
                                font-weight: 700;
                                color: var(--color-default);
                                white-space: nowrap;
                            }

                            .line {
                                flex: 1;
                                border-top: var(--px2) dashed var(--color-border);
                            }
                        }

                        .label {
                            padding: var(--px14) var(--px20);
                            border-radius: var(--px12);
                            background: var(--color-background);
                            text-align: center;

                            p {
                                margin: 0;
                                font-size: var(--px16);
                                color: inherit;

                                b {
                                    font-weight: 800;
                                }
                            }
                        }
                    }
                }
            }

            .usage-rules {
                .rules-list {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: var(--px12);

                    li {
                        display: flex;
                        align-items: flex-start;
                        gap: var(--px14);
                        padding: var(--px18) var(--px20);
                        border-radius: var(--px14);
                        background: var(--color-background);
                        color: var(--color-default);
                        line-height: 1.6;
                        word-break: keep-all;

                        span:first-child {
                            flex-shrink: 0;
                            width: var(--px28);
                            height: var(--px28);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            border-radius: 50%;
                            background: var(--color-point);
                            color: #fff;
                            font-size: var(--px13);
                            font-weight: 700;
                        }
                    }
                }
            }
        }
    }

    @media(max-width: 991px) {
        >.container .content {
            .membership-cards {
                grid-template-columns: 1fr 1fr;
            }

            .usage-time .timeline-wrapper {
                grid-template-columns: 1fr;
            }
        }
    }

    @media(max-width: 767px) {
        padding-top: var(--px27);

        >.container .content {
            gap: var(--px40);

            .membership-cards {
                gap: var(--px12);

                .card {
                    border-radius: var(--px16);

                    .card-content {
                        padding: var(--px6) var(--px12) var(--px20);

                        .icon {
                            width: var(--px80);
                            height: var(--px80);
                        }

                        .description {
                            font-size: var(--px15);
                        }
                    }

                    .btn-card {
                        padding-top: var(--px16);
                    }
                }
            }

            .usage-time .timeline-wrapper .timelines {
                padding: var(--px20);

                .timeline .item .day {
                    font-size: var(--px15);
                    white-space: normal;
                }
            }

            .usage-rules .rules-list {
                grid-template-columns: 1fr;
            }
        }
    }
}
</style>
