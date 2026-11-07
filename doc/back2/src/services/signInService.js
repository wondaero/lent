// services/signInService.js
const argon2 = require('argon2');
const signInModel = require("../models/signInModel");

// 계정 조회
async function signIn(params) {
  const user = await signInModel.signIn(params);

  if (!user || !Array.isArray(user[0]) || !user[0][0]) return false;

  // 비밀번호 검증
  const match = await argon2.verify(user[0][0].password, params.password);

  return {
    id: user[0][0].id,
    match
  };
}

module.exports = {
  signIn,
};
