const request = require('request')

const refresh = (req, callback) => {
  const result = {}

  request({
    url: 'https://accounts.spotify.com/api/token',
    headers: {
      Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_API_ID + ':' + process.env.SPOTIFY_API_SECRET).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    method: 'POST',
    body: `grant_type=refresh_token&refresh_token=${req.body.spotify_user_refresh_token}`
  },
  (err, response, body) => {
    if (err || JSON.parse(body).error) {
      console.log(`[Server] Error while trying to refresh token.\n\t${err || JSON.parse(body).error.message}`)
      callback(err, null)
    } else {
      result.SPOTIFY_USER_ACCESS = JSON.parse(body).access_token
      result.SPOTIFY_USER_ACCESS_EXPIRES_IN = JSON.parse(body).expires_in
      callback(null, result)
      console.log('[Server] Token refresh succeeded.')
    }
  })
}

const getUserDetails = (req, callback) => {
  request({
    url: 'https://api.spotify.com/v1/me',
    headers: {
      Authorization: `Bearer ${req.body.spotify_user_access}`
    },
    method: 'GET'
  }, (err, response, body) => {
    if (err || JSON.parse(body).error) {
      console.log(`[Server] Error while trying to get user details.\n\t${err || JSON.parse(body).error.message}`)
      callback(err || JSON.parse(body).error.message, null)
    } else {
      return callback(null, JSON.parse(body).display_name, req)
    }
  })
}

const getUserPlaylists = (req, callback) => {
  let total = 0
  let whole = 0
  let remainder = 0
  let offset = 0
  const items = []

  new Promise((resolve, reject) => {
    request({
      url: 'https://api.spotify.com/v1/me/playlists?limit=1&offset=0',
      headers: {
        Authorization: `Bearer ${req.body.spotify_user_access}`
      },
      method: 'GET'
    }, (err, response, body) => {
      if (err || JSON.parse(body).error) {
        console.log(`[Server] Error while trying to get initial playlist.\n\t${err || JSON.parse(body).error.message}`)
        reject(err || JSON.parse(body).error.message)
      } else {
        total = JSON.parse(body).total
        whole = Math.floor(total / 50)
        remainder = JSON.parse(body).total % 50

        resolve()
      }
    })
  }).then((result) => {
    new Promise((resolve, reject) => {
      for (let i = 0; i < whole; i++) {
        request({
          url: `https://api.spotify.com/v1/me/playlists?limit=50&offset=${offset}`,
          headers: {
            Authorization: `Bearer ${req.body.spotify_user_access}`
          },
          method: 'GET'
        }, (err, response, body) => {
          if (err || JSON.parse(body).error) {
            console.log(`[Server] Error while trying to get playlists.\n\t${err || JSON.parse(body).error.message}`)
            reject(err || JSON.parse(body).error.message)
          } else {
            offset += 50
            const parsedBody = JSON.parse(body).items

            for (let j = 0; j < parsedBody.length; j++) {
              items.push(parsedBody[j])
            }

            if (i === whole - 1) {
              resolve()
            }
          }
        })
      }
      if (whole === 0) {
        resolve()
      }
    }).then((result) => {
      new Promise((resolve, reject) => {
        request({
          url: `https://api.spotify.com/v1/me/playlists?limit=${remainder}&offset=${offset}`,
          headers: {
            Authorization: `Bearer ${req.body.spotify_user_access}`
          },
          method: 'GET'
        }, (err, result, body) => {
          if (err || JSON.parse(body).error) {
            console.log(`[Server] Error while trying to get remaining playlists.\n\t${err || JSON.parse(body).error.message}`)
            reject(err || JSON.parse(body).error.message)
          } else {
            const parsedBody = JSON.parse(body).items

            for (let i = 0; i < parsedBody.length; i++) {
              items.push(parsedBody[i])
            }

            resolve()
          }
        })
      }).then((result) => {
        callback(null, items)
      }).catch((error) => {
        callback(error, null)
      })
    })
  }).catch((error) => {
    callback(error, null)
  })
}

const getPlaylistSongs = (req, callback) => {
  let total = 0
  let whole = 0
  let remainder = 0
  let offset = 0
  const items = []

  new Promise((resolve, reject) => {
    request({
      url: `https://api.spotify.com/v1/playlists/${req.query.playlist}/tracks?limit=1&offset=0`,
      headers: {
        Authorization: `Bearer ${req.body.spotify_user_access}`
      },
      method: 'GET'
    }, (err, response, body) => {
      if (err || JSON.parse(body).error) {
        console.log(`[Server] Error while trying to get playlist's initial song.\n\t${err || JSON.parse(body).error.message}`)
        reject(err || JSON.parse(body).error.message)
      }
      total = JSON.parse(body).total
      whole = Math.floor(total / 100)
      remainder = JSON.parse(body).total % 100

      resolve()
    })
  }).then((result) => {
    new Promise((resolve, reject) => {
      for (let i = 0; i < whole; i++) {
        request({
          url: `https://api.spotify.com/v1/playlists/${req.query.playlist}/tracks?limit=100&offset=${offset}`,
          headers: {
            Authorization: `Bearer ${req.body.spotify_user_access}`
          },
          method: 'GET'
        }, (err, response, body) => {
          if (err || JSON.parse(body).error) {
            console.log(`[Server] Error while trying to get playlist's songs.\n\t${err || JSON.parse(body).error.message}`)
            reject(err || JSON.parse(body).error.message)
          } else {
            offset += 100
            const parsedBody = JSON.parse(body).items

            for (let j = 0; j < parsedBody.length; j++) {
              items.push(parsedBody[j])
            }

            if (i === whole - 1) {
              resolve()
            }
          }
        })
      }

      if (whole === 0) {
        resolve()
      }
    }).then((result) => {
      new Promise((resolve, reject) => {
        if (remainder !== 0) {
          request({
            url: `https://api.spotify.com/v1/playlists/${req.query.playlist}/tracks?limit=${remainder}&offset=${offset}`,
            headers: {
              Authorization: `Bearer ${req.body.spotify_user_access}`
            },
            method: 'GET'
          }, (err, result, body) => {
            if (err || JSON.parse(body).error) {
              console.log(`[Server] Error while trying to get playlist's remaining songs.\n\t${err || JSON.parse(body).error.message}`)
              reject(err || JSON.parse(body).error.message)
            }
            const parsedBody = JSON.parse(body).items

            for (let i = 0; i < parsedBody.length; i++) {
              items.push(parsedBody[i])
            }

            resolve()
          })
        } else {
          resolve()
        }
      }).then((result) => {
        callback(null, items)
      }).catch((error) => {
        callback(error, null)
      })
    }).catch((error) => {
      callback(error, null)
    })
  }).catch((error) => {
    callback(error, null)
  })
}

const authenticateUser = (req, state, callback) => {
  if (req.query.state === state) {
    const result = {}
    result.SPOTIFY_USER_AUTHORIZATION = req.query.code

    request({
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        Authorization: `Basic ${Buffer.from(process.env.SPOTIFY_API_ID + ':' + process.env.SPOTIFY_API_SECRET).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST',
      body: `grant_type=authorization_code&code=${req.query.code}&redirect_uri=${process.env.REDIRECT_URI}`
    },
    (err, response, body) => {
      if (err || JSON.parse(body).err) {
        console.log(`[Server] Error while trying to get access token.\n\t${err || JSON.parse(body).error + JSON.parse(body).error.message}`)
        callback(err || JSON.parse(body).error.message, null)
      } else {
        const parsedBody = JSON.parse(body)

        result.SPOTIFY_USER_ACCESS = parsedBody.access_token
        result.SPOTIFY_USER_ACCESS_EXPIRES_IN = parsedBody.expires_in
        result.SPOTIFY_USER_REFRESH_TOKEN = parsedBody.refresh_token

        callback(null, result)
      }
    })
  } else {
    const err = 'Invalid state parameter.'
    console.log('[Server] Invalid state parameter.')
    callback(err, null)
  }
}

exports.getUserDetails = getUserDetails
exports.getUserPlaylists = getUserPlaylists
exports.getPlaylistSongs = getPlaylistSongs
exports.authenticateUser = authenticateUser
exports.refresh = refresh
