const express = require('express')
const spotify = require('../lib/spotify')
const uuidv4 = require('uuid/v4')

const router = express.Router()

router.post('/songguesser', (req, res) => {
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

router.post('/songguesser/play', (req, res) => {
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

router.get('/songguesser/login', (req, res) => {
  const result = {}
  const state = uuidv4()
  result.state = state
  const scopes = 'streaming playlist-read-collaborative playlist-read-private user-library-read user-read-email user-read-private user-read-playback-state'
  result.redirect = `https://accounts.spotify.com/authorize?response_type=code&client_id=${process.env.SPOTIFY_API_ID}${(scopes ? '&scope=' + encodeURIComponent(scopes) : '')}&state=${state}&redirect_uri=${process.env.REDIRECT_URI}`

  res.write(JSON.stringify(result))

  res.status(200).end()
})

router.get('/songguesser/auth', (req, res) => {
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

module.exports = router
