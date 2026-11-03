<script setup>
  import { reactive } from 'vue'

  const props = defineProps({
    allData: Number,   // 전체 데이터
    curData: Number, // 현재 데이터
  })

  const state = reactive({
    memberList: [],
  })
  
  const emit = defineEmits(['close']);

  if(props.allData === props.curData) closePopup('cur');

  function closePopup(dataType){
    emit('close', dataType);
  }
</script>

<template>
  <aside @click.self="closePopup()">
    <div>
      <header>
        <h2>엑셀 다운로드</h2>
        <span @click="closePopup()"></span>
      </header>
      <main>
        <article class="">
          <h3>데이터 범위를 지정해주세요.</h3>
          <p>
            현재 데이터: {{props.curData}}건
            <br />
            전체 데이터: {{props.allData}}건
          </p>
        </article>
        <article class="btns">
          <button class="btn-form" @click="closePopup('cur')">현재 데이터</button>
          <button class="btn-form" @click="closePopup('all')">전체 데이터</button>
        </article>
      </main>
    </div>
  </aside>
</template>

<style scoped lang="scss">
  aside{
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;

    min-width: 720px;
    padding: 10px;
    background: rgba(0, 0, 0, .8);
    display: flex;
    align-items: center;
    justify-content: center;

    & > div{
      max-width: 360px;
      width: 100%;
      background: #fff;

      header{
        padding: 10px;
        background: #ddd;
        display: flex;
        align-items: center;
        justify-content: space-between;

        h2{
          margin: 0;
          font-size: 18px;
        }

        span{
          width: 30px;
          height: 30px;
          position: relative;
          transform: rotate(45deg);
          cursor: pointer;

          &:before, &:after{
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #000;            
          }
          &:before{
            width: 100%;
            height: 2px;
          }
          &:after{
            height: 100%;
            width: 2px;

          }
        }
      }

      main{
        padding: 10px;

        


        .btns{
          display: flex;
          justify-content: center;

          button{
            width: 100px;
            background: var(--main-green);
            line-height: 40px;
            border: 0;
            padding: 0;
            border-radius: 0;
            color: #fff;

            &:first-of-type{
              border: 1px solid var(--main-green);
              background: 0;
              color: var(--main-green);
              margin-right: 10px;
            }
          }

        }
      }

    }

  }
</style>
