const mysql = require('mysql2');

const sql = new MYSQL();

function MYSQL () {
  const t = this;

  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1223334444',
    database: 'lib'
  });

  const promisePool = pool.promise();

  const showTable = async () => {
    return await promisePool.query('show tables');
  }

  t.init = () => {
    t.query = async(qry) => {
      console.log(qry);
      console.log('##############################');
      return await promisePool.query(qry);
    }

    showTable()
      .then(res => {
        res[0].forEach((table) => {
          const tbNm = table[Object.keys(table)];

          t[tbNm] = {

            async query(qry){ //지워도 됨
              console.log(qry);
              console.log('##############################');
              return await promisePool.query(qry);
            },

            async count(obj){
              let qry = `
              SELECT
              `;
              
              if(obj === undefined){
                console.log(`select count(*) AS CNT from ${tbNm}`);
                console.log('##############################');
                return await promisePool.query(`select count(*) AS CNT from ${tbNm}`);
              }

              if(obj.col) qry += `count${obj.col}`;
              else qry += 'count(*)';

              if(obj.as) qry += ` AS ${obj.as}`;
              else qry += ' AS CNT';

              qry += `
              FROM ${tbNm}`;

              if(obj.where){
                qry += `
                WHERE `;
                qry += obj.where.join(`
                `);
              }

              console.log(qry);
              console.log('##############################');
  
              return await promisePool.query(qry);
            },
            async select(obj){
              let qry = `
              SELECT
              `;
              if(obj === undefined){
                // query(`select * from ${tbNm} limit 1`, row => row);
                return await promisePool.query(`select * from ${tbNm} limit 2`);
              }
  
              if(obj.hiddenCol){
                //히든컬럼 추가하게 되면
              }else{
                if(obj.col){
                  qry += obj.col.join(`,
                `);
                }else{
                  qry += '*';
                }
              }
  
              qry += `
              FROM ${tbNm}`;
              if(obj.where){
                qry += `
                WHERE `;
                qry += obj.where.join(`
                `);
              }

              if(obj.orderBy){
                qry += `
                ORDER BY `;
                qry += obj.orderBy.join(', ');
              }

              console.log(qry);
              console.log('##############################');
              return await promisePool.query(qry);
            },
            async delete(obj){
              let qry = `DELETE FROM ${tbNm}
              `;

              if(obj.where){
                qry += `
                WHERE `;
                qry += obj.where.join(`
                `);
              }

              console.log(qry);
              console.log('##############################');
              return await promisePool.query(qry);
            },
            async update(obj){
              if(obj === undefined || typeof obj !== 'object') return;
              let qry = `UPDATE ${tbNm} SET
              `;

              const colCnt = Object.keys(obj.col).length;
              let colIdx = 0;
  
              for(let key in obj.col){
                let val = `'${obj.col[key]}'`;
                if(val.indexOf('noQ(') === 1 && val[val.length - 2] === ')'){
                  val = val.substring(5, val.length - 2);
                }

                if(colIdx < colCnt - 1){
                  qry += `${key} = ${val},
                  `;
                }else{
                  qry += `${key} = ${val}
                  `;
                }

                colIdx++;
              }
  
              if(obj.where){
                qry += `WHERE `;
                qry += obj.where.join(`
                `);
              }
  
              console.log(qry);
              console.log('##############################');
              return await promisePool.query(qry);
            },
            async insert(obj){
              if(obj === undefined || typeof obj !== 'object') return;
  
              const cols = [];
              const vals = [];
              
              for(let key in obj){
                if(obj[key] === undefined) continue;
                cols.push(key);
                vals.push(`'${obj[key]}'`);
              }
              
              let qry = `
              INSERT INTO ${tbNm} (
                ${cols.join(`,
                `)}
              ) VALUES (
                ${vals.join(`,
                `)}
              )
              `
  
              console.log(qry);
              console.log('##############################');
              return await promisePool.query(qry);
            }
          }
        });
      })

  }

  t.init();

}
module.exports = sql;