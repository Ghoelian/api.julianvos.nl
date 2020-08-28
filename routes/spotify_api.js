const request = require('request')

/**
 * Refresh a user's access token.
 */
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
      console.error(`[Server] Error while trying to refresh token.\n\t${err || JSON.parse(body).error.message}`)
      callback(err, null)
    } else {
      result.SPOTIFY_USER_ACCESS = JSON.parse(body).access_token
      result.SPOTIFY_USER_ACCESS_EXPIRES_IN = JSON.parse(body).expires_in
      callback(null, result)
      console.log('[Server] Token refresh succeeded.')
    }
  })
}

/**
 * Get a user's details, including their display name and ID, used later for calling other API functions.
 */
const getUserDetails = (req, callback) => {
  request({
    url: 'https://api.spotify.com/v1/me',
    headers: {
      Authorization: `Bearer ${req.body.spotify_user_access}`
    },
    method: 'GET'
  }, (err, response, body) => {
    if (err || JSON.parse(body).error) {
      console.error(`[Server] Error while trying to get user details.\n\t${err || JSON.parse(body).error.message}`)
      callback(err || JSON.parse(body).error.message, null)
    } else {
      return callback(null, JSON.parse(body).display_name, req)
    }
  })
}

/**
 * Get a user's playlists.
 */
const getUserPlaylists = (req, callback) => {
  let total = 0
  let whole = 0
  let remainder = 0
  let offset = 0
  const items = []

  new Promise((resolve, reject) => { // Here we get a list of playlists with a limit of 1, so we can get the total amount of playlists without wasting data.
    request({
      url: 'https://api.spotify.com/v1/me/playlists?limit=1&offset=0',
      headers: {
        Authorization: `Bearer ${req.body.spotify_user_access}`
      },
      method: 'GET'
    }, (err, response, body) => {
      if (err || JSON.parse(body).error) {
        console.error(`[Server] Error while trying to get initial playlist.\n\t${err || JSON.parse(body).error.message}`)
        reject(err || JSON.parse(body).error.message)
      } else {
        total = JSON.parse(body).total
        whole = Math.floor(total / 50) // Calculate how many times we should get the maximum amount of playlists in one request.
        remainder = JSON.parse(body).total % 50 // Calculate the remainder, to be used in the request right after, to get the remaining playlists.

        resolve()
      }
    })
  }).then(() => {
    new Promise((resolve, reject) => {
      for (let i = 0; i < whole; i++) { // Execute the request as many times as 50 fits in the total amount.
        request({
          url: `https://api.spotify.com/v1/me/playlists?limit=50&offset=${offset}`,
          headers: {
            Authorization: `Bearer ${req.body.spotify_user_access}`
          },
          method: 'GET'
        }, (err, response, body) => {
          if (err || JSON.parse(body).error) {
            console.error(`[Server] Error while trying to get playlists.\n\t${err || JSON.parse(body).error.message}`)
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
      if (whole === 0) { // If the user has less than 50 playlists, resolve the promise without looping.
        resolve()
      }
    }).then(() => {
      new Promise((resolve, reject) => {
        request({ // Get the remaining playlists.
          url: `https://api.spotify.com/v1/me/playlists?limit=${remainder}&offset=${offset}`,
          headers: {
            Authorization: `Bearer ${req.body.spotify_user_access}`
          },
          method: 'GET'
        }, (err, result, body) => {
          if (err || JSON.parse(body).error) {
            console.error(`[Server] Error while trying to get remaining playlists.\n\t${err || JSON.parse(body).error.message}`)
            reject(err || JSON.parse(body).error.message)
          } else {
            const parsedBody = JSON.parse(body).items

            for (let i = 0; i < parsedBody.length; i++) {
              items.push(parsedBody[i])
            }

            resolve()
          }
        })
      }).then(() => {
        callback(null, items)
      }).catch((error) => {
        callback(error, null)
      })
    })
  }).catch((error) => {
    callback(error, null)
  })
}

/**
 * Get the songs from the selected playlist, specified in req.query.playlist.
 *
 * Basically the same as getUserPlaylists(), but gets the songs instead.
 * See comments in getUserPlaylists() for an explanation to the loops and stuff.
 */
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
        console.error(`[Server] Error while trying to get playlist's initial song.\n\t${err || JSON.parse(body).error.message}`)
        reject(err || JSON.parse(body).error.message)
      }
      total = JSON.parse(body).total
      whole = Math.floor(total / 100)
      remainder = JSON.parse(body).total % 100

      resolve()
    })
  }).then(() => {
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
            console.error(`[Server] Error while trying to get playlist's songs.\n\t${err || JSON.parse(body).error.message}`)
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
    }).then(() => {
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
              console.error(`[Server] Error while trying to get playlist's remaining songs.\n\t${err || JSON.parse(body).error.message}`)
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
      }).then(() => {
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

/**
 * Get an access token for the user, using the authorization token provided by the Spotif API on the client-side.
 */
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
        console.error(`[Server] Error while trying to get access token.\n\t${err || JSON.parse(body).error + JSON.parse(body).error.message}`)
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
    console.error('[Server] Invalid state parameter.')
    callback(err, null)
  }
}

module.refresh = refresh
module.getUserDetails = getUserDetails
module.getUserPlaylists = getUserPlaylists
module.getPlaylistSongs = getPlaylistSongs
module.authenticateUser = authenticateUser
