<script setup>
  import { reactive } from 'vue'

  const state = reactive({
    memberList: [],
  })

  const emit = defineEmits(['close']);

  function closePopup(hasData){
    if(hasData === 'hasData'){
      emit('close', {aa: 11});
    }else{
      emit('close');
    }
  }
</script>

<template>
  <aside @click.self="closePopup()">
    <div>
      <header>
        <h2>회원 검색 결과</h2>
        <span @click="closePopup()"></span>
      </header>
      <main>
        <article class="search-field flex align-center">
            <label class="flex align-center mr-5px">
                <strong class="title">회원</strong>
                <input type="text" class="input-form w-175px" placeholder="이름/전화번호"/>
            </label>
            <button class="btn-form flex align-center justify-center">검색</button>
        </article>
        <article class="member-list">
          <label>
            <input type="radio" />
            <div>
              <div class="top">
                  <div class="left">원대로 [0]</div>
                  <div class="right">대여현황: <strong>0 / 5</strong></div>
              </div>
              <div class="bottom">
                  <div class="left">010-8580-5167</div>
                  <div class="right"></div>
              </div>
            </div>
          </label>
          <label>
            <input type="radio" />
            <div>
              <div class="top">
                  <div class="left">원대로 [0]</div>
                  <div class="right">대여현황: <strong>0 / 5</strong></div>
              </div>
              <div class="bottom">
                  <div class="left">010-8580-5167</div>
                  <div class="right"></div>
              </div>
            </div>
          </label>
        </article>
        <article class="btns">
          <button class="btn-form" @click="closePopup(state.memberList.filter(x => x.selected))">선택</button>
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
      max-width: 800px;
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

        .search-field{
          padding-bottom: 10px;
          border-bottom: 1px solid #eee;
        }

        .title{
          width: 40px;
        }

        .input-form{
          -webkit-appearance: none; /* Safari, Chrome */
          -moz-appearance: none;    /* Firefox */
          appearance: none;         /* 표준 */

          width: 200px;

          height: 40px;
          border: 1px solid #ddd;
          background: #fcfcfc;
          border-radius: 0;
          padding: 5px 10px;
          box-sizing: border-box;
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

        .member-list{
          margin-bottom: 10px;
          max-height: 200px;
          overflow-y: auto;

          label{
            border-bottom: 1px solid #eee;
            display: block;

            

            &:last-of-type{
              margin-bottom: 0;
            }

            &:hover > div, input:checked + div{
              background: linear-gradient(to right, transparent, var(--main-green), transparent);
            }

            input{
              display: none;
            }

            & > div{
              padding: 5px;

              .top, .bottom{
                display: flex;
                align-items: center;
                justify-content: space-between;
              }
            }
          }
        }

        .btns{
          display: flex;
          justify-content: center;

          button{
            width: 120px;

          }

        }
      }

    }

  }
</style>
