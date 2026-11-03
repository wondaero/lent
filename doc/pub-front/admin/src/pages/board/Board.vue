<script setup>
    import CustomEditor from '../../components/CustomEditor.vue';
</script>

<template>
    <main>
        <h2 class="page-title"><span>게시판</span></h2>
        <article class="item-form">
            <div class="mb-10px flex align-center">
                <strong class="title ast">게시판유형</strong>
                <label class="select-form">
                    <select>
                        <option>공지사항</option>
                        <option>도서관활동</option>
                    </select>
                </label>
            </div>
            <div class="flex align-center">
                <strong class="title ast">공개여부</strong>
                <label class="select-form">
                    <select>
                        <option>공개</option>
                        <option>비공개</option>
                    </select>
                </label>
            </div>
            <hr class="line" />
            <div class="mb-10px flex">
                <label class="flex align-center flex-1">
                    <strong class="title ast">제목</strong>
                    <input type="text" class="input-form" />
                </label>
            </div>
            <div>
                <CustomEditor />
                <!-- <textarea placeholder="메모" class="input-form textarea-form"></textarea> -->
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
        width: 100px;
        &.ast:after{
            content: ' *';
            color: #f00;
        }
    }

    .input-form{
        -webkit-appearance: none; /* Safari, Chrome */
        -moz-appearance: none;    /* Firefox */
        appearance: none;         /* 표준 */

        width: 100%;
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
        width: 100%;
        height: 500px;
    }
    
    .line{
        margin: 10px 0;
        border: 0;
        border-top: 1px solid #ddd;
    }
</style>
