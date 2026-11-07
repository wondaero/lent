const sql = require('../db/sql.js');
const table_b = 'books';

async function getBookList(params) {
    const values = [];

    let qry = `
        SELECT
            b.book_id,
            b.book_cde,
            b.author_cde,
            b.series_title,
            b.series_no,
            b.title,
            b.author_info,
            b.pub_info,
            b.class_no,
            b.reg_dt,
            m.mbr_nm,
            CASE
                WHEN l.book_id_ref IS NULL THEN NULL
                WHEN CURRENT_DATE > COALESCE(l.due_dt2, l.due_dt) THEN 1
                ELSE 0
            END AS is_overdue
        FROM books b
        LEFT JOIN loan l
            ON b.book_id = l.book_id_ref
            AND l.return_dt is null
        LEFT JOIN members m
            ON l.member_id_ref = m.member_id
        WHERE 1 = 1
    `;

    const whereFnc = commonWhere2(params);

    qry += whereFnc.qry;
    values.push(...whereFnc.values);

    qry +=`
        ORDER BY b.book_id DESC
    `

    if(params.all !== 'true'){
        qry+= `
            LIMIT ? OFFSET ?
        `;
    }

    values.push(+params.limit);
    values.push(+params.offset);
    
    return await sql.query(qry, values);
}
async function getAlreadyBook(params) {
    const qry = `
        SELECT
            author_cde,
            series_title,
            series_no,
            title,
            author_info,
            pub_info,
            pub_year_info,
            class_no
        FROM books
        WHERE isbn = ?
        LIMIT 1
    `;

    return await sql.query(qry, [params.keyword]);
}
async function getAlreadyBookCnt(params) {
    return await sql[table_b].count({
        where: [
            {and: {isbn: params.keyword}}
        ]
    });
}
async function getBookCount(params) {
    const values = [];

    let qry = `
        SELECT COUNT(*) AS CNT
        FROM books b
        WHERE 1 = 1
    `;

    const whereFnc = commonWhere2(params);

    qry += whereFnc.qry;
    values.push(...whereFnc.values);

    return await sql.query(qry, values);
}
async function getFilteredBookCount(params) {
    const values = [];

    let qry = `
        SELECT
            COUNT(*) AS CNT
        FROM
        loan l
        LEFT JOIN books b ON l.book_id_ref = b.book_id
        WHERE l.return_dt IS NULL
    `;

    if(params && (params.keyword === 0 || params.keyword)){
        values.push(params.keyword);

        if(params.searchType === 'bookCode'){
            qry += `
                AND b.book_cde = ?
            `
        }
        else if(params.searchType === 'title'){
            qry += `
                AND b.title LIKE CONCAT('%', ?, '%')
            `
        }
        else if(params.searchType === 'author'){
            qry += `
                AND b.author_info LIKE CONCAT('%', ?, '%')
            `
        }
        else if(params.searchType === 'pub'){
            qry += `
                AND b.pub_info LIKE CONCAT('%', ?, '%')
            `
        }
    }
    
    if(params.filter === 'over'){
        qry += `
            AND CURRENT_DATE > COALESCE(l.due_dt2, l.due_dt)
        `
    }

    return await sql.query(qry, values);
}
async function getBookDetail(id){
    let qry = `
        SELECT
            b.isbn,
            b.series_title,
            b.title,
            b.pub_info,
            b.pub_year_info,
            b.author_info,
            b.series_no,
            b.reg_dt,
            b.class_no,
            b.book_cde,
            b.author_cde,
            b.author_cde_chk,
            b.book_sts,
            b.copy_no,
            b.memo
        FROM books b
        WHERE b.book_id = ?
    `;

    return await sql.query(qry, [+id]);
}

async function getHasNoAuthorCdeBookCount() {
    const values = [];

    let qry = `
        SELECT COUNT(*) AS CNT
        FROM books b
        WHERE author_cde_chk = 'n'
    `;

    return await sql.query(qry, values);
}

async function addBook(params){
    return await sql[table_b].insert({
        col: params
    });
}
async function updateBook(id, params){
    return await sql[table_b].update({
        col: params,
        where: [
            {and: {book_id: id}}
        ]
    });
}
async function deleteBook(id){
    return await sql[table_b].update({
        col: [{book_sts: 4}],
        where: [
            {and: {book_id: id}}
        ]
    });
}

async function getBookInfo(params) {
    const values = [];

    let qry = `
        SELECT
            b.book_id,
            b.book_cde,
            b.author_cde,
            b.series_title,
            b.series_no,
            b.title,
            b.author_info,
            b.pub_info,
            b.class_no,
            l.rent_history_seq,
            l.loan_dt,
            COALESCE(l.due_dt2, l.due_dt) AS due_dt,
            CASE
                WHEN l.book_id_ref IS NULL THEN NULL
                WHEN CURRENT_DATE > COALESCE(l.due_dt2, l.due_dt) THEN 1
                ELSE 0
            END AS is_overdue,
            m.mbr_nm
        FROM books b
        LEFT JOIN loan l
            ON b.book_id = l.book_id_ref
            AND l.return_dt is null
        LEFT JOIN members m
            ON l.member_id_ref = m.member_id
        WHERE 1 = 1
    `;

    const whereFnc = commonWhere2(params);

    qry += whereFnc.qry;
    values.push(...whereFnc.values);

    return await sql.query(qry, values);
}

function commonWhere2(params){
    let qry = '';
    const values = [];

    if(params && (params.keyword === 0 || params.keyword)){
        values.push(params.keyword);

        if(params.searchType === 'bookCode'){
            qry += `
                AND b.book_cde = ?
            `
        }
        else if(params.searchType === 'title'){
            qry += `
                AND b.title LIKE CONCAT('%', ?, '%')
            `
        }
        else if(params.searchType === 'author'){
            qry += `
                AND b.author_info LIKE CONCAT('%', ?, '%')
            `
        }
        else if(params.searchType === 'pub'){
            qry += `
                AND b.pub_info LIKE CONCAT('%', ?, '%')
            `
        }
    }


    const allowedFilters = ['del', 'ing', 'over', 'hold', 'read'];

    if(params && params.filter && allowedFilters.includes(params.filter)){
        //all은 where조건이 필요 없을 듯
        if(params.filter === 'del'){
            qry += `
                AND b.book_sts = '4'
            `;
        }else{
            qry += `
                AND b.book_sts <> '4'
            `;

            if(params.filter === 'ing'){
                qry += `
                    AND l.book_id_ref IS NOT NULL
                `;
            }else if(params.filter === 'over'){
                qry += `
                    AND l.book_id_ref IS NOT NULL
                    AND CURRENT_DATE > COALESCE(l.due_dt2, l.due_dt)
                `;
            }else if(params.filter === 'hold'){
                qry += `
                    AND b.book_sts = '1'
                `;
            }else if(params.filter === 'read'){
                qry += `
                    AND b.book_sts = '2'
                `;
            }
        }
    }else{
        qry += `
            AND b.book_sts <> '4'
        `;
    }

    return {
        qry, values
    }
}

module.exports = {
    getBookList,
    getAlreadyBook,
    getAlreadyBookCnt,
    getBookCount,
    getFilteredBookCount,
    getBookDetail,
    addBook,
    updateBook,
    deleteBook,

    getBookInfo,    //대여페이지에서 챋 검색

    getHasNoAuthorCdeBookCount,
  };