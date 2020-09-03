const mysql = require('mysql')

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB
})

const query = (query, callback) => {
  pool.query(query, (err, results, fields) => {
    if (err) return callback(err, null)
    return callback(null, results)
  })
}

exports.query = query
