const sql = require('../db/sql.js');
const users = 'users';

async function signUp(params) {
    return await sql[users].insert({
        col: params
    });
}

module.exports = {
    signUp,
};