<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router';
import api from "@/api/axios"
import { exportExcel } from '../../utils/excel.js';
import { formatToKST, today } from '../../utils/common';


const router = useRouter();

const { id } = defineProps({ id: String })

const state = reactive({
    formData: {
        name: '',
        tel: '',
        birth: '',
        gender: '남자',
        addr: '',
        loanLimit: 5,
        loanPeriod: 14,
        status: 'y',
        memo: '',
        regDt: '',
    }
})
const orgName = ref('');

const bookFilter = ref('m1');
const bookFrom = ref(today());
const bookTo = ref(today());
const bookList = ref([]);



onMounted(async () => {
    if(id){
        getData();
    }
})

function matchData(type, d){
    const matching = {
        name: 'mbr_nm',
        tel: 'mbr_tel',
        birth: 'mbr_birth',
        gender: 'mbr_gender',
        addr: 'mbr_address',
        loanLimit: 'mbr_mx_cnt',
        loanPeriod: 'mbr_mx_date',
        status: 'status',
        memo: 'memo',
        regDt: 'reg_dt',
    }
    if(type === 'get'){
        for(let key in matching){
            state.formData[key] = d[matching[key]];
        }
    }else if(type === 'set'){
        const rtnObj = {};
        for(let key in d){
            rtnObj[matching[key]] = d[key];       
        }

        return rtnObj;
    }
}

function onlyTel(e) {
  // 숫자와 하이픈만 허용
  state.formData.tel = e.target.value.replace(/[^0-9-]/g, '')
}

const matchTable = {
    over: '연체중',
    ing: '대여중',
    overReturn: '반납(연체)',
    return: '반납'
}

function sts2kor(sts){
    return matchTable[sts];
}

function getData(){
    getMemberDetail();
    getBookList();
}

async function getMemberDetail(){
    const res = await api.get(`/members/${id}`);

    orgName.value = res.data.mbr_nm;   //원래 이름
    matchData('get', res.data);

    state.formData.regDt = formatToKST(state.formData.regDt);
}
async function getBookList(){
    const params = {
        filter: bookFilter.value
    }

    if(bookFilter.value === 'cstm'){
        params.bookFrom = bookFrom.value;
        params.bookTo = bookTo.value;
    }

    const res = await api.get(`/loan/member/${id}`, {params: params});
    bookList.value = res.data;
}

function parseExcelData(){
    return bookList.value.map((b) => {
        return {
            ...b,
            loan_dt: formatToKST(b.loan_dt),
            due_dt: formatToKST(b.due_dt2) || formatToKST(b.due_dt),
            return_dt: formatToKST(b.return_dt),
            status: sts2kor(b.status)
        }
    })
}

function downloadExcel(){
    exportExcel(parseExcelData(bookFilter.value), [
        { header: '도서코드', key: 'book_code' },
        { header: '도서명', key: 'title' },
        { header: '저자', key: 'author_info' },
        { header: '출판사', key: 'pub_info' },
        { header: '분류기호', key: 'class_no' },
        { header: '저자기호', key: 'author_code' },
        { header: '대여일', key: 'loan_dt' },
        { header: '반납일(의무)', key: 'due_dt' },
        { header: '실제반납일', key: 'return_dt' },
        { header: '대여상태', key: 'status' },
    ]);
}

function validation(){
    const chkList = {
        loanLimit: true,
        loanPeriod: true,
        name: true,
        status: true,
        tel: true,
        gender: true,
    };

    let isPassed = true;
    let target;
    
    for(let key in state.formData){
        if(chkList[key]){
            const value = state.formData[key];
            if(key === 'loanLimit' && +value < 1){
                isPassed = false;
                target = key;
                break;
            }else if(key === 'loanPeriod' && +value < 1){
                isPassed = false;
                target = key;
                break;
            }else if(!value){
                isPassed = false;
                target = key;
                break;
            }
        }
    }

    return {
        isPassed,
        target
    };
}

async function saveMember(){
    if(!confirm(`회원을 ${id ? '수정' : '등록'}하시겠습니까?`)) return;

    const valid = validation();
    if(valid.isPassed === false){
        alert('필수 값(들)을 확인해주세요.');
        return;
    }

    const tmpArr = [];

    const changedName = matchData('set', state.formData);
    for(let key in changedName){
        const value = changedName[key];

        if(key === 'reg_dt' || value === '') continue;
        tmpArr.push({[key]: value});
    }

    try{
        const res = await api[id ? 'patch' : 'post'](`/members${id ? `/${id}` : ''}`, {
            params: tmpArr
        });

        if(res.status === 201 || res.status === 200){
            alert(`회원 ${id ? '수정' : '등록'}이 완료되었습니다.`);
            router.push(`/member/${res.data.id}`);

        }else{
            alert('처리 중 문제가 발생했습니다.');
        }
    }catch (err){
        console.error(err);
        alert('서버 오류가 발생했습니다.');
    }
}
async function deleteMember(){
    if(!confirm(`"${orgName.value}" 회원을 삭제하시겠습니까?`)) return;

    try{
        const res = await api.delete(`/members/${id}`);

        if(res.status === 201 || res.status === 200){
            alert(`"${orgName.value}" 회원을 삭제했습니다.`);
            router.push(`/member-list`);

        }else{
            alert('처리 중 문제가 발생했습니다.');
        }
    }catch (err){
        console.error(err);
        alert('서버 오류가 발생했습니다.');
    }
}

</script>

<template>
    <main>
        <h2 class="page-title"><span>회원{{ id ? '정보' : '가입' }}</span></h2>
        <article class="item-form">
            <div class="flex mb-10px">
                <label class="flex align-center">
                    <strong class="title ast">이름</strong>
                    <input type="text" class="input-form" v-model="state.formData.name" />
                </label>
            </div>
            <div class="flex mb-10px">
                <label class="flex align-center">
                    <strong class="title ast">전화번호</strong>
                    <input type="tel" class="input-form" v-model="state.formData.tel" @input="onlyTel" />
                </label>
            </div>
            <div class="flex mb-10px">
                <label class="flex align-center">
                    <strong class="title">생년월일</strong>
                    <input type="date" class="input-form" v-model="state.formData.birth" />
                </label>
            </div>
            <div class="flex align-center gender-field mb-10px">
                <strong class="title ast">성별</strong>
                <label>
                    <input type="radio" v-model="state.formData.gender" value="남자" />
                    <strong>남</strong>
                </label>
                <label>
                    <input type="radio" v-model="state.formData.gender" value="여자" />
                    <strong>여</strong>
                </label>
            </div>
            <div class="flex mb-10px">
                <label class="flex align-center">
                    <strong class="title">주소</strong>
                    <input type="text" class="input-form" v-model="state.formData.addr" />
                </label>
            </div>
            <div class="flex mb-10px">
                <label class="flex align-center">
                    <strong class="title ast">최대 대여 권수</strong>
                    <input type="number" class="input-form" v-model="state.formData.loanLimit" />
                </label>
            </div>
            <div class="flex mb-10px">
                <label class="flex align-center">
                    <strong class="title ast">반납 기한</strong>
                    <input type="number" class="input-form" v-model="state.formData.loanPeriod" />
                </label>
            </div>
            <div class="flex mb-10px align-center">
                <strong class="title ast">상태</strong>
                <label class="select-form">
                    <select v-model="state.formData.status">
                        <option value="y">대여가능</option>
                        <option value="n">대여불가</option>
                        <option value="1">보류</option>
                    </select>
                </label>
            </div>
            <div class="flex mb-10px" v-if="state.formData.regDt">
                <label class="flex align-center">
                    <strong class="title">등록일</strong>
                    <input type="text" class="input-form" readonly v-model="state.formData.regDt" />
                </label>
            </div>
            <div>
                <textarea placeholder="메모" v-model="state.formData.memo" class="input-form textarea-form"></textarea>
            </div>
            <div>
                <div></div>
            </div>
            <div class="btns">
                <div>
                    <button class="btn-go-list">목록</button>
                </div>
                <div v-if="!id">
                    <button class="btn-green" @click="saveMember()">가입</button>
                </div>
                <div v-else>
                    <button class="btn-green" @click="saveMember()">수정</button>
                    <button class="btn-red" @click="deleteMember()">삭제</button>
                </div>
            </div>
        </article>
        <article class="borrowed-book-field" v-if="id">
            <h3><span>대여 목록</span></h3>
            <div class="list-header">
                <div class="tab-ui">
                    <label>
                        <span v-if="bookFilter.indexOf('m') !== 0">기간</span>
                        <select v-model="bookFilter" @change="getBookList()" :class="{active: bookFilter.indexOf('m') === 0}">
                            <option value="m1">최근 1개월</option>
                            <option value="m2">최근 2개월</option>
                            <option value="m3">최근 3개월</option>
                            <option value="m6">최근 6개월</option>
                            <option value="m12">최근 1년</option>
                        </select>
                    </label>
                    <label>
                        <input type="radio" v-model="bookFilter" value="all" @change="getBookList()" />
                        <strong>전체</strong>
                    </label>
                    <label>
                        <input type="radio" v-model="bookFilter" value="ing" @change="getBookList()" />
                        <strong>대여중</strong>
                    </label>
                    <label>
                        <input type="radio" v-model="bookFilter" value="cstm" />
                        <strong>날짜 지정</strong>
                    </label>
                </div>
                <div v-if="bookFilter === 'cstm'" class="cstm-date flex align-center mb-10px">
                    <input type="date" class="input-form" v-model="bookFrom" />
                    <span>~</span>
                    <input type="date" class="input-form" v-model="bookTo" />
                    <button class="btn-form" @click="getBookList()">검색</button>
                </div>
            </div>
            <div v-if="!bookList.length">내역이 없습니다.</div>
            <div class="list-field" v-if="bookList.length">
                <div class="list-top">
                    <div>총 <strong>{{ bookList.length }}</strong>건</div>
                    <div class="list-btns">
                        <button class="btn-excel" @click="downloadExcel()">엑셀 다운로드</button>
                    </div>
                </div>
                <ul>
                    
                    <li v-for="item in bookList" :key="item.book_cde">
                        <div class="top">
                            <div class="left"><strong>[{{ item.book_code }}]</strong> {{ item.title }}</div>
                            <div class="right"><strong>[{{ item.class_no }}]</strong> {{item.author_code}}</div>
                        </div>
                        <div class="middle">
                            <div class="left">{{ item.author_info }} | {{ item.pub_info }}</div>
                            <div class="right"><strong :class="item.status">{{ sts2kor(item.status) }}</strong></div>
                        </div>
                        <div class="bottom">
                            <div class="left"></div>
                            <div class="right">
                                <strong>{{ formatToKST(item.loan_dt) }}</strong>
                                ~
                                <strong :class="item.status">{{ formatToKST(item.return_dt || item.due_dt2 || item.due_dt) }}</strong>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </article>
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
        width: 120px;
        &.ast:after{
            content: ' *';
            color: #f00;
        }
    }

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
        width: 360px;
        height: 100px;
    }

    input[type="number"]::-webkit-inner-spin-button,
    input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    /* Firefox */
    input[type="number"] {
        -moz-appearance: textfield;
    }

    .btns{
        display: flex;
        align-items: center;

        div{
            margin-right: 5px;

            &:last-of-type{
                margin-right: 0;
            }
            button{
                width: 80px;
                height: 40px;
                margin-right: 5px;
                border: 0;
                color: #fff;
                border-radius: 0;

                &:last-of-type{
                    margin-right: 0;
                }

                &.btn-go-list{
                    background: navy;
                }

                &.btn-green{
                    background: var(--main-green);
                }
                &.btn-red{
                    background: #f00;
                }
            }
        }

    }

    

    .borrowed-book-field{
        border-top: 1px solid #eee;
        margin-top: 30px;
        padding-top: 30px;

        h3{
            margin: 0 0 10px;
            padding: 0 0 10px;

            span{
                background: linear-gradient(to bottom, transparent 50%, var(--main-green) 0);
            }
        }

        .list-header{
            margin-bottom: 10px;

            .tab-ui{
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                
                label{
                    position: relative;
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

                    span{
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        font-weight: bolder;
                        color: #999;
                        pointer-events: none;
                    }
                }
                
                select{
                    -webkit-appearance: none; /* Safari, Chrome */
                    -moz-appearance: none;    /* Firefox */
                    appearance: none;         /* 표준 */
                    
                    outline: 0;
                    width: 100px;
                    height: 30px;
                    border: 0;
                    border-radius: 0;
                    box-sizing: border-box;
                    font-weight: bolder;

                    background: #ccc;
                    color: #999;

                    text-align-last: center;
                    text-align: center;
                    -ms-text-align-last: center;
                    -moz-text-align-last: center;

                    cursor: pointer;

                    &.active{
                        background: var(--main-green);
                        color: #fff;
                        box-shadow: 0 1px 4px var(--main-green);
                    }
                }
            }

            .cstm-date{
                margin-top: 10px;
                input{
                    width: 140px;
                }
                span{
                    margin: 0 5px;
                }
                
                button{
                    margin-left: 10px;

                    width: 80px;
                    height: 40px;
                    margin-right: 5px;
                    border: 0;
                    color: #fff;
                    border-radius: 0;
                    background: var(--main-green);
                }
            }
        }

        .list-field{
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, .2);
            // margin-bottom: 10px;

            .list-top{
                padding-bottom: 10px;
                border-bottom: 1px dashed #888;

                display: flex;
                align-items: flex-end;
                justify-content: space-between;

                .list-btns{
                    display: flex;
                    align-items: center;

                    .btn-excel{
                        background: #0f713c;
                        color: #fff;
                        height: 40px;
                    }
                }
            }

            ul{
                list-style: none;
                margin: 0;
                padding: 0;
                padding: 10px;

                li{
                    border-bottom: 1px solid #ddd;
                    
                    &:hover{
                        background: linear-gradient(to right, transparent, var(--main-green), transparent);
                        border-bottom: 1px solid var(--main-green);
                    }

                    & > div{
                        display: flex;
                        align-items: center;
                        justify-content: space-between;

                        &.top,
                        &.middle{
                            .left{
                                overflow: hidden;
                                text-overflow: ellipsis;
                                white-space: nowrap;
                                flex: 1;
                            }
                        }

                        &.middle{
                            .right{
                                strong{
                                    color: #fff;
                                }
                                .ing{
                                    padding: 0 5px;
                                    background: #000;
                                }
                                .over{
                                    padding: 0 5px;
                                    background: #f00;
                                }
                                .overReturn{
                                    color: orange;
                                }
                                .return{
                                    color: green;
                                }
                            }
                        }
                        // &.bottom{
                        //     .right{
                        //         .ing{
                        //             color: #000;
                        //         }
                        //         .over{
                        //             color: #f00;
                        //         }
                        //         .overReturn{
                        //             color: orange;
                        //             // color: #000;
                        //         }
                        //         .return{
                        //             color: green;
                        //         }
                        //     }
                        // }
                    }
                }
            }
        }
    }

</style>
