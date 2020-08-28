const express = require('express')
const cookieParser = require('cookie-parser')
const cors = require('cors')
const bodyParser = require('body-parser')

const songguesserRouter = require('./routes/songguesser')
const redirectRouter = require('./routes/redirect')

const app = express()

require('dotenv').config() // Load the .env file that should be put in the root of this project. See README.md for variables to include

const corsSettings = {
  origin: process.env.CORS_ORIGIN,
  optionSuccessStatus: 200,
  methods: 'GET, POST'
}

app.set('trust proxy', 1) // Treat proxy as direct connection, as I use NGINX on my server.

app.use(bodyParser.urlencoded({
  extended: true
}))

app.use(cookieParser())

app.use(cors(corsSettings)) // Apply CORS settings to all requests.

app.options('*', cors(corsSettings))

app.use('/songguesser', songguesserRouter)
app.use('/redirect', redirectRouter)

module.exports = app
