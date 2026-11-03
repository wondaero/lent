let createError = require('http-errors');
let express = require('express');
let cookieParser = require('cookie-parser');
let logger = require('morgan');

const cors = require('cors');
const sql = require("./sql");

const bodyParser = require('body-parser');

const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');
const multer = require('multer');
const cheerio = require('cheerio');


let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');

const axios = require('axios');
const { FORMERR } = require('dns');

let app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// port setup
app.set('port', process.env.PORT || 3000);

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(bodyParser.json({ limit: '1000mb' }));
app.use(bodyParser.urlencoded({ limit: '1000mb', extended: true }));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

let server = app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + server.address().port);
});

indexRouter.get('/test', function(req, res, next) { //test
  res.send("JUST TEST");
});

indexRouter.post('/getBookInfoByIsbn', function(req, res, next) { //책등록페이지(ISBN으로 검색)
  axios.get(`http://nl.go.kr/kolisnet/openApi/open.php?gubun1=ISBN&code1=${req.body.isbn}`, {rejectUnauthorized: false}).then((Response)=>{
    res.send(Response.data);
  }).catch((Error)=>{
     console.log(Error);
  })
});

indexRouter.post('/getBookDetailInfoByIsbn', function(req, res, next) { //책등록페이지(ISBN으로 검색(detail))
  axios.get(`http://nl.go.kr/kolisnet/openApi/open.php?rec_key=${req.body.recKey}`).then((Response)=>{
    res.send(Response.data);
  }).catch((Error)=>{
     console.log(Error);
  })
});

indexRouter.post('/regBook', function(req, res, next) { //도서등록

  //날짜쪽 정리해야함
  //column명 바꿔야함
  //불필요 column 지워야함
  //모든 책 정리해야 함

  sql.books.insert({
    isbn: req.body.isbn,
    book_cde: req.body.bookCde,
    class_cde: req.body.classCde,
    class_cde_chk: 'n',
    class_no: req.body.classNo,
    series_title: req.body.seriesTitle,
    title: req.body.TITLE,
    pub: req.body.PUBLISHER,
    author: req.body.AUTHOR,
    pub_year: req.body.PUBYEAR,
    book_sts: '1',  //유동적인 값 찾을 것
  }).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    res.json(err)
  })
});

indexRouter.post('/updateBook', function(req, res, next) { //도서수정
  sql.books.update({
    col: {
      // book_cde: req.body.bookCde,
      class_cde: req.body.classCde,
      class_cde_chk: req.body.classCdeChk,
      class_no: req.body.classNo,
      series_title: req.body.seriesTitle,
      title: req.body.TITLE,
      pub: req.body.PUBLISHER,
      author: req.body.AUTHOR,
      start_vol: req.body.startVol,
      pub_year: req.body.PUBYEAR,
      book_sts: req.body.bookSts,    //유동적인 값 찾을 것
    },
    where: [`book_cde = '${req.body.bookCde}'`]
  }).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    res.json(err)
  })
});
indexRouter.post('/delBook', function(req, res, next) { //도서삭제
  sql.books.delete({
    where: [`book_cde = '${req.body.bookCde}'`]
  }).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    res.json(err)
  })
});

indexRouter.post('/getBookList', function(req, res, next) { //도서조회(admin)
  const {page, listPerPage, bookSts, keyword} = req.body;
  let qry = `
    SELECT
        b.book_cde,     
        b.series_title, 
        b.title,        
        b.pub,
        b.author,       
        b.class_cde,    
        b.class_no,     
        b.book_sts,
        b.reg_dt,
        bb.seq,
        bb.user_cde,
        bb.reg_dt,
        bb.org_return_dt,
        bb.user_cde,
        u.name
    FROM books b
    LEFT JOIN (SELECT * FROM books_borrowed WHERE return_dt IS NULL) bb
    ON b.book_cde = bb.book_cde
    LEFT JOIN users u
    ON bb.user_cde = u.user_cde
  `;
  let where = `WHERE 1 = 1
  `;

  const lmt = `
    LIMIT ${listPerPage}
    OFFSET ${(page - 1) * listPerPage}
  `;

  if(keyword){
    where += `
    AND (
      b.book_cde = '${keyword}'
      OR b.title like '%${keyword}%'
      OR b.author like '%${keyword}%'
      OR b.pub like '%${keyword}%'
    )`; 
  }
  if(bookSts){
    where += `
    AND b.book_sts = '${bookSts}'
    `
  }

  qry += where
  qry += `ORDER BY b.reg_dt DESC`;
  qry += lmt;

  const rtnObj = {};
  sql.query(qry).then(res2 => {
    rtnObj.data = res2[0];
    return res2[0];
  }).then(res3 => {
    qry = `
      SELECT
        COUNT(*) AS total
      FROM books b
    `;
    qry += where;

    sql.query(qry).then(res3 => {
      rtnObj.total = res3[0][0].total;
      
      res.status(200).json(rtnObj);
    });
  })
});

indexRouter.get('/getBooksWithNoClassCdeCnt', function(req, res, next) { //스티커가 붙어 있지 않은 도서 갯수 조회
  sql.books.count({
    where: ["class_cde_chk != 'y'"]
  }).then(res2 => {
    res.status(200).json(res2[0]);
  })
});

indexRouter.get('/getBooksWithNoClassCde', function(req, res, next) { //스티커가 붙어 있지 않은 도서 조회
  sql.books.select({
    col: [
      'book_cde',
      'series_title',
      'title',
      'pub',
      'author',
      'class_cde',
      'start_vol',
      'class_no',
      'reg_dt'
    ],
    where: [
      "class_cde_chk != 'y'"
    ],
    orderBy: [
      'reg_dt DESC'
    ]
  }).then(res2 => {
    res.send(res2[0]);
  })
});

indexRouter.get('/getBookDetailByBookCde', function(req, res, next) { //등록된 책 상세
  sql.books.select({
    col: [
      'book_cde',
      'isbn',
      'series_title',
      'title',
      'pub',
      'pub_year',
      'author',
      'class_cde',
      'class_no',
      'start_vol',
      'class_cde_chk',
      'book_sts',
      'reg_dt'
    ],
    where: [
      `book_cde = '${req.param('bookCde')}'`
    ]
  }).then(res2 => {
    res.send(res2[0]);
  })
});

indexRouter.post('/updateClassCdeChk_y', function(req, res, next) { //도서수정
  sql.books.update({
    col: {
      class_cde_chk: 'y'
    },
    where: [`book_cde in ('${req.body['bookCde[]'].join("', '")}')`]
  }).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    res.json(err)
  })
});
indexRouter.get('/getUserList', function(req, res, next) { //유저리스트
  const {page, listPerPage, keyword} = req.query;

  let qry = `
    SELECT 
      u.user_cde,
      u.name,
      u.tel,
      u.borrowing_limit,
      u.cur_borrowing_cnt,
        COUNT(bb.user_cde) AS overCnt
    FROM users u
    LEFT JOIN (
      SELECT
        user_cde
      FROM books_borrowed
      WHERE DATE(NOW()) > org_return_dt
      AND return_dt IS NULL
    ) bb
    ON u.user_cde = bb.user_cde
    WHERE (u.del_yn != 'y' OR u.del_yn IS NULL)
  `;

  const cntWhere = {
    where: [
      `(del_yn != 'y' OR del_yn IS NULL)`
    ]
  };
  if(keyword){
    qry += `AND (name LIKE '%${keyword}%' OR tel LIKE '%${keyword}%')
    `;

    cntWhere.where.push(`AND (name LIKE '%${keyword}%' OR tel LIKE '%${keyword}%')`);
  }

  qry += `GROUP BY u.user_cde, u.name, u.tel, u.borrowing_limit, u.cur_borrowing_cnt
    ORDER BY name
    LIMIT ${listPerPage}
    OFFSET ${(page - 1) * listPerPage}
  `;

  const rtnObj = {};

  sql.query(qry).then(res2 => {
    rtnObj.data = res2[0];
    return res2[0]
  }).then(res3 => {
    //카운트에 조건 줘야 함

    sql.users.count(cntWhere).then(res4 => {
      rtnObj.total = res4[0][0].CNT;
      res.status(200).json(rtnObj);
    })

  })
});

indexRouter.post('/regUser', function(req, res, next) { //유저등록
  sql.users.insert({
    user_cde: req.body.userCde,
    name: req.body.name,
    birth: req.body.birth,
    tel: req.body.tel,
    email: req.body.email,
    gender: req.body.gender,
    address: req.body.addr,
    borrowing_limit: req.body.borrowingLimit,
    due_period: req.body.duePeriod
  }).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    res.json(err)
  })
});

indexRouter.get('/getUserDetailByUserCde', function(req, res, next) { //유저 상세
  sql.users.select({
    where: [
      `user_cde = '${req.param('userCde')}'`
    ]
  }).then(res2 => {
    res.send(res2[0]);
  })
});

indexRouter.post('/updateUser', function(req, res, next) { //유저정보 수정
  sql.users.update({
    col: {
      name: req.body.name,
      tel: req.body.tel,
      email: req.body.email,
      gender: req.body.gender,
      birth: req.body.birth,
      address: req.body.addr,
      borrowing_limit: req.body.borrowingLimit,
      due_period: req.body.duePeriod,
    },
    where: [`user_cde = '${req.body.userCde}'`]
  }).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    res.json(err)
  })
});


indexRouter.post('/delUser', function(req, res, next) { //유저삭제(del_yn = 'y')
  sql.users.update({
    col: {
      del_yn: 'y'
    },
    where: [
      `user_cde = '${req.body.userCde}'`,
      `AND cur_borrowing_cnt = 0`
    ]
  }).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    res.json(err)
  })
});


indexRouter.post('/getUserListFromBorrow', function(req, res, next) { //유저리스트 from 대여페이지
  const keyword = req.body.userKeyword;

  let qry = `
    SELECT
      u.name,
      u.tel,
      u.user_cde,
      u.due_period,
      u.borrowing_limit,
      u.cur_borrowing_cnt
    FROM users u
    WHERE (u.del_yn != 'y' OR u.del_yn IS NULL)
    AND (u.name LIKE '%${keyword}%' OR tel LIKE '%${keyword}%')
    ORDER BY u.name;
  `;

  sql.query(qry).then(res2 => {
    res.status(200).json(res2[0]);
  })
});

indexRouter.post('/getBookFromBorrow', function(req, res, next) { //등록된 책 상세 from 대여페이지
  let qry = `
    SELECT
      book_cde,
      series_title,
      title,
      pub,
      author,
      class_cde,
      class_no
    FROM books
    WHERE book_cde = '${req.param('bookCde')}'
    AND book_sts = '1'
  `;
  sql.query(qry).then(res2 => {
    res.send(res2[0]);
  })
});


indexRouter.post('/borrow1', function(req, res, next) { //도서대여 from 대여페이지
  const {books} = req.body;
  if(!books.length) return;
  
  let multiData = '';
  let multiData2 = '';
  let book;
    
  for(let i = 0; i < books.length; i++){
    book = books[i];
    
    multiData += `('${book.bookCde}', '${book.userCde}', '${book.rtnDate}')`;
    multiData2 += `'${book.bookCde}'`;
    if(i + 1 !== books.length){
      multiData += `,
      `;
      multiData2 += `, `;
    }
  }

  let qry = `INSERT INTO books_borrowed (
    book_cde,
    user_cde,
    org_return_dt
  ) VALUES
  ${multiData}
  `;

  sql.query(qry).then(() => {
    sql.books.update({
      col: {
        book_sts: '2'
      },
      where: [`book_cde IN (${multiData2})`]
    }).then(res2 => {
      qry = `
        UPDATE users
          SET cur_borrowing_cnt = cur_borrowing_cnt + ${books.length}
        WHERE user_cde = '${books[0].userCde}'
      `;
      sql.query(qry).then(res3  => {
        res.status(200).json(res3);
      }).catch(err => {
        res.json(err);
      });
    }).catch(err => {
      res.json(err);
    })
  }).catch(err => {
    res.json(err);
  })
});

indexRouter.get('/getBorrowedBookList', function(req, res, next) { //대여리스트
  const {page, listPerPage, lentSts, keyword} = req.query;

  let qry = `
    SELECT
      bb.seq,
      bb.book_cde,
      bb.user_cde,
      bb.reg_dt,
      bb.org_return_dt,
      bb.return_dt,
      b.class_cde,
      b.series_title,
      b.title,
      b.pub,
      b.author,
      u.name
    FROM books_borrowed bb
    LEFT JOIN users u
    ON bb.user_cde = u.user_cde
    LEFT JOIN books b
    ON bb.book_cde = b.book_cde
    
  `;

  const lmt = `
    LIMIT ${listPerPage}
    OFFSET ${(page - 1) * listPerPage}
  `;

  let hasWhere = false;

  if(keyword){
    qry += `
    WHERE bb.book_cde = '${keyword}'
    OR b.title like '%${keyword}%'
    OR b.series_title like '%${keyword}%'
    OR u.name like '%${keyword}%'
    `;
    hasWhere = true;
  }

  if(lentSts){
    if(lentSts === 'over'){
      qry += `
      ${hasWhere ? 'AND' : 'WHERE'} (bb.return_dt IS NULL AND DATE(NOW()) > bb.org_return_dt)
      `;
    }else if(lentSts === 'ing'){
      qry += `
      ${hasWhere ? 'AND' : 'WHERE'} bb.return_dt IS NULL
      `;
    }
    hasWhere = true;
  }

  qry += `
    ORDER BY reg_dt DESC
  `;
  qry += lmt;

  const rtnObj = {};

  sql.query(qry).then(res2 => {
    hasWhere = false;
    rtnObj.list = res2[0];

    qry = `
      SELECT
        COUNT(*) AS CNT
      FROM books_borrowed bb
      LEFT JOIN users u
      ON bb.user_cde = u.user_cde
      LEFT JOIN books b
      ON bb.book_cde = b.book_cde
    `;

    if(keyword){
      qry += `
      WHERE bb.book_cde = '${keyword}'
      OR bb.book_cde IN (
        SELECT
          book_cde
        FROM books
        WHERE title LIKE '%${keyword}%'
        OR series_title LIKE '%${keyword}%'
      )
      OR bb.user_cde IN (
        SELECT
          user_cde
        FROM users
        WHERE users.name LIKE '%${keyword}%'
      )
      `;

      hasWhere = true;
    }

    if(lentSts){
      if(lentSts === 'over'){
        qry += `
        ${hasWhere ? 'AND' : 'WHERE'} (bb.return_dt IS NULL AND DATE(NOW()) > bb.org_return_dt)
        `;
      }else if(lentSts === 'ing'){
        qry += `
        ${hasWhere ? 'AND' : 'WHERE'} bb.return_dt IS NULL
        `;
      }

      hasWhere = true;
    }

    sql.query(qry).then(res3 => {
      
      rtnObj.listCnt = res3[0][0].CNT;
      res.status(200).json(rtnObj);
    })
  }).catch(err => {
    res.json(err);
  })
});

indexRouter.post('/getBeingBorrowedBook', function(req, res, next) { //대여중인 도서조회(대여 페이지)
  const {bookCde} = req.body;
  let qry = `
    SELECT
      bb.seq,
      bb.book_cde,
      bb.user_cde,
      bb.reg_dt,
      bb.org_return_dt,
      b.class_cde,
      b.series_title,
      b.title,
      b.pub,
      b.author,
      u.name
    FROM books_borrowed bb
    LEFT JOIN users u
    ON bb.user_cde = u.user_cde
    LEFT JOIN books b
    ON bb.book_cde = b.book_cde
    WHERE bb.return_dt IS NULL
    AND bb.book_cde = '${bookCde}'
  `;

  sql.query(qry).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    console.log(err);
  })
});

indexRouter.post('/return1', function(req, res, next) { //도서대여 from 대여페이지
  const {books} = req.body;

  if(!books.length) return;

  let multiSeq = '';
  let multiBookCde = '';
  let multiUserCde = '';
    
  for(let i = 0; i < books.length; i++){
    book = books[i];
    
    multiSeq += `'${book.seq}'`;
    multiBookCde += `'${book.book_cde}'`;
    multiUserCde += `'${book.user_cde}'`;

    if(i + 1 !== books.length){
      multiSeq += `,`;
      multiBookCde += `, `;
      multiUserCde += `, `;
    }
  }

  const updateBooksBorrowed = sql.books_borrowed.update({
    col: {
      return_dt: 'noQ(NOW())'
    },
    where: [`seq IN (${multiSeq})`]
  });
  const updateUsers = sql.users.update({
    col: {
      cur_borrowing_cnt: 'noQ(cur_borrowing_cnt - 1)'
    },
    where: [`user_cde IN (${multiUserCde})`]
  });
  const updateBooks = sql.books.update({
    col: {
      book_sts: 1
    },
    where: [`book_cde IN (${multiBookCde})`]
  }).then((res2) => {
    res.status(200).json(res2);
  });

});

indexRouter.post('/changeRtnDt', function(req, res, next) { //대여중인 도서조회(대여 페이지)
  const {seq, rtnDt} = req.body;

  sql.books_borrowed.update({
    col: {
      org_return_dt: rtnDt,    //유동적인 값 찾을 것
    },
    where: [`seq = '${seq}'`]


  }).then(res2 => {
    res.status(200).json(res2);
  }).catch(err => {
    console.log(err);
  })
});


const imageDirectory = path.join(__dirname, 'images');
//초기 디렉터리 생성
try {
	fs.readdirSync(imageDirectory); // 폴더 확인
} catch(err) {
	console.error(`'${imageDirectory}' 폴더가 없습니다. 폴더를 생성합니다.`);
  fs.mkdirSync(imageDirectory); // 폴더 생성
}

const upload = multer({
    storage: multer.diskStorage({ // 저장한공간 정보 : 하드디스크에 저장
        destination(req, file, done) { // 저장 위치
            done(null, `${imageDirectory}/`); // uploads라는 폴더 안에 저장
            //todo 게시판당 폴더하나 생성할 것
          },
          filename(req, file, done) { // 파일명을 어떤 이름으로 올릴지
            const ext = path.extname(file.originalname); // 파일의 확장자
            done(null, path.basename(file.originalname, ext) + ext); // 파일이름 + 날짜 + 확장자 이름으로 저장
        }
    }),
    // limits: { fileSize: 5 * 1024 * 1024 } // 5메가로 용량 제한
});

//게시판쪽
indexRouter.post('/regBoard', upload.array('files[]'), (req, res, next) => { //게시판 등록
  const content = req.body.content;
  console.log(content);
  
  const $ = cheerio.load(content);

  req.files.forEach((f) => {
    $('img').each((index, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      
      // data-id 속성 변경
      if(!src){
        $img.attr('src', `/${f.path}`);
        return false;
      }
    });
  });

  //todo 폴더 뒤져서 파일과 이미지태그 매치 후 파일 제거

  const modContent = $.html('body').replace('<body>', '').replace('</body>', '');


  res.send({
    code: '성공',
    content: modContent
  });

        
  

  // sql.books_borrowed.update({
  //   col: {
  //     org_return_dt: rtnDt,    //유동적인 값 찾을 것
  //   },
  //   where: [`seq = '${seq}'`]


  // }).then(res2 => {
  //   res.status(200).json(res2);
  // }).catch(err => {
  //   console.log(err);
  // })
});