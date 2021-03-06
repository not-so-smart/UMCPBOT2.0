const Discord = require('discord.js');
const config = require('./config/config.json');

module.exports = async (client, db, message) => {
  // Ingnore messages from bots
  if (message.author.bot) return;

  // Ignore messages not in role-request and bot-commands
  if(message.guild.id == '348919724635324419' &&
     message.channel.id != '646521417805856768' &&
     message.channel.id != '349781614877999104') {
       return;
     }



  // Check for commands
  if(message.content.startsWith(config.prefix)) {
    // Regex magic to seperate args, allowing args with spaces to be
    // encapsulated using single or double quotes (you can even nest quotes!)
    const args = message.content.match(/('[^']*')|("[^"]*")|[^\s]+/g);
    const commandName = args.shift().slice(config.prefix.length).toLowerCase();

    const command = client.commands.get(commandName)
    || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    // If this is a command
    if (command) {
      if(command.adminOnly) {
        // Only continue if the user submitting this command is an admin
        const text = 'SELECT * FROM admins WHERE discord_id=$1';
        var success = await db.query(text, [message.author.id])
          .then(res => {
            // If we didn't find an admin
            if(res.rowCount == 0) {
              message.channel.send(`You don't have permission to use that command, ${message.author}`);
              return false;
            }
            return true;
          })
          .catch(e => console.log(e.stack))
          if(!success) return;
      }
      if (command.guildOnly && message.channel.type !== 'text') {
        return message.channel.reply('I can\'t execute that comand in the DMs.')
      }
      if (command.args && !args.length) {
        return message.channel.send(`You didn't provide the proper arguments, ${message.author}`);
      }

      if (!client.cooldowns.has(command.name)) {
        client.cooldowns.set(command.name, new Discord.Collection());
      }

      const now = Date.now();
      const timestamps = client.cooldowns.get(command.name);
      const cooldownAmount = (command.cooldown || 3) * 1000;

      if (timestamps.has(message.author.id)) {
        if (timestamps.has(message.author.id)) {
          const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

          if (now < expirationTime) {
            const timeLeft = (expirationTime - now) / 1000;
            return message.reply(`please wait ${timeLeft.toFixed(1)} more second(s) before reusing the \`${command.name}\` command.`);
          }
        }
      }

      timestamps.set(message.author.id, now);
      setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

      try {
        command.execute(client, db, message, args);
      }
      catch (error) {
        console.error(error);
        message.reply('Something went wrong')
      }
    }
  }
}
