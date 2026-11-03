<script setup>
</script>

<template>
    <main>
        <h2 class="page-title"><span>도서 목록</span></h2>
        <article class="search-field">
            <div class="mb-10px flex align-center">
                <label class="select-form">
                    <select>
                        <option>도서명</option>
                        <option>저자</option>
                        <option>출판사</option>
                        <option>도서코드</option>
                    </select>
                    <span></span>
                </label>
                <input class="input-form" placeholder="검색어를 입력해주세요." />
                <button>검색</button>
            </div>
            <div class="btns">
                <div class="tab-ui">
                    <label>
                        <input type="radio" checked />
                        <strong>전체</strong>
                    </label>
                    <label>
                        <input type="radio" />
                        <strong>대여중</strong>
                    </label>
                    <label>
                        <input type="radio" />
                        <strong>연체중</strong>
                    </label>
                    <label>
                        <input type="radio" />
                        <strong>보류</strong>
                    </label>
                </div>
                <div>
                    <div>총 <strong>0</strong>건</div>
                </div>
            </div>
        </article>
        <article class="list-field">
            <ul>
                <li>
                    <div class="top">
                        <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                        <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                    </div>
                    <div class="bottom">
                        <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                        <div class="right"><strong>연체중</strong>(원대로)</div>
                    </div>
                </li>
                <li>
                    <div class="top">
                        <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                        <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                    </div>
                    <div class="bottom">
                        <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                        <div class="right"><strong>연체중</strong>(원대로)</div>
                    </div>
                </li>
                <li>
                    <div class="top">
                        <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                        <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                    </div>
                    <div class="bottom">
                        <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                        <div class="right"><strong>연체중</strong>(원대로)</div>
                    </div>
                </li>
                <li>
                    <div class="top">
                        <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                        <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                    </div>
                    <div class="bottom">
                        <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                        <div class="right"><strong>연체중</strong>(원대로)</div>
                    </div>
                </li>
                <li>
                    <div class="top">
                        <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                        <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                    </div>
                    <div class="bottom">
                        <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                        <div class="right"></div>
                    </div>
                </li>
                <li>
                    <div class="top">
                        <div class="left">[EM00010439] 이문열 삼국지. 7</div>
                        <div class="right"><strong>[199.5]</strong> 애198ㄴ</div>
                    </div>
                    <div class="bottom">
                        <div class="left">애니 폭스 지음 ;장은선 옮김 | 뜨인돌</div>
                        <div class="right"><strong>연체중</strong>(원대로)</div>
                    </div>
                </li>
            </ul>
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

    .mb-10px{
        margin-bottom: 10px;
    }
    .search-field{

        padding-bottom: 10px;
        // margin-bottom: 10px;
        border-bottom: 1px solid #ddd;

        .select-form{
            position: relative;
            margin-right: 10px;

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
    
                width: 90px;
                height: 40px;
                border: 1px solid #ddd;
                border-radius: 0;
                padding: 5px 10px;
                box-sizing: border-box;
    
                cursor: pointer;
            }
        }


        .input-form{
            -webkit-appearance: none; /* Safari, Chrome */
            -moz-appearance: none;    /* Firefox */
            appearance: none;         /* 표준 */


            width: 240px;
            height: 40px;
            border: 1px solid #ddd;
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
        ul{
            list-style: none;
            margin: 0;
            padding: 0;
            padding: 10px;

            li{
                padding: 5px 0;
                border-bottom: 1px solid #ddd;
                
                &:hover{
                    background: linear-gradient(to right, transparent, var(--main-green), transparent);
                    border-bottom: 1px solid var(--main-green);
                }

                .top{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                .bottom{
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
            }
        }
    }
</style>
