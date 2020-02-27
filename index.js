const fs = require('fs');
const path = require('path');
const Discord = require('discord.js');
const client = new Discord.Client();
// console.log(client)

// Get client token from local txt and login, asynch because that's fancy
fs.readFile('bot_token.txt', 'utf-8', (err, token) => {
  if (err) throw err;
  client.login(token).catch(err => { console.log(err); });
});

// client.login(fs.readFileSync('bot_token.txt', 'utf-8')).
//   catch(err => { console.log('Discord login error: ' + err); });

const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'sw', 'w', 'nw'];
const msg_hit_wall = "```\n\n\nYou can't go that way.\n\n\n```";
const msg_in_maze = "```\n\n\nMaze\nThis is part of a maze of twisty little passages, all alike.\n\n\n```";
const msg_dead_end = "```\n\n\nDead End\nYou have come to a dead end in the maze.\n\n\n```";

var channel;
var combos = [];
var combo_active = false;
var combo_index = 0;
var combo_step = 0;
var search_active = false;
var search_direction = 7; // west

function game_cmd(cmd) {
  setTimeout(function() {
    channel.send('$' + cmd);
  }, (1000));
}

function stop() {
  combo_active = false;
  search_active = false;
}

function turn(distance) {
  search_direction = (search_direction + distance) % directions.length;
  game_cmd(directions[search_direction]);
}

client.on('error', err => {
  console.log('Discord client error: ' + err);
});

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  // Always ignore self
  // TODO: get own id on login
  if (msg.author.username === 'litterkitten') return;

  // Respond to !listen from any channel
  if (msg.content.startsWith('!listen')) {
    channel = msg.channel;
    msg.channel.send('```Listening to this channel```');
    return;
  }

  // Ignore everything except the !listen channel
  if (!channel || channel != msg.channel) return;
  //console.log(msg)

  // Stop command
  if (msg.content.startsWith('!stop')) {
    search_active = false;
    combo_active = false;
    return;
  }

  // Preset combo loop
  if (combo_active) {
    if (msg.author.username != 'Trashventure') {
      return;
    }
    if (msg.content === msg_in_maze) {
      combo_step += 1;
      game_cmd(combos[combo_index][combo_step]);
      if (combo_step == combos[combo_index].length - 1) {
        combo_active = false;
        msg.channel.send('```Did the thing.```');
      }
    } else {
      msg.channel.send('```Thing got weird, aborting thing.```')
      search_active = false;
      combo_active = false;
    }
    return;
  }

  // Search loop
  if (search_active) {
    if (msg.author.username != 'Trashventure') {
      return;
    }
    switch (msg.content) {
      case msg_hit_wall:
        // turn right 45*
        turn(1);
        break;
      case msg_in_maze:
        // turn left 90*
        turn(-2);
        break;
      case msg_dead_end:
        // turn around 180*
        turn(4);
        break;
      default:
        search_active = false;
        msg.channel.send('```Found something!```');
    }
    return;
  }

  // Other commands
  // Ignore if doesn't start with !
  if (!msg.content.startsWith('!')) return;
  // Parse into command and parameters
  let i = msg.content.indexOf(' ');
  if (i > 0) {
    let cmd = msg.content.slice(1, i);
    let params = msg.content.slice(i + 1);
  } else {
    let cmd = msg.content.slice(1);
  }
  // Do command
  switch (cmd) {
    case 'do':
      if (isNaN(params)) {
        msg.channel.send(params + " doesn't appear to be a number.");
        break;
      }
      combo_index = Number(params) - 1;
      msg.channel.send('```Doing thing ' + combo_index.toString() + ': ' + combos[combo_index].join(',') + '```');
      combo_step = 0;
      combo_active = true;
      game_cmd(combos[combo_index][combo_step]);
      break;
    case 'ping':
      msg.channel.send('```pong```');
      break;
    case 'save':
      combo = params.split(',');
      combos.push(combo);
      msg.channel.send('```Thing ' + combos.length.toString() + ': ' + combo.join(',') + '```');
      break;
    case 'screensaver':
      search_active = true;
      search_direction = 7;
      game_cmd(directions[search_direction]);
      break;
    default:
      msg.channel.send(cmd + '```Mrow?```');
  }
});
