require("dotenv").config();

const express = require("express");
const cors = require('cors');
const helmet = require("helmet");
const { verifyToken } = require("./middleware/auth.js");

const axios = require('axios');
const xmlParser =  require("./utils/xmlParser.js");
const cookieParser = require("cookie-parser");

const bookRoutes = require("./routes/bookRoutes.js");
const memberRoutes = require("./routes/memberRoutes.js");
const loanRoutes = require("./routes/loanRoutes.js");
const signUpRoutes = require("./routes/signUpRoutes.js");
const signUpViewRoutes = require("./routes/signUpViewRoutes.js");
const signInRoutes = require("./routes/signInRoutes.js");
const signInViewRoutes = require("./routes/signInViewRoutes.js");

const app = express();
const path = require('path');

// EJS 뷰 엔진 설정
app.set('view engine', 'ejs');

// views 폴더 경로 설정
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.urlencoded({ extended: true }));



app.use(cors({
  origin: process.env.ADMIN_URL, // 프론트엔드 주소
  credentials: true                // 쿠키/세션 공유 필요할 때
}));

// 모든 origin 허용 (개발용, 보안 낮음)
// app.use(cors());
// app.use(helmet());

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        formAction: [
          "'self'",
          process.env.LOGIN_URL,  //로그인 페이지
          process.env.ADMIN_URL,  //관리자 페이지
        ],
        frameAncestors: ["'self'"],
      },
    },
  })
);


// app.use(
//   helmet({
//     contentSecurityPolicy: {
//       directives: {
//         defaultSrc: ["'self'"],
//         scriptSrc: ["'self'", "'unsafe-inline'"],
//         styleSrc: ["'self'", "https:", "'unsafe-inline'"],
//         imgSrc: ["'self'", "data:", "https:"],
//         formAction: ["'self'"] // localhost:3000만 허용
//       },
//     },
//   })
// );





const PORT = process.env.PORT;

// app.get("/", (req, res) => {
//   res.send("Hello, Library!");
// });

// app.listen(PORT, () => {
//   console.log(`Server running on http://localhost:${PORT}`);
// });





// index.js
// import { listMembers } from "./controllers/memberController.js";


// 1. JSON 파싱 미들웨어
app.use(express.json());
app.use(cookieParser());


app.use("/api/books", verifyToken, bookRoutes);
app.use("/api/members", verifyToken, memberRoutes);
app.use("/api/loan", verifyToken, loanRoutes);
app.use("/api/signIn", signInRoutes);
app.use("/api/signUp", signUpRoutes);
app.use("/signUp", signUpViewRoutes);
app.use("/signIn", signInViewRoutes);


app.get('/test', (req, res) => {
  res.send('서버 연결 성공!');
});


app.post('/api/getBookListByIsbn', function(req, res) { //책등록페이지(ISBN으로 검색)
  axios.get(`http://nl.go.kr/kolisnet/openApi/open.php?gubun1=ISBN&code1=${req.body.isbn}`, {rejectUnauthorized: false})
  .then((res2)=>{
    let record = xmlParser.extractTagAsJson(res2.data, "RECORD");
    const r0 = record[0];
    if(!r0){
      res.json([]);
    }else{
      res.json(!Array.isArray(r0) ? [r0] : r0);
    }
  }).catch((err)=>{
     console.log(err);
  })
});


app.post('/api/getBookDetailByRecKey', function(req, res) { //책등록페이지(ISBN으로 검색(detail))
  axios.get(`http://nl.go.kr/kolisnet/openApi/open.php?rec_key=${req.body.recKey}`)
  .then((res2)=>{
    const bibInfos = xmlParser.extractTagAsJson(res2.data, "BIBINFO");
    const b0 = bibInfos[0];
    if(!b0){
      res.json([]);
    }else{
      res.json(!Array.isArray(b0) ? [b0] : b0);
    }
  }).catch((err)=>{
     console.log(err);
  })
});




// 2. 로깅 미들웨어
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next(); // 다음으로 이동
});


// 4. 에러 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
