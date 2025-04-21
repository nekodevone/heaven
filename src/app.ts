import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  PlayerSubscription,
  StreamType,
  VoiceConnection
} from '@discordjs/voice'
import { ChannelType, Client, IntentsBitField, VoiceChannel } from 'discord.js'
import { resolve } from 'path'
import { setTimeout } from 'timers/promises'

let player: AudioPlayer | null = null
let resource: AudioResource | null = null
let subscription: PlayerSubscription | null = null
let isConnected = false

const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildVoiceStates]
})

client.on('ready', async () => {
  const isReconnected = isConnected
  isConnected = true

  if (isReconnected) {
    console.warn('Reconnected to Discord')
  } else {
    console.log('Connected to Discord')
  }

  console.log('Getting voice channel...')
  const channel = await getVoiceChannel()

  console.log('Getting audio player...')
  const player = getAudioPlayer()

  console.log('Connecting to the voice channel...')
  const connection = await connectToVoiceChannel(channel)

  console.log('Releasing previous subscription...')
  if (subscription) {
    subscription.unsubscribe()
    subscription = null
  }

  console.log('Playing audio!')
  subscription = connection.subscribe(player)!
})

export async function start() {
  await client.login(process.env.TOKEN)
  console.log(`Logged in as ${client.user?.id} (${client.user})`)
}

async function getVoiceChannel(): Promise<VoiceChannel> {
  while (true) {
    try {
      const channel = await client.channels.fetch(process.env.CHANNEL_ID)

      if (!channel) {
        throw new Error('Channel not found')
      }

      if (channel.type !== ChannelType.GuildVoice) {
        throw new Error('Channel is not a voice channel')
      }

      return channel
    } catch (error) {
      console.error('Error getting voice channel:', error)
      console.error('Retrying in 5000 ms...')
      await setTimeout(5000)
    }
  }
}

async function connectToVoiceChannel(channel: VoiceChannel): Promise<VoiceConnection> {
  let connection = getVoiceConnection(channel.guild.id)
  if (connection) {
    console.log('Connection restored...')
  } else {
    console.log('Connecting to the RTC...')
    connection = joinVoiceChannel({
      selfMute: false,
      selfDeaf: true,
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator
    })
  }

  connection.rejoin({
    selfMute: false,
    selfDeaf: true,
    channelId: channel.id
  })

  return connection
}

function getAudioResource() {
  if (!resource || resource?.ended) {
    console.log(
      resource
        ? 'Audio resource ended, creating new audio resource...'
        : 'Creating new audio resource...'
    )

    resource = createAudioResource(resolve(process.cwd(), './assets/royalty.ogg'), {
      inputType: StreamType.Opus,
      inlineVolume: false
    })
  }

  return resource
}

function getAudioPlayer() {
  if (!player) {
    player = new AudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    })

    player.on('error', console.error)
    player.on('debug', console.debug)
    player.on(AudioPlayerStatus.Idle, () => player?.play(getAudioResource()))
    player.play(getAudioResource())
  }

  return player
}
