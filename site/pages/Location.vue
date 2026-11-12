<script setup lang="ts">
import PageTitle from '@site/components/PageTitle.vue';

const address = '서울특별시 은평구 은평로10길 17(응암동 99-45) 2층 그루터기작은도서관';

const copyAddress = async () => {
    try {
        await navigator.clipboard.writeText(address);
        alert('주소가 클립보드에 복사되었습니다.');
    } catch (err) {
        console.error('복사 실패:', err);
        alert('복사에 실패했습니다.');
    }
};
</script>

<template>
    <div class="info-location">
        <div class="container">
            <PageTitle title="오시는 길" desc="도서관으로 찾아오시는 방법을 안내합니다." />
            <div class="wrapper">
                <div class="info-boxes">
                    <div class="item address">
                        <div class="header">
                            <img src="/assets/images/page.location.address.svg" alt="주소" loading="lazy" />
                            <span class="label">주소</span>
                        </div>
                        <div class="content">
                            <span>{{ address }}</span>
                            <div class="acts">
                                <span class="copy btn" role="button" @click="copyAddress">주소 복사</span>
                                <a class="naver btn"
                                    href="https://m.place.naver.com/place/1602845246/location?filter=location&selected_place_id=1602845246"
                                    target="_blank">네이버 지도</a>
                                <a class="kakao btn" href="https://place.map.kakao.com/50649459"
                                    target="_blank">카카오맵</a>
                            </div>
                        </div>
                    </div>
                    <div class="item tel">
                        <div class="header">
                            <img src="/assets/images/page.location.tel.svg" alt="전화" loading="lazy" />
                            <span class="label">전화</span>
                        </div>
                        <div class="content">
                            <div class="acts">
                                <a href="tel:07087791340">070-8779-1340</a>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="map-container">
                    <div class="map-wrapper">
                        <iframe frameborder="0"
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3161.1202091187947!2d126.92402188465577!3d37.599329800634614!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x357c983984d35137%3A0x59265023472acc58!2z7ISc7Jq47Yq567OE7IucIOydgO2Pieq1rCDsnYDtj4nroZwxMOq4uCAxNw!5e0!3m2!1sko!2skr!4v1443926615519"
                            style="border: 0px;"></iframe>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.info-location {
    padding: var(--px20) 0 0;

    .container {
        .wrapper {
            display: flex;
            flex-direction: column;
            gap: var(--px24);

            .info-boxes {
                display: grid;
                grid-template-columns: 1fr var(--px285);
                gap: var(--px16);

                .item {
                    display: flex;
                    flex-direction: column;
                    gap: var(--px16);
                    padding: var(--px28);
                    background: #fff;
                    border: var(--px1) solid var(--color-border);
                    border-radius: var(--px20);

                    .header {
                        display: flex;
                        align-items: center;
                        gap: var(--px12);

                        img {
                            box-sizing: content-box;
                            width: var(--px24);
                            height: var(--px24);
                            padding: var(--px10);
                            border-radius: 50%;
                            background: var(--color-tag);
                        }

                        .label {
                            font-size: var(--px14);
                            font-weight: 700;
                            letter-spacing: 0.08em;
                            color: var(--color-point);
                        }
                    }

                    .content {
                        display: flex;
                        flex-direction: column;
                        gap: var(--px16);
                        font-size: var(--px20);
                        font-weight: 600;
                        line-height: 1.5;
                        word-break: keep-all;

                        a {
                            color: inherit;
                            text-decoration: none;
                        }

                        .acts {
                            display: flex;
                            flex-wrap: wrap;
                            gap: var(--px8);

                            .btn {
                                display: inline-flex;
                                align-items: center;
                                justify-content: center;
                                height: var(--px36);
                                padding: 0 var(--px16);
                                border-radius: var(--px18);
                                font-size: var(--px14);
                                font-weight: 600;
                                color: #fff;
                                cursor: pointer;
                                transition: opacity var(--transition-time), transform .15s ease;

                                &.copy {
                                    background: var(--color-point);
                                }

                                &.naver {
                                    background: #03ca5b;
                                }

                                &.kakao {
                                    background: #f2da00;
                                    color: #191a1d;
                                }

                                &:hover {
                                    opacity: 0.85;
                                    transform: translateY(calc(-1 * var(--px2)));
                                }
                            }
                        }
                    }

                    &.tel {
                        color: #fff;
                        background: linear-gradient(135deg, var(--color-point), #1b2a73);
                        border-color: transparent;

                        .header {
                            img {
                                background: rgba(255, 255, 255, 0.18);
                                filter: brightness(0) invert(1);
                            }

                            .label {
                                color: rgba(255, 255, 255, 0.75);
                            }
                        }

                        .content .acts a {
                            font-size: var(--px26);
                            font-weight: 800;
                            letter-spacing: -0.5px;
                            color: #fff;
                        }
                    }
                }
            }

            .map-container {
                .map-wrapper {
                    position: relative;
                    width: 100%;
                    padding-top: calc(100% / 16 * 9 / 2);
                    background: #e5e3df;
                    border: var(--px1) solid var(--color-border);
                    border-radius: var(--px20);
                    overflow: hidden;

                    iframe {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                    }
                }
            }
        }
    }

    @media(max-width: 767px) {
        padding-top: var(--px27);

        .container .wrapper {
            gap: var(--px16);

            .info-boxes {
                grid-template-columns: 1fr;

                .item {
                    padding: var(--px20);
                    border-radius: var(--px16);

                    .content {
                        font-size: var(--px17);

                        .acts .btn {
                            flex: 1;
                        }
                    }
                }
            }

            .map-container .map-wrapper {
                padding-top: calc(100% / 4 * 3);
                border-radius: var(--px16);
            }
        }
    }
}
</style>
