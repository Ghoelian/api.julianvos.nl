const discord = require('discord.js')

const discordClient = new discord.Client()

let notificationChannel
let errorChannel

discordClient.on('ready', () => {
  notificationChannel = discordClient.channels.cache.find(channel => channel.name === 'notifications')
  errorChannel = discordClient.channels.cache.find(channel => channel.name === 'errors')
})

discordClient.login(process.env.DISCORD_TOKEN)

const send = (channel, message) => {
  if (channel === 'notification') {
    notificationChannel.send(message)
  } else if (channel === 'error') {
    errorChannel.send(message)
  }
}

exports.send = send
