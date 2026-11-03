<script setup>
</script>

<template>
  <aside>
    <h1><a href="/"><img src="/admin/src/assets/imgs/logo_color.svg" alt="로고" width="74"/></a></h1>
    <nav>
      <ul>
        <li>
          <router-link to="">대시보드 👀</router-link>
        </li>
        <li>
          <router-link to="/book-list">도서 📚</router-link>
          <ul>
            <li><router-link to="/book-list">도서 목록</router-link></li>
            <li><router-link to="/book">도서 등록</router-link></li>
          </ul>
        </li>
        <li>
          <router-link to="/member-list">회원 👥</router-link>
          <ul>
            <li><router-link to="/member-list">회원 목록</router-link></li>
            <li><router-link to="/member">회원 등록</router-link></li>
          </ul>
        </li>
        <li>
          <router-link to="/loan-list">대여/반납 🔄</router-link>
          <ul>
            <li><router-link to="/loan-list">대여 목록</router-link></li>
            <li><router-link to="/loan-return">대여/반납</router-link></li>
          </ul>
        </li>
        <li>
          <router-link to="/board-list">게시판 📋</router-link>
          <ul>
            <li><router-link to="/board-list">게시판 목록</router-link></li>
            <li><router-link to="/board">게시판 등록</router-link></li>
          </ul>
        </li>
        <li>
          <router-link to="/board-list">통계 📊</router-link>
          <ul>
            <li><router-link to="">대여 통계</router-link></li>
            <li><router-link to="">유저 통계</router-link></li>
            <li><router-link to="">도서 통계</router-link></li>
          </ul>
        </li>
        <li>
          <router-link to="">기타 ⚙️</router-link>
          <ul>
            <li><router-link to="">청구번호 관리</router-link></li>
            <li><router-link to="">바코드 출력</router-link></li>
          </ul>
        </li>
      </ul>
    </nav>
  </aside>
</template>

<style scoped lang="scss">
  aside{
    width: 180px;
    padding: 10px;
    background: #eee;
    text-align: center;

    h1{
      height: 100px;
      width: 100px;
      margin: 0;
      padding: 0;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      background: #fff;
      justify-content: center;
      box-shadow: inset 0 0 10px rgba(255, 0, 255, .5), inset 0 0 28px rgba(0, 255, 255, .8);
      // border: 1px solid rgba(0, 255, 255, .8);
      position: relative;

      &:before{
        content: '';
        width: 8px;
        height: 16px;
        border: 1px solid #eee;
        position: absolute;
        top: 40px;
        right: 5px;
        transform: rotate(10deg);
        border-radius: 50%;
        box-shadow: inset 0 0 8px rgba(255, 255, 255, 1);
      }

      &:after{
        content: '';
        width: 8px;
        height: 30px;
        // background: #fff;
        border: 1px solid #eee;
        position: absolute;
        bottom: 10px;
        right: 15px;
        transform: rotate(40deg);
        border-radius: 50%;
        box-shadow: inset 0 0 8px rgba(255, 255, 255, 1);
      }

      img{
        position: relative;
        left: 3px;
        top: 1px;
        filter: blur(.5px);
      }
    }

    nav{
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #ddd;
      
      ul{
        list-style: none;
        margin: 0;
        padding: 0;
      }

      a{
        color: #000;
      }

      & > ul{
        & > li{
          margin-bottom: 10px;
          
          &:last-of-type{
            margin-bottom: 0;
          }
          
          & > a{
            display: flex;
            height: 40px;
            align-items: center;
            padding-left: 25px;
            background: linear-gradient(to right, #74bb2a 4px, #999 0);
            color: #fff;
          }
        }
        
        ul{
          background: #ddd;
          li{
            padding: 5px 0;
          }
        }
      }
    }
  }
</style>
