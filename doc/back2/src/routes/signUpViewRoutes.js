const express = require("express");
const router = express.Router();
const signUpViewController = require("../controllers/signUpViewController");

// 회원 추가
router.get("/", signUpViewController.signUp);


module.exports = router;
