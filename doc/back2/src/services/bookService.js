// services/bookService.js
const bookModel = require("../models/bookModel");
const common = require("../utils/common");

// 전체 도서 목록
async function getBookList(params) {
  if(params && params.noAuthorCde === 'true'){  //나중에 string 타입 말고 boolean으로 바꿀 것
    return bookModel.getHasNoAuthorCdeBookCount();
  }

  if(params && params.searchType === 'isbn'){
    const alreadyBook = await bookModel.getAlreadyBook(params);
    const alreadyBookCnt = await bookModel.getAlreadyBookCnt(params);

    return {
      book: alreadyBook[0][0],
      copyNo: alreadyBookCnt[0][0].CNT
    };
  }

  if(params && params.type === 'loan'){
    return bookModel.getBookInfo(params);
  }
  
  params.limit = params.perPage;
  params.offset =  (params.curPageIdx - 1) * params.perPage;
  
  const books = await bookModel.getBookList(params);


  if(params.all === 'true'){
    return {bookList: books[0]};
  }

  let booksCnt;

  if(params.filter === 'ing' || params.filter === 'over'){
      booksCnt = await bookModel.getFilteredBookCount(params);
  }else if(!params.filter || ['all', 'hold', 'read', 'del'].includes(params.filter)){
    booksCnt = await bookModel.getBookCount(params);
  }

  return {
      bookList: books[0],
      booksCnt: booksCnt[0][0].CNT
  };
}

// 특정 도서 조회
async function getBookDetail(id) {
    const book = await bookModel.getBookDetail(id);

    if (!book) {
      throw new Error("Book not found");
    }
    return book[0][0];
}

// 도서 추가
async function addBook(params) {

  const newBook = await bookModel.addBook(common.obj2objArr({
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

  const targetId = newBook[0].insertId;

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

// 도서 삭제
async function deleteBook(id) {
  const deletedBook = await bookModel.deleteBook(id);
  if (!deletedBook) {
    throw new Error("Failed to delete book");
  }
  return await deletedBook;
}


module.exports = {
  getBookList,
  getBookDetail,
  addBook,
  updateBook,
  deleteBook,
};
