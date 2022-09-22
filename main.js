const { Client, GatewayIntentBits } = require("discord.js")
const client = new Client({ intents: [GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMessages, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] })

// Get the required environment variables from the .env file
const env = require("dotenv")
env.config()
const { BOT_TOKEN, USER_INFO, GUILD_ID, ANSWERS_CHANNEL_ID } = process.env
// user info is in the form USER_ID:USER_CHANNEL,USER_ID:USER_CHANNEL,etc
const USER_CHANNELS = JSON.parse(`{"${USER_INFO.replace(/(:|,)/g, "\"$1\"")}"}`)
const USER_IDS = Object.keys(USER_CHANNELS)

// create a variable to hold the answers from each user
let answers = USER_IDS.reduce((o, key) => Object.assign(o, { [key]: "" }), {})
let answerMessage = ""

// once logged in
client.once("ready", () => {
    console.log("Logged in as", client.user.tag)
    client.user.setActivity("trivia")
})

client.on("messageCreate", async (message) => {

    if (message.author.bot) return
    if (message.guildId != GUILD_ID) return

    const GUILD = await client.guilds.fetch(GUILD_ID)
    const ANSWERS_CHANNEL = await GUILD.channels.fetch(ANSWERS_CHANNEL_ID)

    // check for end question command in the answers channel
    if (message.channelId == ANSWERS_CHANNEL_ID && message.content.match(/^!end/)) {
        let finalAnswersByUsername = {}
        for (let user_id of USER_IDS) {
            const user = await GUILD.members.fetch(user_id)
            const userChannel = await GUILD.channels.fetch(USER_CHANNELS[user_id])
            const userAnswer = await userChannel.messages.fetch(answers[user_id])
            finalAnswersByUsername[user.user.username] = userAnswer.content
        }
        message.reply(`Final Answers:\n${Object.keys(finalAnswersByUsername).map(name => `${name}: ${finalAnswersByUsername[name] ?? "no submission"}`).join("\n")}`)
        answers = USER_IDS.reduce((o, key) => Object.assign(o, { [key]: "" }), {})
        answerMessage = ""
        return
    }

    // check for answer submissions
    for (let user_id of USER_IDS) {
        if (message.channelId == USER_CHANNELS[user_id] && message.author.id == user_id) {
            answers[user_id] = message.id
            // send/edit the answers message
            const user = await GUILD.members.fetch(user_id)
            let answerMessageText = `Answers:\n${USER_IDS.map(id => `${user.user.username}: ${answers[id] ? "submitted" : "not submitted"}`).join("\n")}`
            if (!answerMessage) {
                ANSWERS_CHANNEL.send(answerMessageText).then(sentMessage => {
                    answerMessage = sentMessage
                })
            }
        }
    }
})

client.on("messageDelete", async (message) => {

    if (message.author.bot) return
    if (message.guildId != GUILD_ID) return

    const GUILD = await client.guilds.fetch(GUILD_ID)

    // check for id then edit message if applicable
    const deletedAnswerUser = Object.keys(answers).find(user_id => answers[user_id] == message.id)
    if (deletedAnswerUser) {
        const user = await GUILD.members.fetch(deletedAnswerUser)
        answers[deletedAnswerUser] = ""
        answerMessage.edit(`Answers:\n${USER_IDS.map(id => `${user.user.username}: ${answers[id] ? "Submitted" : "Not Submitted"}`).join("\n")}`)
    }

})


// Login to the bot
client.login(BOT_TOKEN)