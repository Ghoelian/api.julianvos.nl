const express = require('express')
const cookieParser = require('cookie-parser')
const spotify = require('./lib/spotify_api')
const cors = require('cors')
const bodyParser = require('body-parser')
const uuidv4 = require('uuid/v4')
const https = require('https')
const mysql = require('mysql')
const discord = require('discord.js')

const app = express()
const discordClient = new discord.Client()

let notificationChannel
let errorChannel

require('dotenv').config() // Load the .env file that should be put in the root of this project. See README.md for variables to include

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB
})

discordClient.on('ready', () => {
  notificationChannel = discordClient.channels.cache.find(channel => channel.name === 'notifications')
  errorChannel = discordClient.channels.cache.find(channel => channel.name === 'errors')
})

discordClient.login(process.env.DISCORD_TOKEN)

app.set('trust proxy', 1) // Treat proxy as direct connection, as I use NGINX on my server.
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(cookieParser())

const corsSettings = {
  origin: process.env.CORS_ORIGIN,
  optionSuccessStatus: 200,
  methods: 'GET, POST'
}

app.use(cors(corsSettings)) // Apply CORS settings to all requests.

app.options('*', cors(corsSettings))

app.post('/songguesser', cors(corsSettings), (req, res) => {
  if ((req.body.spotify_user_authorization !== 'null' && req.body.spotify_user_access !== 'null' && req.body.spotify_user_refresh_token !== 'null') && (typeof req.body.spotify_user_authorization !== 'undefined' && typeof req.body.spotify_user_access !== 'undefined' && typeof req.body.spotify_user_refresh_token !== 'undefined') && (req.body.spotify_user_authorization !== 'undefined' && req.body.spotify_user_access !== 'undefined' && req.body.spotify_user_refresh_token !== 'undefined')) {
    spotify.getUserDetails(req, (err, data) => {
      if (err) {
        res.status(401).end()
        return
      }
      const result = {}

      result.username = data

      spotify.getUserPlaylists(req, (err, data) => {
        if (err) {
          res.status(401).end()
          return
        }

        result.data = []

        for (let i = 0; i < data.length; i++) {
          result.data.push({
            id: data[i].id,
            name: data[i].name
          })
        }

        res.write(JSON.stringify(result))
        res.status(200).end()
      })
    })
  } else {
    res.status(401).end()
  }
})

app.post('/songguesser/play', cors(corsSettings), (req, res) => {
  const result = {}

  spotify.getPlaylistSongs(req, (err, data) => {
    if (err) {
      res.status(401).end()
      return
    }

    result.songs = []

    for (let i = 0; i < data.length; i++) {
      result.songs.push(data[i].track)
    }

    res.write(JSON.stringify(result))
    res.status(200).end()
  })
})

app.get('/songguesser/login', cors(corsSettings), (req, res) => {
  const result = {}
  const state = uuidv4()
  result.state = state
  const scopes = 'streaming playlist-read-collaborative playlist-read-private user-library-read user-read-email user-read-private user-read-playback-state'
  result.redirect = `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_API_ID}${(scopes ? '&scope=' + encodeURIComponent(scopes) : '')}&state=${state}&redirect_uri=${process.env.REDIRECT_URI}`

  res.write(JSON.stringify(result))

  res.status(200).end()
})

app.get('/songguesser/auth', cors(corsSettings), (req, res) => {
  spotify.authenticateUser(req, req.query.state, (err, result) => {
    if (err) {
      res.status(401).end()
      return
    }
    const response = {}

    response.SPOTIFY_USER_AUTHORIZATION = result.SPOTIFY_USER_AUTHORIZATION
    response.SPOTIFY_USER_ACCESS = result.SPOTIFY_USER_ACCESS
    response.SPOTIFY_USER_ACCESS_EXPIRES_IN = result.SPOTIFY_USER_ACCESS_EXPIRES_IN
    response.SPOTIFY_USER_REFRESH_TOKEN = result.SPOTIFY_USER_REFRESH_TOKEN
    res.write(JSON.stringify(response))
    res.status(200).end()
  })
})

app.get('/redirect', cors(corsSettings), (req, res) => {
  if (req.query.destination !== undefined) {
    const destination = req.query.destination
    const origin = req.query.origin

    res.redirect(302, destination)
    res.end()

    const ip = req.ip.substr(0, 7) === '::ffff:' ? req.ip.substr(7) : req.ip

    https.get(`https://ipinfo.io/${ip}/json?token=${process.env.IPINFO_TOKEN}`, (result) => {
      result.on('data', (d) => {
        result = JSON.parse(d.toString())

        const city = result.city
        const country = result.country
        const region = result.region

        pool.query(`INSERT INTO shortener.tracking (date, destination, origin, ip, city, country, region) VALUES ('${Math.floor(new Date() / 1000)}', '${destination}', '${origin}', '${ip}', '${city}', '${country}', '${region}')`, (err) => {
          if (err) throw err
        })

        notificationChannel.send(new discord.MessageEmbed()
          .setTitle(`New click from ${origin}`)
          .setColor(0x00FF00)
          .addFields(
            { name: 'IP', value: ip },
            { name: 'Destination', value: destination },
            { name: 'Origin', value: origin },
            { name: 'City', value: city },
            { name: 'Region', value: region },
            { name: 'Country', value: country }
          ))
      })
    }).on('error', (err) => {
      errorChannel.send(new discord.MessageEmbed()
        .setTitle('Error')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Error', value: err }
        )
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

app.get('/redirect/generate', cors(corsSettings), (req, res) => {
  res.write(`https://api.julianvos.nl/redirect?destination=${encodeURIComponent(req.query.destination)}&origin=${encodeURIComponent(req.query.origin)}`)
  res.send()
  res.end()
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Listening on port ${listener.address().port}`)
})
