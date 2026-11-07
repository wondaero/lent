const sql = require('../db/sql.js');
const table = 'loan';

async function addLoan(params){
    const values = [+params.id];
    let qry = `
        INSERT 
    `;
}
async function getBookListByMember(params){
    const values = [+params.id];
    let qry = `
        SELECT
            l.loan_dt,
            l.due_dt,
            l.due_dt2,
            l.return_dt,
            b.title,
            b.author_info,
            b.pub_info,
            b.book_cde,
            b.author_cde,
            b.class_no
        FROM loan l
        LEFT JOIN books b
        ON l.book_id_ref = b.book_id
        WHERE l.member_id_ref = ?
    `

    if(params.filter.indexOf('m') === 0){   //12개월도 포함(1년)
        const mValue = params.filter.split('m')[1];
        qry += `
            AND l.loan_dt > DATE_SUB(NOW(), INTERVAL ${mValue} MONTH)
        `;
    }else if(params.filter === 'ing'){
        qry += `
            AND l.return_dt IS NULL
        `;
    }else if(params.filter === 'cstm'){

        qry += `
            AND l.loan_dt >= ? AND l.loan_dt <= ? 
        `;

        values.push(`${params.bookFrom + ' 00:00:00'}`);
        values.push(`${params.bookTo + ' 23:59:59'}`);

    }else if(params.filter === 'all'){
        //여기는 all이라서 할게 없음
    }

    qry+= `
        ORDER BY l.loan_dt DESC
    `;

    return await sql.query(qry, values);
}
async function getMemberListByBook(params){
    const values = [+params.id];
    let qry = `
        SELECT
            l.loan_dt,
            l.due_dt,
            l.due_dt2,
            l.return_dt,
            m.member_id,
            m.mbr_nm,
            m.mbr_tel
        FROM loan l
        LEFT JOIN members m
        ON l.member_id_ref = m.member_id
        WHERE l.book_id_ref = ?
    `

    if(params.filter.indexOf('m') === 0){   //12개월도 포함(1년)
        const mValue = params.filter.split('m')[1];
        qry += `
            AND l.loan_dt > DATE_SUB(NOW(), INTERVAL ${mValue} MONTH)
        `;
    }else if(params.filter === 'ing'){
        qry += `
            AND l.return_dt IS NULL
        `;
    }else if(params.filter === 'cstm'){

        qry += `
            AND l.loan_dt >= ? AND l.loan_dt <= ? 
        `;

        values.push(`${params.memberFrom + ' 00:00:00'}`);
        values.push(`${params.memberTo + ' 23:59:59'}`);
    }else if(params.filter === 'all'){
        //여기는 all이라서 할게 없음
    }

    qry+= `
        ORDER BY l.loan_dt DESC
    `;

    return await sql.query(qry, values);
}

module.exports = {
    getBookListByMember,
    getMemberListByBook,
    addLoan,
};