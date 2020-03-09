// Litterkitten
// github.com/dirtbirb/litterkitten
//
// Discord bot to interact with other bots in my server
// Mainly helps users play text adventure games
// Communicate using 'pls cmd', ex: 'pls listen'

const discord = require('discord.js');
const fs = require('fs');               // filesystem access to read bot token
const path = require('path');           // pathing to find bot token

const ADV_BOT_NAME = 'Trashventure';
const BOT_URL = 'https://github.com/dirtbirb/litterkitten';
const CMD_PREFIX = 'pls ';
const DELAY = 1000;   // Wait time for adventure bot to respond

const bot = new discord.Client();
const directions = ['n', 'ne', 'e', 'se', 's', 'sw', 'sw', 'w', 'nw'];
const msg_dead_end = "```\n\n\nDead End" +
  "\nYou have come to a dead end in the maze.\n\n\n```";
const msg_hit_wall = "```\n\n\nYou can't go that way.\n\n\n```";
const msg_in_maze = "```\n\n\nMaze" +
  "\nThis is part of a maze of twisty little passages, all alike.\n\n\n```";
const msg_thief = "Someone carrying a large bag";

var channel;
var combos = [];
var combo_active = false;
var combo_index = 0;
var combo_step = 0;
var search_active = false;
var search_direction = 7; // west
var script = [];
var script_active = false;

// Add delay to game commands
function game_cmd(cmd) {
  setTimeout(function() {
    channel.send(`$${cmd}`);
  }, (DELAY));
}

// Parse commands from one line of script file
function load_line(line) {
  for (cmd of line.split(',')) script.push(cmd.trim());
}

// Load commands from script file
function load_script(fn) {
  text = fs.readFileSync(path.join(__dirname, `scripts/${fn}`), 'utf-8');
  lines = text.split('\n');
  let long = false;
  for (line of lines) {
    if (long) {
      load_line(line);
      long = false;
    } else if (line.startsWith('>')) {
      if (line === '>') long = true;  // commands are on next line
      else load_line(line.slice(1));  // commands are on this line
    }
  }
  console.log(script);
  return true;
}

// Send text messages with blockquotes
function send(msg) {
  channel.send(`\`\`\`${msg}\`\`\``);
}

// Stop combo or search execution
function stop() {
  combo_active = false;
  search_active = false;
  script_active = false;
  bot.user.setPresence({
    game: {
      name: `\#${channel.name}`,
      type: 'LISTENING',
      url: BOT_URL
    }
  });
}

// Change direction
function turn(distance) {
  search_direction = (search_direction + distance) % directions.length;
  game_cmd(directions[search_direction]);
}

// Report client errors
bot.on('error', err => {
  console.log('Discord client error: ' + err);
});

// Set status on client ready
bot.on('ready', () => {
  bot.user.setStatus('available');
  bot.user.setPresence({
    game: {
      name: 'a bug',
      type: 'WATCHING',
      url: BOT_URL
    }
  });
  console.log(`Logged in as ${bot.user.tag}.`);
});

// Handle chat messages
bot.on('message', msg => {
  // Always ignore self
  if (msg.author.id === bot.id) return;

  // Respond to listen request from any channel
  if (msg.content.startsWith(CMD_PREFIX + 'listen')) {
    channel = msg.channel;
    send('Listening to this channel.');
    stop(); // stops any actions and updates status
    return;
  }

  // Ignore everything except the listened channel
  if (!channel || channel != msg.channel) return;

  // Stop command
  if (msg.content.startsWith(CMD_PREFIX + 'stop')) {
    stop();
    return;
  }

  // Loops for continuous tasks
  if (combo_active || search_active || script_active) {
    // Ignore anyone but the text adventure bot
    if (msg.author.username !== ADV_BOT_NAME) return;
    // Saved combos
    if (combo_active) {
      if (msg.content === msg_in_maze) {
        combo_step += 1;
        game_cmd(combos[combo_index][combo_step]);
        if (combo_step == combos[combo_index].length - 1) {
          combo_active = false;
          send('Did the thing.');
        }
      } else {
        stop();
        send(`Thing ${combo_index + 1} got weird, aborting thing.`)
      }
    }
    // Maze search
    else if (search_active) {
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
        stop();
        send('Found something!');
      }
    }
    // Script replay
    else if (script_active) {
      if (msg.content.search(msg_thief) !== -1) {
        stop();
        send("HISSSSSSS!!!");
      } else if (script.length) {
        game_cmd(script.shift());
      } else stop();
    }
    // Don't check for new commands if running a continuous task
    return;
  }

  // Ignore everything else that doesn't start with CMD_PREFIX
  if (!msg.content.startsWith(CMD_PREFIX)) return;
  // Parse into command and parameters (if present)
  let i = msg.content.indexOf(' ', CMD_PREFIX.length);
  if (i > 0) {
    var cmd = msg.content.slice(CMD_PREFIX.length, i);
    var params = msg.content.slice(i + 1);
  } else {
    var cmd = msg.content.slice(CMD_PREFIX.length);
  }
  // Commands
  switch (cmd) {
    case 'bird':
      msg.channel.send('?bird');
      break;
    case 'do':
      if (isNaN(params)) {
        send(`${params} doesn't appear to be a number.`);
        break;
      }
      combo_index = Number(params) - 1;
      send(`Doing thing ${(combo_index + 1)}: ` +
        `${combos[combo_index].join(',')}`);
      bot.user.setPresence({
        game: {
          name: `thing ${combo_index + 1}...`,
          type: 'PLAYING',
          url: BOT_URL
        }
      });
      combo_step = 0;
      combo_active = true;
      game_cmd(combos[combo_index][combo_step]);
      break;
    case 'ping':
      send('Pong');
      break;
    case 'replay':
      let response;
      if (load_script(params)) {
        script_active = true;
        response = `Replaying script ${params}.`;
        bot.user.setPresence({
          game: {
            name: `script ${params}...`,
            type: 'PLAYING',
            url: BOT_URL
          }
        });
        game_cmd(script.shift());
      } else {
        response = `Failed to load script ${params}.`;
      }
      send(response);
      break;
    case 'save':
      combo = params.split(',');
      combos.push(combo);
      send(`Thing ${combos.length.toString()}: ${combo.join(',')}`);
      break;
    case 'screensaver':
      search_active = true;
      search_direction = 7;   // west
      bot.user.setPresence({
        game: {
          name: 'Windows 95 screensaver mode!',
          type: 'PLAYING',
          url: BOT_URL
        }
      });
      game_cmd(directions[search_direction]);
      break;
    default:
      send('Mrow?');
  }
});

// Get client token from local txt and login (async)
fs.readFile(path.join(__dirname, 'bot_token.txt'), 'utf-8', (err, token) => {
  if (err) throw err;
  bot.login(token.trim());
});
