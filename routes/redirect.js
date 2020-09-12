const express = require('express')
const router = express.Router()
const https = require('https')
const sql = require('../lib/sql')
const discord = require('discord.js')
const _discord = require('../lib/discord')

router.get('/', (req, res) => {
  if (req.query.destination !== undefined) {
    const destination = req.query.destination

    res.redirect(302, destination)
    res.end()

    let date = null
    let year = null
    let month = null
    let day = null
    let hours = null
    let minutes = null

    if (req.query.date !== undefined) {
      // req.query.date === 1599923986910
      date = new Date(parseInt(req.query.date))
      console.log(date)

      year = date.getFullYear()
      month = ('0' + (date.getMonth() + 1)).substr(-2)
      day = ('0' + date.getDate()).substr(-2)
      hours = date.getHours()
      minutes = ('0' + date.getMinutes()).substr(-2)
    }

    const origin = req.query.origin
    const fullDate = req.query.date !== undefined ? `${day}/${month}/${year} ${hours}:${minutes}` : 'No date in URL.'
    const ip = req.ip.substr(0, 7) === '::ffff:' ? req.ip.substr(7) : req.ip

    https.get(`https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`, (result) => {
      result.on('data', (d) => {
        result = JSON.parse(d.toString())

        const city = result.city
        const country = result.country
        const region = result.region

        sql.query(`INSERT INTO shortener.tracking (date, destination, origin, ip, city, country, region) VALUES ('${Math.floor(new Date().getTime() / 1000)}', '${destination}', '${origin}', '${ip}', '${city}', '${country}', '${region}')`, (err, result) => {
          if (err) throw err
        })

        _discord.send('notification', new discord.MessageEmbed()
          .setTitle(`New click from ${origin}`)
          .setColor(0x00FF00)
          .addFields({
            name: 'Date',
            value: `${fullDate}`
          }, {
            name: 'IP',
            value: ip
          }, {
            name: 'Destination',
            value: destination
          }, {
            name: 'Origin',
            value: origin
          }, {
            name: 'City',
            value: city
          }, {
            name: 'Region',
            value: region
          }, {
            name: 'Country',
            value: country
          }))
      })
    }).on('error', (err) => {
      discord.send('error', new discord.MessageEmbed()
        .setTitle('Error')
        .setColor(0xFF0000)
        .addFields({
          name: 'Error',
          value: err
        })
      )

      throw err
    })
  } else {
    res.write(`
    <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Generate URL</title>
      </head>
      <body>
        <h1>Create a new tracked URL</h1>
        <form action="/redirect/generate" method="get">
          <label for="origin">Source:</label><br/>
          <input id="origin" name="origin" type="text"><br/>
          <label for="destination">Destination:</label><br/>
          <input id="destination" name="destination" type="text"><br/>
          <input type="submit">
        </form>
        <footer>
          <a href="https://julianvos.nl/privacy_policy">Privacy Policy</a><br/>
          <a href="https://julianvos.nl/terms_of_service">Terms of Service</a>
        </footer>
      </body>
      </html>
    `)
    res.send()
    res.end()
  }
})

router.get('/generate', (req, res) => {
  res.write(`https://api.julianvos.nl/redirect?destination=${encodeURIComponent(req.query.destination)}&origin=${encodeURIComponent(req.query.origin)}`)
  res.send()
  res.end()
})

module.exports = router
