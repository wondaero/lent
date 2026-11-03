const mysql = require('mysql');

const sql = {
    connection: {
        host: '192.168.35.65',
        user: 'root',
        password: '1223334444',
        // user: 'tester',
        // password: 'fg3AFG4y#$8SDTV9e!^fg',
        database: 'lib'
    },
    query: (qry, fnc) => {
        var connection = mysql.createConnection(sql.connection);
        connection.connect();

        connection.query(qry, function (err, rows, fields) {
            if (err) {
                console.log(err);
            }

            if (typeof fnc === "function") {
                fnc(rows);
            }
        });

        connection.end();	//접속이 끊긴다.
    },
	
	// option: {
	// 	suffixTableName: '_test'
	// },
	
	getQuery: (qry, param) => {
		console.log('----------' + qry);
		console.log(param);
		
		let query = '';
    let whereCase = '';
		
		switch(qry){
			case 'getBookList': //책검색(도서관관리)
        switch(param.type){
          case 'all':
            //할지 안할지 모름
          break;
          case 'cde':
            whereCase = `AND B.book_cde = '${param.val}'`;
            break;
          case 'title':
            whereCase = `AND (B.series_title like '%${param.val}%' OR B.title like '%${param.val}%')`;
            break;
          case 'author':
            whereCase = `AND B.author_info like '%${param.val}%'`;
            break;
          case 'pub':
            whereCase = `AND B.pub_info like '%${param.val}%'`;
            break;
        }

        //rent default
        query = `SELECT
          RBH.book_cde,
          RBH.mbr_cde,
          DATE_FORMAT(RBH.rent_dt, '%Y-%m-%d') AS rent_dt,
          DATE_FORMAT(RBH.should_return_dt, '%Y-%m-%d') AS should_return_dt,
          DATE_FORMAT(RBH.return_dt, '%Y-%m-%d') AS return_dt,
          M.mbr_nm,
          B.author_cde,
          B.series_title,
          B.title,
          B.author_info,
          B.pub_info,
          B.class_no
        FROM rent_book_history RBH
        LEFT JOIN (
          SELECT
            book_cde,
            author_cde,
            series_title,
            title,
            pub_info,
            author_info,
            class_no
          FROM books
        ) B
        ON RBH.book_cde = B.book_cde
        LEFT JOIN (
          SELECT
            mbr_cde,
            mbr_nm
          FROM members
        ) M
        ON RBH.mbr_cde = M.mbr_cde
        WHERE 1 = 1
        AND RBH.return_dt IS NULL`;

        switch(param.bookFilter){
          case 'all':
            query = `SELECT
              B.book_cde,
              RBH.mbr_cde,
              DATE_FORMAT(RBH.rent_dt, '%Y-%m-%d') AS rent_dt,
              DATE_FORMAT(RBH.should_return_dt, '%Y-%m-%d') AS should_return_dt,
              DATE_FORMAT(RBH.return_dt, '%Y-%m-%d') AS return_dt,
              M.mbr_nm,
              B.author_cde,
              B.series_title,
              B.title,
              B.author_info,
              B.pub_info,
              B.class_no
            FROM books B
            LEFT JOIN (
              SELECT
                book_cde,
                mbr_cde,
                rent_dt,
                return_dt,
                should_return_dt
              FROM rent_book_history
              WHERE return_dt IS NULL
            ) RBH
            ON B.book_cde = RBH.book_cde
            LEFT JOIN (
              SELECT
                mbr_cde,
                mbr_nm
              FROM members
            ) M
            ON RBH.mbr_cde = M.mbr_cde
            WHERE 1 = 1`;

            break;
          case 'rent':

            break;
          case 'overdue':
            query += `
              AND DATE_FORMAT(NOW(), '%Y-%m-%d') > RBH.should_return_dt`;

            break;
        }

        query += `
          ${whereCase}
          LIMIT ${param.cnt} OFFSET ${param.offset}`;

		  	break;

      case 'getTotalBookCnt': // total책권수(도서관관리)
        switch(param.type){
          case 'all':
            //할지 안할지 모름
          break;
          case 'cde':
            whereCase = `AND B.book_cde = '${param.val}'`;
            break;
          case 'title':
            whereCase = `AND (B.series_title like '%${param.val}%' OR B.title like '%${param.val}%')`;
            break;
          case 'author':
            whereCase = `AND B.author_info like '%${param.val}%'`;
            break;
          case 'pub':
            whereCase = `AND B.pub_info like '%${param.val}%'`;
            break;
        }

        query = `SELECT
            COUNT(*) AS CNT
          FROM books B
          WHERE 1 = 1
        ${whereCase}`;
		  	break;

      case 'getTotalRentBookCnt': // total빌린책권수(도서관관리)
        switch(param.type){
          case 'all':
            //할지 안할지 모름
          break;
          case 'cde':
            whereCase = `AND B.book_cde = '${param.val}'`;
            break;
          case 'title':
            whereCase = `AND (B.series_title like '%${param.val}%' OR B.title like '%${param.val}%')`;
            break;
          case 'author':
            whereCase = `AND B.author_info like '%${param.val}%'`;
            break;
          case 'pub':
            whereCase = `AND B.pub_info like '%${param.val}%'`;
            break;
        }

        query = `SELECT
            COUNT(*) AS CNT
          FROM rent_book_history RBH
          LEFT JOIN books B
          ON RBH.book_cde = B.book_cde
          WHERE RBH.return_dt IS NULL
          ${whereCase}`;
        break;

      case 'getTotalOverdueBookCnt': // total연체된책권수(도서관관리)
        switch(param.type){
          case 'all':
            //할지 안할지 모름
          break;
          case 'cde':
            whereCase = `AND B.book_cde = '${param.val}'`;
            break;
          case 'title':
            whereCase = `AND (B.series_title like '%${param.val}%' OR B.title like '%${param.val}%')`;
            break;
          case 'author':
            whereCase = `AND B.author_info like '%${param.val}%'`;
            break;
          case 'pub':
            whereCase = `AND B.pub_info like '%${param.val}%'`;
            break;
        }

        query = `SELECT
            COUNT(*) AS CNT
          FROM rent_book_history RBH
          LEFT JOIN books B
          ON RBH.book_cde = B.book_cde
          WHERE RBH.return_dt IS NULL
          AND DATE_FORMAT(NOW(), '%Y-%m-%d') > RBH.should_return_dt
          ${whereCase}`;

        break;
      
      case 'getBookInfo': //책정보(도서관관리)
        query = `SELECT
          B.book_cde,
          B.author_cde,
          B.isbn,
          B.isbn2,
          B.series_title,
          B.title,
          B.pub_info,
          B.author_info,
          B.series_no,
          B.claim_no,
          B.copy_no,
          B.class_no,
          B.pub_year_info,
          B.with_things,
          B.book_sts,
          DATE_FORMAT(RBH.should_return_dt, '%Y-%m-%d') AS should_return_dt
        FROM books B
        LEFT JOIN (
          SELECT
            book_cde,
            mbr_cde,
            should_return_dt
          FROM rent_book_history
          WHERE return_dt IS NULL
        ) RBH
        ON B.book_cde = RBH.book_cde
        WHERE B.book_cde = '${param.bookCde}'`;

        break;

        
      case 'getMembersByRentBook':  //책을 빌린 유저(도서관관리)
        query = `SELECT
          DATE_FORMAT(RBH.rent_dt,'%Y-%m-%d') AS rent_dt,
          DATE_FORMAT(RBH.return_dt,'%Y-%m-%d') AS return_dt,
          DATE_FORMAT(RBH.should_return_dt,'%Y-%m-%d') AS should_return_dt,
          M.mbr_nm,
          M.mbr_cde,
          M.mbr_id,
          M.mbr_tel,
          DATE_FORMAT(CURDATE(),'%Y-%m-%d') AS today
        FROM rent_book_history RBH
        LEFT JOIN members M
        ON RBH.mbr_cde = M.mbr_cde
        WHERE RBH.book_cde = '${param.bookCde}'
        ${param.type == 'overdue' ? 'AND should_return_dt < return_dt' : ''}
        ${param.type == 'monthly' ? 'AND rent_dt BETWEEN DATE_ADD(CURDATE(), INTERVAL -1 MONTH) AND CURDATE()' : ''}
        ORDER BY RBH.rent_history_seq DESC`;

        break;

		}
		
		console.log(query);
		console.log(qry + '----------');
		return query;
	}
}

module.exports = sql;