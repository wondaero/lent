// services/signUpService.js
const argon2 = require('argon2');
const signUpModel = require("../models/signUpModel");

// 계정 추가
async function signUp(params) {
  const userData = [];
  for(let key in params){
    if(key === 'password'){
      userData.push({[key]: await argon2.hash(params[key])});
    }else{
      userData.push({[key]: params[key]});
    }
  }

  const user = await signUpModel.signUp(userData);

  return user;
}

module.exports = {
  signUp,
};
