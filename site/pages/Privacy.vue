<script setup lang="ts">
import PageTitle from '@site/components/PageTitle.vue';

// 개인정보처리방침(개인정보 보호법 제30조). 실제 처리 방식(업무 화면·DB 규칙)에 맞춰 쓴 것이라
// 회원 정보 항목·보관 규칙(CLAUDE.md 3절 회원 삭제)을 바꾸면 이 문서도 같이 고친다.
const EFFECTIVE_DATE = '2026년 11월 13일';
</script>

<template>
    <div class="privacy page">
        <div class="container">
            <PageTitle title="개인정보처리방침" desc="그루터기작은도서관은 회원의 개인정보를 소중히 다룹니다." />

            <div class="doc">
                <p class="lead-text">
                    그루터기작은도서관(이하 "도서관")은 「개인정보 보호법」에 따라 이용자의 개인정보를 보호하고, 이와 관련한 고충을
                    신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 둡니다.
                </p>

                <section>
                    <h2>1. 처리하는 개인정보 항목</h2>
                    <ul>
                        <li><b>회원 가입(가입 신청서):</b> 이름, 전화번호, 생년월일, 성별, 주소</li>
                        <li><b>도서관이 부여·생성하는 정보:</b> 회원번호, 대출·반납 기록(대출한 도서, 대출일, 반납 예정일, 반납일), 대출·반납 시 직원이 남기는 메모</li>
                        <li><b>홈페이지:</b> 홈페이지는 회원 가입·로그인 기능이 없으며 이용자에게 개인정보를 입력받지 않습니다. 다만 접속할 때 서비스 제공 업체의 서버에 접속 기록(IP 주소, 접속 일시 등)이 자동으로 남을 수 있습니다.</li>
                    </ul>
                </section>

                <section>
                    <h2>2. 개인정보의 처리 목적</h2>
                    <ul>
                        <li>회원 관리: 회원 확인, 회원증(회원번호) 발급</li>
                        <li>도서 대출·반납·연장 처리와 반납 기한 안내, 연체 도서 반납 요청</li>
                        <li>도서관 운영 통계: 이용 현황 집계(개인을 알아볼 수 없는 형태로만 이용)</li>
                    </ul>
                </section>

                <section>
                    <h2>3. 개인정보의 보유 기간과 파기</h2>
                    <ul>
                        <li>회원 정보는 <b>회원 탈퇴 시까지</b> 보유합니다.</li>
                        <li>탈퇴하면 지체 없이 파기합니다. 대출 기록이 없는 회원은 모든 정보를 삭제합니다.</li>
                        <li>
                            대출 기록이 있는 회원은 도서별 대출 이력 관리를 위해 <b>이름 일부를 가린 형태(예: 홍*동)와 회원번호</b>만 남기고,
                            전화번호·생년월일·성별·주소·메모는 삭제합니다.
                        </li>
                        <li>전자 파일은 복구할 수 없는 방법으로 삭제하고, 종이로 된 가입 신청서는 분쇄하여 파기합니다.</li>
                    </ul>
                </section>

                <section>
                    <h2>4. 만 14세 미만 아동의 개인정보</h2>
                    <p>만 14세 미만 아동이 회원으로 가입할 때에는 법정대리인(보호자)의 동의를 받으며, 법정대리인은 아동의 개인정보 열람·정정·삭제를 요구할 수 있습니다.</p>
                </section>

                <section>
                    <h2>5. 개인정보의 제3자 제공</h2>
                    <p>도서관은 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 법령에 특별한 규정이 있는 경우에는 그에 따릅니다.</p>
                </section>

                <section>
                    <h2>6. 개인정보 처리의 위탁</h2>
                    <div class="table-wrap">
                        <table>
                            <thead>
                                <tr><th>수탁자</th><th>위탁 업무</th></tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Supabase, Inc.</td>
                                    <td>회원·대출 정보를 저장·관리하는 데이터베이스 서비스(데이터는 대한민국 서울 지역 서버에 저장)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h2>7. 이용자의 권리와 행사 방법</h2>
                    <p>
                        이용자(만 14세 미만 아동은 법정대리인)는 언제든지 자신의 개인정보 열람, 정정, 삭제, 처리 정지를 요구할 수 있습니다.
                        도서관을 방문하거나 전화로 요청하시면 본인 확인 후 지체 없이 처리합니다.
                    </p>
                </section>

                <section>
                    <h2>8. 개인정보의 안전성 확보 조치</h2>
                    <ul>
                        <li>회원 정보는 권한이 있는 도서관 직원만 로그인하여 볼 수 있습니다.</li>
                        <li>정보를 주고받을 때는 암호화된 연결(HTTPS)을 사용합니다.</li>
                        <li>홈페이지에는 도서·게시글처럼 공개해도 되는 정보만 보이며, 회원 정보와 대출자 정보는 나오지 않습니다.</li>
                        <li>종이로 된 가입 신청서는 잠금장치가 있는 곳에 보관합니다.</li>
                    </ul>
                </section>

                <section>
                    <h2>9. 개인정보 보호책임자</h2>
                    <dl class="contact">
                        <dt>책임자</dt><dd>그루터기작은도서관장 김경태</dd>
                        <dt>연락처</dt><dd><a href="tel:07087791340">070-8779-1340</a></dd>
                        <dt>주소</dt><dd>서울특별시 은평구 은평로10길 17(응암동 99-45) 2층</dd>
                    </dl>
                </section>

                <section>
                    <h2>10. 권익 침해 구제 방법</h2>
                    <p>개인정보 침해에 대한 신고나 상담이 필요하시면 아래 기관에 문의하실 수 있습니다.</p>
                    <ul>
                        <li>개인정보침해신고센터(한국인터넷진흥원): 국번 없이 118, privacy.kisa.or.kr</li>
                        <li>개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr</li>
                        <li>대검찰청: 국번 없이 1301, www.spo.go.kr</li>
                        <li>경찰청: 국번 없이 182, ecrm.police.go.kr</li>
                    </ul>
                </section>

                <section>
                    <h2>11. 개인정보처리방침의 변경</h2>
                    <p>이 개인정보처리방침은 {{ EFFECTIVE_DATE }}부터 적용됩니다. 내용이 바뀌면 홈페이지를 통해 알려 드립니다.</p>
                </section>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.privacy {
    .doc {
        display: flex;
        flex-direction: column;
        gap: var(--px30);
        max-width: var(--px800);
        margin-top: var(--px30);
        line-height: 1.75;
        word-break: keep-all;
        overflow-wrap: anywhere;
    }

    .lead-text {
        margin: 0;
        padding: var(--px20) var(--px24);
        border-radius: var(--px12);
        background: var(--color-background);
    }

    h2 {
        margin: 0 0 var(--px10);
        font-size: var(--px18);
        font-weight: 700;
    }

    p {
        margin: 0;
    }

    ul {
        margin: 0;
        padding-left: var(--px20);

        li + li {
            margin-top: var(--px4);
        }
    }

    .table-wrap {
        overflow-x: auto;
    }

    table {
        width: 100%;
        border-collapse: collapse;
        font-size: var(--px15);

        th,
        td {
            padding: var(--px10) var(--px12);
            border: var(--px1) solid var(--color-border-light);
            text-align: left;
            vertical-align: top;
        }

        // 수탁자 이름(Supabase, Inc.)이 좁은 화면에서 글자 중간에 끊기지 않게
        td:first-child {
            white-space: nowrap;
            overflow-wrap: normal;
        }

        th {
            background: var(--color-background);
            font-weight: 600;
            white-space: nowrap;
        }
    }

    .contact {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        gap: var(--px6) var(--px20);
        margin: 0;

        dt {
            color: var(--color-secondary);
            font-weight: 400;
        }

        dd {
            margin: 0;
        }

        a {
            color: inherit;
        }
    }

    @media (max-width: 575px) {
        .lead-text {
            padding: var(--px16);
        }

        h2 {
            font-size: var(--px17);
        }
    }
}
</style>
