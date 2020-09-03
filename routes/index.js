const express = require('express')
const router = express.Router()
const sql = require('../lib/sql')

router.get('/', (req, res) => {
  sql.query(`SELECT * FROM shortener.tracking WHERE ip = '${req.ip.substr(0, 7) === '::ffff:' ? req.ip.substr(7) : req.ip}'`, (err, result) => {
    if (err) {
      res.status(500)
      res.end()
      throw err
    }
    res.write(`
  <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>api.julianvos.nl</title>
      </head>

      <style>
      table {
        width: 100%;
      }

      table, th, td {
        border: 1px solid black;
        border-collapse: collapse;
      }
      </style>
      
      <body>
        <p>
          <b>If you wish to have your information removed from my databases, please send me an <a href="mailto://dataremoval@julianvos.nl">email</a>.</b>
        </p>
        <p>
          The redirect route of this API only stores your IP address. Everything else is derived from either the URL structure or the IP address itself.<br />
          The API retrieves a very broad approximation of the location of the IP address form <a href="https://ipinfo.io">IPinfo</a>.<br />
          Here is all of the data we have collected from your current IP address, ${req.ip.substr(0, 7) === '::ffff:' ? req.ip.substr(7) : req.ip}.
        </p>
        <table>
        <tr>
          <th>IP address</th>
          <th>Date</th>
          <th>Origin</th>
          <th>Destination</th>
          <th>City</th>
          <th>Region</th>
          <th>Country</th>
        </tr>
        `)

    Object.keys(result).forEach((item) => {
      const items = result[item]
      const date = new Date(items.date * 1000)
      const year = date.getFullYear()
      const month = ('0' + (date.getMonth() + 1)).substr(-2)
      const day = ('0' + date.getDate()).substr(-2)
      const hours = date.getHours()
      const minutes = ('0' + date.getMinutes()).substr(-2)

      res.write(`
      <tr>
        <td>${items.ip}</td>
        <td>${day}/${month}/${year} ${hours}:${minutes}</td>
        <td>${items.destination}</td>
        <td>${items.origin}</td>
        <td>${items.city}</td>
        <td>${items.region}</td>
        <td>${items.country}</td>
      </tr>
      `)
    })

    res.write(`</table>
        <footer>
          <a href="https://julianvos.nl/privacy_policy">Privacy Policy</a><br/>
          <a href="https://julianvos.nl/terms_of_service">Terms of Service</a>
        </footer>
      </body>
      </html>
  `)
    res.status(200)
    res.end()
  })
})

module.exports = router
