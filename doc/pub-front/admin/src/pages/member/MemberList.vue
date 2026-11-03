<script setup>
import { ref, onMounted, reactive, nextTick } from "vue"
import api from "@/api/axios"
import Pagination from '../../components/Pagination.vue'
import ModalAboutExcel from '../../components/ModalAboutExcel.vue'
import { exportExcel } from '../../utils/excel.js';
import { formatToKST } from '../../utils/common';



// 반응형 변수 (ref)
// const members = ref([]) // 회원 리스트

const memberList = ref([]);
const memberCnt = ref(0);
const isActiveModal = ref(false);   //팝업 노출 여부

const mainContent = ref(null);

const state = reactive({
    formData: {
        keyword: '',
        searchType: 'all',
        filter: 'all',
    
        perPage: 30, //페이지내이션
        curPageIdx: 1   //페이지내이션
    }
})

// onMounted에서 axios 호출
onMounted(async () => {
    getMemberList();
})

async function getMemberList(){
    const res = await api.get('/members', { params: state.formData });
    memberList.value = res.data.memberList;
    memberCnt.value = res.data.membersCnt;

    nextTick(() => {
      if (mainContent.value) mainContent.value.scrollTop = 0;
    });

}

function goPage(page){
    state.formData.curPageIdx = page;
    getMemberList();
}

function toggleModal(bool){
    if(typeof bool === 'boolean'){
        isActiveModal.value = bool;
        return;
    }
    isActiveModal.value = !isActiveModal.value; 
}

async function closeModal(dataType){
    toggleModal();

    if(!dataType) return;

    let listData = memberList.value;

    if(dataType === 'all'){
        const res = await api.get('/members', { params: {...state.formData, all: 'true' }});
        listData = res.data.memberList;
    }
    exportExcel(listData, [
        { header: 'id', key: 'member_id' },
        { header: '이름', key: 'mbr_nm' },
        { header: '전화번호', key: 'mbr_tel' },
        { header: '대여중', key: 'loan_count' },
        { header: '연체중', key: 'is_overdue' },
        { header: '등록일', key: 'reg_dt' },
    ]);
}





</script>
<template>
    <main ref="mainContent">
        <h2 class="page-title"><span>회원 목록</span></h2>
        <article class="search-field">
            <div class="mb-10px flex align-center">
                <label class="select-form mr-10px">
                    <select v-model="state.formData.searchType">
                        <option value="all">통합</option>
                        <option value="name">이름</option>
                        <option value="tel">전화번호</option>
                    </select>
                    <span></span>
                </label>
                <input class="input-form" placeholder="검색어를 입력해주세요." v-model="state.formData.keyword" @keyup.enter="goPage(1)" />
                <button @click="goPage(1)">검색</button>
            </div>
            <div class="btns">
                <div class="tab-ui">
                    <label>
                        <input type="radio" v-model="state.formData.filter" value="all" @change="goPage(1)" />
                        <strong>전체</strong>
                    </label>
                    <label>
                        <input type="radio" v-model="state.formData.filter" value="ing" @change="goPage(1)" />
                        <strong>대여중</strong>
                    </label>
                    <label>
                        <input type="radio" v-model="state.formData.filter" value="over" @change="goPage(1)" />
                        <strong>연체중</strong>
                    </label>
                </div>
                
            </div>
        </article>
        <article class="list-field">
            <div class="list-top">
                <div>총 <strong>{{ memberCnt }}</strong>건</div>
                <div class="btns">
                    <button class="btn-excel" @click="toggleModal()">엑셀 다운로드</button>
                    <label class="select-form">
                        <select v-model="state.formData.perPage" @change="goPage(1)">
                            <option :value="10">10개씩 보기</option>
                            <option :value="20">20개씩 보기</option>
                            <option :value="30">30개씩 보기</option>
                            <option :value="50">50개씩 보기</option>
                            <option :value="80">80개씩 보기</option>
                            <option :value="100">100개씩 보기</option>
                        </select>
                    </label>
                </div>
            </div>
            <ul>
                <li v-for="(item) in memberList" :key="item.member_id">
                    <div class="top">
                        <div class="left">
                            <router-link :to="`/member/${item.member_id}`">{{ item.mbr_nm || '-' }} [{{ item.member_id }}]</router-link>
                            <strong v-if="item.is_overdue || item.loan_count > 0" :class="item.is_overdue ? 'over' : 'ing'">
                                {{ item.is_overdue ? '연체중' : '대여중' }}
                            </strong>
                        </div>
                        <div class="right" :class="{full: item.loan_count === item.mbr_mx_cnt}">대여현황: <strong>{{ item.loan_count }} / {{ item.mbr_mx_cnt }}</strong></div>
                    </div>
                    <div class="bottom">
                        <div class="left">{{ item.mbr_tel || '-' }}</div>
                        <div class="right">{{ formatToKST(item.reg_dt) }}</div>
                    </div>
                </li>
            </ul>
        </article>
        <Pagination
            v-if="memberCnt > state.formData.perPage"
            :total="memberCnt"
            :perPage="state.formData.perPage"
            :curPageIdx="state.formData.curPageIdx"
            @goPage="goPage"
        />

        <ModalAboutExcel @close="closeModal" v-if="isActiveModal" :curData="memberList.length" :allData="memberCnt" />
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

            width: 100px;
            height: 40px;
            border: 1px solid #ddd;
            border-radius: 0;
            padding: 5px 10px;
            box-sizing: border-box;
            background: #fcfcfc;

            cursor: pointer;
        }
    }

    .mb-10px{
        margin-bottom: 10px;
    }
    .search-field{
        padding-bottom: 10px;

        .input-form{
            -webkit-appearance: none; /* Safari, Chrome */
            -moz-appearance: none;    /* Firefox */
            appearance: none;         /* 표준 */

            width: 240px;
            height: 40px;
            border: 1px solid #ddd;
            background: #fcfcfc;
            border-radius: 0;
            padding: 5px 10px;
            box-sizing: border-box;

            margin-right: 10px;
        }

        button{
            background: var(--main-green);
            color: #fff;
            border-radius: 0;
            height: 40px;
        }

        .btns{
            display: flex;
            align-items: flex-end;
            justify-content: space-between;

            .tab-ui{
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                
                label{
                    margin-right: 5px;
    
                    &:last-of-type{
                        margin-right: 0;
                    }
    
                    input{
                        display: none;
                    }
                    
                    strong{
                        cursor: pointer;
                        display: inline-block;
                        vertical-align: top;
                        width: 80px;
                        line-height: 30px;
                        text-align: center;
                        
                        background: #ccc;
                        color: #999;
                    }
                    
                    input:checked + strong{
                        background: var(--main-green);
                        color: #fff;
                        box-shadow: 0 1px 4px var(--main-green);
                    }
                }
    
    
            }
        }
    }

    .list-field{
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, .2);
        margin-bottom: 10px;

        .list-top{
            padding-bottom: 10px;
            border-bottom: 1px dashed #888;

            display: flex;
            align-items: flex-end;
            justify-content: space-between;


            .btns{
                display: flex;
                align-items: center;

                .btn-excel{
                    background: #0f713c;
                    color: #fff;
                    margin-right: 5px;
                    height: 40px;
                }

                select{
                    width: 128px;
                }
            }


        }


        ul{
            list-style: none;
            margin: 0;
            padding: 0;
            padding: 10px;

            li{
                padding: 5px 0;
                border-bottom: 1px solid #ddd;
                position: relative;
                
                &:hover{
                    background: linear-gradient(to right, transparent, var(--main-green), transparent);
                    border-bottom: 1px solid var(--main-green);
                }

                .top{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 5px;


                    .left{
                        a{
                            color: #000;
                            cursor: pointer;
                        }

                        strong{
                            padding: 0 5px;
                            margin-left: 10px;
                            border-radius: 5px;
                            display: inline-flex;
                            height: 18px;
                            align-items: center;
                            vertical-align: middle;
                            transform: rotate(-2deg);
                            
                            &.ing{
                                color: green;
                                border: 1px solid green;
                            }
                            &.over{
                                color: #f00;
                                border: 1px solid #f00;
                            }
                        }
                    }
                    .full{
                        font-weight: 900;
                        color: red;
                    }
                }
                .bottom{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;

                    .right{
                        
                    }
                }
            }
        }
    }
</style>
