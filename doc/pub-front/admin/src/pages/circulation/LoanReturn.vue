<script setup>
import Popup1 from '../../components/Popup1.vue'

import { reactive, ref } from 'vue'

  const state = reactive({
    memberKeyword: '',
    bookCode: '',
    memberList: [],
    bookList: []
  })

const isActivePopup = ref(false);   //팝업 노출 여부


const bookInput = ref(null);



function togglePopup(bool){
    isActivePopup.value = typeof bool === 'boolean' ? bool : !isActivePopup.value; 
}

function closePopup(data){
    togglePopup();
}
function getBookInfo(){
    //api로 유저 정보 가져오기

    console.log(state.bookCode);

    state.bookCode = '';

    state.bookList.push('sample');

    console.log(state.bookList);

    //다 끝나고 focus(안해도 될수도 있음)
}
function getMember(){
    //api로 유저 정보 가져오기
    //유저가 2명 이상일 경우 팝업 띄우기

    console.log(state.memberKeyword);
    
    if(1){
        togglePopup();
    }
}
</script>

<template>
    <main>
        <h2 class="page-title"><span>대여/반납</span></h2>
        <article class="item-form">
            <div class="mb-5px flex align-center justify-between">
                <div class="flex align-center">
                    <label class="flex align-center mr-5px">
                        <strong class="title">도서코드</strong>
                        <input type="text" class="input-form w-175px" ref="bookInput" v-model="state.bookCode" @keyup.enter="getBookInfo()" />
                    </label>
                    <button class="btn-form flex align-center justify-center" @click="getBookInfo()">검색</button>
                </div>
                <div v-if="state.bookList.length">
                    <button class="btn-form w-80px btn-renew mr-5px">일괄 연장</button>
                    <button class="btn-form w-80px btn-return">일괄 반납</button>
                </div>
            </div>
            <hr class="line" />
            <div class="list-field" v-if="state.bookList.length">
                <ul>
                    <li>
                        <div class="sign ing"></div>
                        <div class="book-content">
                            <div class="top">
                                <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                                <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                            </div>
                            <div class="middle">
                                <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                                <div class="right"><strong>대여중</strong>(원대로)</div>
                            </div>
                            <div class="bottom">
                                <div class="left"></div>
                                <div class="right">
                                    <input type="date" class="input-form w-130px" value="2025-09-17" readonly />
                                    <span>~</span>
                                    <input type="date" class="input-form w-130px" value="2025-09-30" />
                                    <button class="btn-form btn-renew">연장</button>
                                    <button class="btn-form">반납</button>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div class="sign over"></div>
                        <div class="book-content">
                            <div class="top">
                                <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                                <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                            </div>
                            <div class="middle">
                                <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                                <div class="right"><strong>연체중</strong>(원대로)</div>
                            </div>
                            <div class="bottom">
                                <div class="left"></div>
                                <div class="right">
                                    <input type="date" class="input-form w-130px" value="2025-09-17" readonly />
                                    <span>~</span>
                                    <input type="date" class="input-form w-130px" value="2025-09-30" />
                                    <button class="btn-form btn-renew">연장</button>
                                    <button class="btn-form">반납</button>
                                </div>
                            </div>
                        </div>
                    </li>
                    <li>
                        <div class="sign"></div>
                        <div class="book-content">
                            <div class="top">
                                <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                                <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                            </div>
                            <div class="middle">
                                <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                                <div class="right"></div>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
            <div class="mb-5px flex align-center justify-between" v-if="state.bookList.length">
                <div class="flex align-center">
                    <label class="flex align-center mr-5px">
                        <strong class="title">대여 회원</strong>
                        <input type="text" v-model="state.memberKeyword" class="input-form w-175px" placeholder="이름/전화번호" @keyup.enter="getMember()" />
                    </label>
                    <button class="btn-form flex align-center justify-center" @click="getMember()">검색</button>
                </div>
                <div>
                    <button class="btn-form w-80px mr-5px">일괄 대여</button>
                </div>
            </div>
        </article>

        <Popup1 @close="closePopup" v-if="isActivePopup" />
    </main>
</template>

<style scoped lang="scss">
    
    .page-title{
        margin: 0 0 10px;
        padding: 0 0 10px;

        span{
            background: linear-gradient(to bottom, transparent 50%, var(--main-green) 0);
        }
    }

    .title{
        width: 80px;
        &.ast:after{
            content: ' *';
            color: #f00;
        }
    }

    .input-form{
        -webkit-appearance: none; /* Safari, Chrome */
        -moz-appearance: none;    /* Firefox */
        appearance: none;         /* 표준 */

        height: 40px;
        border: 1px solid #ddd;
        background: #fcfcfc;
        border-radius: 0;
        padding: 5px 10px;
        box-sizing: border-box;
    }

    .select-form{
        position: relative;

        &:after{
            content: '';
            display: block;
            width: 10px;
            height: 10px;
            border: 5px solid transparent;
            border-top: 5px solid #000;
            position: absolute;
            top: 17px;
            right: 8px;
            box-sizing: border-box;
            pointer-events: none;
        }

        select{
            -webkit-appearance: none; /* Safari, Chrome */
            -moz-appearance: none;    /* Firefox */
            appearance: none;         /* 표준 */

            width: 240px;
            height: 40px;
            border: 1px solid #ddd;
            border-radius: 0;
            padding: 5px 10px;
            box-sizing: border-box;
            background: #fcfcfc;

            cursor: pointer;
        }
    }

    .gender-field{
        label{
            margin-right: 10px;
            display: flex;
            align-items: center;
            cursor: pointer;

            &:last-of-type{
                margin-right: 0;
            }
        }
        input[type="radio"]{
            margin-right: 5px;
        }
    }

    .textarea-form{
        resize: none;
        width: 320px;
        height: 100px;
    }

    .btn-form{
        background: var(--main-green);
        line-height: 40px;
        width: 60px;
        border: 0;
        padding: 0;
        border-radius: 0;
        color: #fff;

        &.btn-renew{
            background: orange;
        }

        &.w-80px{
            width: 80px;
        }
    }

    .line{
        margin: 10px 0;
        border: 0;
        border-top: 1px solid #ddd;
    }

    .list-field{
        ul{
            list-style: none;
            margin: 0;
            padding: 0;
            padding: 10px;

            li{
                padding: 5px 0;
                border-bottom: 1px solid #ddd;
                display: flex;
                align-items: stretch;
                
                &:hover{
                    background: linear-gradient(to right, transparent, var(--main-green), transparent);
                    border-bottom: 1px solid var(--main-green);
                }
                .sign{
                    background: green;
                    // box-shadow: inset 0 0 4px rgba(0, 0, 0, .5);
                    width: 20px;
                    margin-right: 10px;
                    border-radius: 20px;

                    &.ing{
                        background: rgba(255, 200, 0);
                    }
                    &.over{
                        background: #f00;
                    }
                }
                
                .book-content{
                    flex: 1;
                }

                .top{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .middle{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .bottom{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-top: 10px;

                    .right{
                        display: flex;
                        align-items: center;

                        & > *{
                            margin-right: 5px;

                            &:last-child{
                                margin-right: 0;
                            }
                        }

                        input[readonly]{
                            background: #eee;
                        }

                        
                    }
                }
            }
        }
    }
</style>
