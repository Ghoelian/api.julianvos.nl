const express = require('express')
const argon2 = require('argon2')
const router = express.Router()
const sql = require('../lib/sql')

const argon2Options = {
  type: argon2.argon2d,
  memoryCost: 2 ** 16,
  hashLength: 32,
  associatedData: Buffer.from(process.env.ARGON2_ASSOCIATED_DATA)
}

router.post('/register', (req, res) => {
  const hash = argon2.hash(req.body.password, argon2Options, (err, data) => {
    if (err) throw err

    sql.query(`INSERT INTO api.login (username, hash, createdAt, email) VALUES (${req.body.username}, ${hash}, ${new Date().timestamp()}, ${req.body.email})`, (err) => {
      if (err) throw err
    })
  })
})

module.exports = router
