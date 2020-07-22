const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const spotify = require('./lib/spotify_api')
const cors = require('cors')
const bodyParser = require('body-parser')
const uuidv4 = require('uuid/v4')

require('dotenv').config()

app.set('trust proxy', 1)
app.use(bodyParser.urlencoded({
  extended: true
}))
app.use(cookieParser())
app.use(cors())

const corsSettings = {
  origin: 'https://julianvos.nl',
  optionSuccessStatus: 200,
  methods: 'GET, POST'
}

app.options('*', cors(corsSettings))

app.post('/songguesser', cors(corsSettings), (req, res) => {
  if (req.body.spotify_user_authorization !== 'null' && req.body.spotify_user_access !== 'null' && req.body.spotify_user_refresh_token !== 'null') {
    spotify.getUserDetails(req, (err, data) => {
      if (err) throw err
      const result = {}

      result.username = data

      spotify.getUserPlaylists(req, (err, data) => {
        if (err) throw err

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
    if (err === 1) {
      res.status(401).end()
    } else if (err) {
      throw err
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

  res.end()
})

app.get('/songguesser/auth', cors(corsSettings), (req, res) => {
  spotify.authenticateUser(req, req.query.state, (err, result) => {
    if (err) throw err
    const response = {}

    response.SPOTIFY_USER_AUTHORIZATION = result.SPOTIFY_USER_AUTHORIZATION
    response.SPOTIFY_USER_AUTHORIZATION_DATE = result.SPOTIFY_USER_AUTHORIZATION_DATE
    response.SPOTIFY_USER_ACCESS = result.SPOTIFY_USER_ACCESS
    response.SPOTIFY_USER_ACCESS_EXPIRES_IN = result.SPOTIFY_USER_ACCESS_EXPIRES_IN
    response.SPOTIFY_USER_REFRESH_TOKEN = result.SPOTIFY_USER_REFRESH_TOKEN

    res.write(JSON.stringify(response))
    res.end()
  })
})

const listener = app.listen(process.env.PORT, () => {
  console.log(`[Server] Listening on port ${listener.address().port}`)
})
