// services/loanService.js
const loanModel = require("../models/loanModel");

// 해당 멤버가 빌린 책들
async function getBookListByMember(params) {
  const books = await loanModel.getBookListByMember(params);

  //책 상태
  const bookWithSts = books[0].map((b) => {
    let status;
    if(b.return_dt){  //현재 반납 상태
      if(new Date(b.return_dt) <= new Date(b.due_dt2 || b.due_dt)){
        status = 'return';
      }else{
        status = 'overReturn';
      }
    }else{  //아직 대여중
      if(new Date(b.due_dt2 || b.due_dt) < new Date()){
        status = 'over';
      }else{
        status = 'ing';
      }
    }
    return {...b, status: status};
  });

  return bookWithSts;
}
// 해당 책을 빌린 회원들
async function getMemberListByBook(params) {
  const members = await loanModel.getMemberListByBook(params);

  //책 상태
  const memberWithSts = members[0].map((b) => {
    let status;
    if(b.return_dt){  //현재 반납 상태
      if(new Date(b.return_dt) <= new Date(b.due_dt2 || b.due_dt)){
        status = 'return';
      }else{
        status = 'overReturn';
      }
    }else{  //아직 대여중
      if(new Date(b.due_dt2 || b.due_dt) < new Date()){
        status = 'over';
      }else{
        status = 'ing';
      }
    }
    return {...b, status: status};
  });

  return memberWithSts;
}

// 도서 추가
async function addLoan(params) {
  console.log(params);
  const { bookList, memberId } = params;

  for(let i = 0; i < bookList.length; i++){
    const newLoan = await loanModel.addLoan(common.obj2objArr({
      bookId: bookList[i],
      memberId: memberId
    }, {value: ['']}));
  
    const targetId = newLoan[0].insertId;
  
    return {id: targetId};

  }
  return;


  const newLoan = await loanModel.addBook(common.obj2objArr({
    isbn: params.isbn,
    book_cde: params.bookCode,
    series_title: params.seriesTitle,
    series_no: params.startVol,
    title: params.TITLE,
    author_info: params.AUTHOR,
    pub_info: params.PUBLISHER,
    pub_year_info: params.PUBYEAR,
    class_no: params.classNo,
    author_cde: params.authorCode,
    author_cde_chk: 'n',
    copy_no: params.copyNo,
    book_sts: params.status,
    memo: params.memo,
  }, {value: ['']}));

  const targetId = newLoan[0].insertId;

  return {id: targetId};
}

// 도서 수정
async function updateBook(id, params) {
  const updateBook = await bookModel.updateBook(id, common.obj2objArr({
    isbn: params.isbn,
    book_cde: params.bookCode,
    series_title: params.seriesTitle,
    class_no: params.classNo,
    series_no: params.startVol,
    title: params.TITLE,
    author_info: params.AUTHOR,
    pub_info: params.PUBLISHER,
    pub_year_info: params.PUBYEAR,
    author_cde: params.authorCode,
    author_cde_chk: params.printedAuthorCode,
    copy_no: params.copyNo,
    book_sts: params.status,
    memo: params.memo,

  }, {value: ['']}));

  if (!updateBook) {
    throw new Error("Failed to update book");
  }
  return {id};
}


module.exports = {
  getBookListByMember,
  getMemberListByBook,
  addLoan,
  updateBook,
};
