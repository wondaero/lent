<script setup>
</script>

<template>
    <main>
        <h2 class="page-title"><span>도서</span></h2>
        <article class="item-form">
            <div class="mb-5px flex align-center">
                <label class="flex align-center mr-5px">
                    <strong class="title">ISBN</strong>
                    <input type="text" class="input-form w-175px" />
                </label>
                <button class="btn-form flex align-center justify-center">검색</button>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title">총서명</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title ast">서명</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title ast">저자</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title">출판사</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title">출판년도</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div class="mb-5px flex align-center">
                <strong class="title ast">도서상태</strong>
                <label class="select-form">
                    <select>
                        <option>대여가능</option>
                        <option>보류</option>
                    </select>
                </label>
            </div>
            <div class="mb-5px flex align-center">
                <label class="flex align-center mr-5px">
                    <strong class="title ast">분류기호</strong>
                    <input type="text" class="input-form w-175px" />
                </label>
                <button class="btn-form flex align-center justify-center">검색</button>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title">청구권차</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title ast">저자기호</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title">복본</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div class="mb-5px flex">
                <label class="flex align-center">
                    <strong class="title ast">등록코드</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div>
                <textarea placeholder="메모" class="input-form textarea-form"></textarea>
            </div>
            <div>
                <div></div>
            </div>
            <div class="btns">
                <button>목록</button>
                <button>가입</button>
                <div>
                    <button>수정</button>
                    <button>저장</button>
                    <button>삭제</button>
                </div>
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
        width: 320px;
        height: 100px;
    }

    .btn-form{
        background: var(--main-green);
        color: #fff;
        width: 60px;
        height: 40px;
        border: 0;
        border-radius: 0;
        padding: 0;
    }

</style>
