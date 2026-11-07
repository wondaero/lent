const sql = require('../db/sql.js');
const table = 'members';

async function getMemberList(params) {
    const values = [];

    let qry = `
        SELECT
            m.member_id,
            m.mbr_nm,
            m.mbr_tel,
            m.mbr_mx_cnt,
            m.reg_dt,
            COUNT(l.member_id_ref) AS loan_count,
            MAX(
                CASE
                    WHEN CURRENT_DATE > COALESCE(l.due_dt2, l.due_dt) THEN 1
                    ELSE 0
                END
            ) AS is_overdue
        FROM members m
        LEFT JOIN loan l
            ON m.member_id = l.member_id_ref
            AND l.return_dt is null
        WHERE (m.status <> '4' OR m.status IS NULL)
    `;

    //m.status IS NULL은 제거할 예정(db에 값이 입력되면)

    if(params && (params.keyword === 0 || params.keyword)){
        values.push(params.keyword);

        if(params.searchType === 'all'){
            qry += `
                AND (
                    mbr_nm LIKE CONCAT('%', ?, '%')
                    OR
                    mbr_tel LIKE CONCAT('%', ?, '%')
                )
            `
            values.push(params.keyword);

        }else if(params.searchType === 'name'){
            qry += `
                AND mbr_nm LIKE CONCAT('%', ?, '%')
            `
        }
        else if(params.searchType === 'tel'){
            qry += `
                AND mbr_tel LIKE CONCAT('%', ?, '%')
            `
        }
    }

    qry +=`
        GROUP BY m.member_id, m.mbr_nm, m.mbr_tel, m.mbr_mx_cnt
    `;

    if(params && params.filter){
        //all은 where조건이 필요 없을 듯
        if(params.filter === 'ing'){
            qry += `
                HAVING COUNT(l.member_id_ref) > 0
            `;
        }else if(params.filter === 'over'){
            qry += `
                HAVING MAX(
                    CASE
                    WHEN CURRENT_DATE > COALESCE(l.due_dt2, l.due_dt) THEN 1
                    ELSE 0
                    END
                ) = 1
            `;
        }
    }

    qry +=`
        ORDER BY m.mbr_nm
    `

    if(params.all !== 'true'){
        qry+= `
            LIMIT ${params.limit} OFFSET ${params.offset}
        `;
    }

    values.push(params.limit);
    values.push(params.offset);

    return await sql.query(qry, values);
}
async function getMemberCount(params) {
    const values = [];
    let alreadyWhere = false;

    let qry = `
        SELECT COUNT(*) AS CNT
        FROM members m
        WHERE (m.status <> '4' OR m.status IS NULL)
    `;

    if(params && (params.keyword === 0 || params.keyword)){
        alreadyWhere = true;
        values.push(params.keyword);

        if(params.searchType === 'all'){
            qry += `
                AND (mbr_nm LIKE CONCAT('%', ?, '%')
                OR mbr_tel LIKE CONCAT('%', ?, '%'))
            `
            values.push(params.keyword);

        }else if(params.searchType === 'name'){
            qry += `
                AND mbr_nm LIKE CONCAT('%', ?, '%')
            `
        }
        else if(params.searchType === 'tel'){
            qry += `
                AND mbr_tel LIKE CONCAT('%', ?, '%')
            `
        }
    }

    return await sql.query(qry, values);
}
async function getFilteredMemberCount(params) {
    const values = [];

    let qry = `
        SELECT
            COUNT(DISTINCT l.member_id_ref) AS CNT
        FROM
        loan l
        LEFT JOIN members m ON l.member_id_ref = m.member_id
        WHERE l.return_dt IS NULL
        AND (m.status <> '4' OR m.status IS NULL) 
    `;

    if(params && (params.keyword === 0 || params.keyword)){
        values.push(params.keyword);

        if(params.searchType === 'all'){
            qry += `
                AND (m.mbr_nm LIKE CONCAT('%', ?, '%')
                OR m.mbr_tel LIKE CONCAT('%', ?, '%'))
            `
            values.push(params.keyword);

        }else if(params.searchType === 'name'){
            qry += `
                AND m.mbr_nm LIKE CONCAT('%', ?, '%')
            `
        }
        else if(params.searchType === 'tel'){
            qry += `
                AND m.mbr_tel LIKE CONCAT('%', ?, '%')
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

async function getMemberDetail(id){
    let qry = `
        SELECT
            m.mbr_nm,
            m.mbr_tel,
            m.mbr_birth,
            m.mbr_gender,
            m.mbr_address,
            m.mbr_mx_cnt,
            m.mbr_mx_date,
            m.status,
            m.memo,
            m.reg_dt
        FROM members m
        WHERE m.member_id = ?
    `;

    return await sql.query(qry, [+id]);
}

async function addMember(params){
    return await sql.members.insert({
        col: params
    });
}
async function updateMember(id, params){
    return await sql.members.update({
        col: params,
        where: [
            {and: {member_id: id}}
        ]
    });
}
async function deleteMember(id){
    return await sql.members.update({
        col: [{status: 4}],
        where: [
            {and: {member_id: id}}
        ]
    });
}

/**
 * 대여/반납 페이지에서 회원 찾을 때
 * @param {*} id 
 * @returns 
 */
async function getMemberDetailWithBook(id){
    let qry = `
        SELECT
            m.member_id,
            m.mbr_nm,
            m.mbr_tel,
            m.mbr_birth,
            m.mbr_gender,
            m.mbr_address,
            m.mbr_mx_cnt,
            m.mbr_mx_date,
            m.status,
            m.memo,
            m.reg_dt,
            COUNT(l.member_id_ref) AS loan_count
        FROM members m
        LEFT JOIN loan l
        ON m.member_id = l.member_id_ref
        AND l.return_dt is NULL
        WHERE m.member_id = ?
    `;

    return await sql.query(qry, [+id]);
}





module.exports = {
    getMemberList,
    getMemberCount,
    getFilteredMemberCount,
    getMemberDetail,
    // getMember,
    addMember,
    updateMember,
    deleteMember,

    getMemberDetailWithBook,
  };