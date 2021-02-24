import discord, json
from discord.ext import commands

file = open("config.json", "r")
config = json.load(file)
file.close()

intents = discord.Intents.default()
intents.members = True
bot = commands.Bot(command_prefix="bot", intents=intents)

@bot.event
async def on_ready():
    print("ready as", bot.user)

@bot.event
async def on_message(message):
    if message.channel.id == config["channel"]:
        file = open("discord.json", "r")
        data = json.load(file)
        file.close()
        entities = data["entities"]

        if message.author.bot:
            badge = "bot"
        else:
            badge = None

        entities["users"][str(message.author.id)] = {"avatar": str(message.author.avatar_url_as(static_format="png")), "username": message.author.name, "discriminator": message.author.discriminator, "badge": badge}
        data["channel_name"] = message.channel.name
        for role in message.role_mentions:
            entities["roles"][str(role.id)] = {"name": role.name, "color": int(str(role.color).replace("#", "0x"), 16)}
        for channel in message.channel_mentions:
            entities["channels"][str(channel.id)] = {"name": channel.name}
        for member in message.mentions:
            if member.bot:
                badge = "bot"
            else:
                badge = None
            entities["users"][str(member.id)] = {"username": member.name, "discriminator": member.discriminator, "avatar": str(member.avatar_url_as(static_format="png")), "badge": badge}

        if message.attachments:
            data["messages"].append({
              "id": str(message.id),
              "author": str(message.author.id),
              "time": int(message.created_at.timestamp()) * 1000,
              "content": message.content,
              "attachments": [{"id": attachment.id, "filename": attachment.filename, "size": attachment.size, "width": attachment.width, "height": attachment.height, "url": attachment.url, "proxy_url": attachment.proxy_url} for attachment in message.attachments]
            })

        else:
            data["messages"].append({
              "id": str(message.id),
              "author": str(message.author.id),
              "time": int(message.created_at.timestamp()) * 1000,
              "content": message.content
            })

        with open("discord.json", "w") as f:
            json.dump(data, f, indent=4)

bot.run(config["token"])
