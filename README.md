[![Build Status](https://jenkins.julianvos.nl/buildStatus/icon?job=api.julianvos.nl)](https://jenkins.julianvos.nl/job/api.julianvos.nl/)
[![Maintainability](https://api.codeclimate.com/v1/badges/b116c4ec8def1a60e5df/maintainability)](https://codeclimate.com/github/Ghoelian/api.julianvos.nl/maintainability)

# About
This is my API, hosting all server-side code for my [song guessing game](https://github.com/Ghoelian/songguesser.julianvos.nl), as well as my
URL redirecting script.

# TODO:
- Check response body for error messages for Spotify API calls
- Use token refreshing instead of always requesting a new one
- Refactor code to properly use resolve and reject, and their arguments

# .env variables
This project requires a .env file to be present at the root of the project. The following variables should be specified:
- SPOTIFY_API_ID=Spotify API ID, acquired from your [developer dashboard](https://developer.spotify.com/dashboard/).
- SPOTIFY_API_SECRET=Spotify API secret, acquired from your [developer dashboard](https://developer.spotify.com/dashboard/).
- REDIRECT_URI=URI for Spotify to redirect to after the user has logged in.
- CORS_ORIGIN=Origin to allow for REST calls.
- PORT=Port to run the application on.
