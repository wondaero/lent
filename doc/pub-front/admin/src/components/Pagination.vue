<script setup>
  import { ref, watch, reactive, computed } from 'vue'

  const props = defineProps({
    total: Number,   // 전체 아이템 수
    perPage: Number, // 페이지당 아이템 수
    curPageIdx: Number   // 현재 페이지
  })

  const perGroup = 10; //페이지를 몇개 보여줄지(5 or 10)

  const pageCnt = computed(() => Math.ceil(props.total / props.perPage)); //총 페이지 수
  const groupCnt = computed(() => Math.ceil(pageCnt.value / perGroup)); //총 그룹 갯수
  const groupIdx = computed(() => Math.ceil(props.curPageIdx / perGroup));  //현재 그룹 위치
  const perGroup2 = computed(() => {  //실제 그룹 내 페이지 수
    if(groupIdx.value === groupCnt.value){  //마지막 그룹이면
      if(pageCnt.value > perGroup){ //전체 페이지 수가 처음부터 모자랄 때
        return pageCnt.value - (perGroup * (groupIdx.value - 1));
      }else{
        return pageCnt.value;
      }
    }else{
      return perGroup;
    }
  });

  const pageNumbers = computed(() => {
    const start = (perGroup * (groupIdx.value - 1)) + 1; // 그룹 시작 페이지
    const pages = [];
    for (let i = 0; i < perGroup2.value; i++) {
      pages.push(start + i);
    }
    return pages;
  });


  const curPageInput = ref(props.curPageIdx);

  watch(
    () => props.curPageIdx,
    (newVal) => {
      curPageInput.value = newVal;
    }
  );


  const state = reactive({
  })

  const emit = defineEmits(['goPage']);

  function goPage(page){
    emit('goPage', page);
  }

  function goCustomPage(){
    if(curPageInput.value <= 0 || pageCnt.value < curPageInput.value){
      alert(`${1} ~ ${pageCnt.value} 사이의 페이지 번호를 입력해주세요.`);
      return;
    }
    goPage(curPageInput.value);
  }




</script>

<template>
  <aside>
    <ul class="flex-center">
      <li class="flex-center" @click="goPage((perGroup * (groupIdx - 2)) + 1)" v-if="groupIdx > 1">&lt;</li>
      <li
        v-for="page in pageNumbers"
        :key="page"
        class="flex-center"
        :class="{'active': page === props.curPageIdx}"
        @click="goPage(page)"
      >{{ page }}</li>
      <li class="flex-center" @click="goPage((groupIdx * perGroup) + 1)" v-if="groupIdx < groupCnt">&gt;</li>
    </ul>
    <div class="flex-center">
      <input type="number" class="input-form" v-model="curPageInput" @keyup.enter="goCustomPage()" />
      <button class="flex-center" @click="goCustomPage()">이동</button>
    </div>
  </aside>
</template>

<style scoped lang="scss">
  aside{
    display: block;
    ul{
      margin: 0 0 10px;
      padding: 0;
      width: 100%;
      list-style: none;

      li{
        width: 38px;
        height: 38px;
        border: 1px solid #ddd;
        margin-right: 8px;
        cursor: pointer;

        &:last-of-type{
          margin-right: 0;
        }

        &.active{
          background: var(--main-green);
          color: #fff;
        }
      }
    }

    .input-form{
      -webkit-appearance: none; /* Safari, Chrome */
      -moz-appearance: none;    /* Firefox */
      appearance: none;         /* 표준 */

      width: 100px;

      height: 40px;
      border: 1px solid #ddd;
      background: #fcfcfc;
      border-radius: 0;
      padding: 5px 10px;
      box-sizing: border-box;
      margin-right: 5px;
      text-align: right;
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

    button{
      width: 60px;
      height: 40px;
      background: var(--main-green);
      padding: 0;
      color: #fff;
      border-radius: 0;
    }
  }
</style>
