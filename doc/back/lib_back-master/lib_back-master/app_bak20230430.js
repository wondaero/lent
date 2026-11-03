let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');

const cors = require('cors');
const sql = require("./sql");

let indexRouter = require('./routes/index');
let usersRouter = require('./routes/users');

const axios = require('axios');

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
  // res.send("JUST TEST");
  res.send("JUST TEST");
});


indexRouter.post('/getBookInfoByIsbn', function(req, res, next) { //책등록페이지(ISBN으로 검색)
  axios.get(`http://nl.go.kr/kolisnet/openApi/open.php?gubun1=ISBN&code1=${req.body.isbn}`, {rejectUnauthorized: false}).then((Response)=>{
    res.send( Response.data);
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

indexRouter.get('/getBookList', function(req, res, next) { //책검색(도서관관리)
  let tmpData = {};
  tmpData.bookFilter = req.param('bookFilter');
  tmpData.type = req.param('type');
  tmpData.val = req.param('value');
  tmpData.cnt = req.param('cnt');
  tmpData.offset = req.param('offset');

  console.log('-----1번째-----')
  sql.query(sql.getQuery('getBookList', tmpData), function(rows) {
    let queryNm;
    switch(tmpData.bookFilter){
      case 'all':
        queryNm = 'getTotalBookCnt';
        break;
        case 'rent':
        queryNm = 'getTotalRentBookCnt';
        break;
        case 'overdue':
        queryNm = 'getTotalOverdueBookCnt';
        break;
    }
    console.log('-----2번째-----')
    sql.query(sql.getQuery(queryNm, tmpData), function(rows2) {
      let rtnData = {};
      rtnData.list = rows;
      rtnData.totalCnt = rows2[0]['CNT'];
      res.send(rtnData);
    });
	});
});

indexRouter.post('/getBookInfo', function(req, res, next) {  //책정보(도서관관리)
  sql.query(sql.getQuery('getBookInfo', req.body), function(rowz) {
    res.send(rowz);
  });
});

indexRouter.post('/getMembersByRentBook', function(req, res, next) {  //책을 빌린 유저(도서관관리)
  sql.query(sql.getQuery('getMembersByRentBook', req.body), function(rowz) {
    res.send(rowz);
  });
});
