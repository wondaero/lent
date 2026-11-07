const sql = require('../db/sql.js');
const users = 'users';

async function signIn(params) {
    return await sql[users].select({
        where: [
            {and: {id: params.id}},
            {and: {status: 'y'}}
        ]
    });
}

module.exports = {
    signIn,
};