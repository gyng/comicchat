// WARNING! BAD CODE AHEAD!

var net = require('net');
var tls = require('tls');
var WebSocketClient = require('websocket').client;
var irc = {};
var config = {
  user: {
    nick: 'comicrelay',
    user: 'comic',
    real: 'relay',
    pass: ''
  },
  server: {
    addr: '',
    port: 6697,
    ssl: true
  },
  chans: ['#'],
};

var wsConfig = {
  server: {
    addr: 'hidoi.moebros.org',
    port: 8084
  },
  cchat: {
    room: '#!'
  }
};

// WEBSOCKET CONNECTION
var ws = new WebSocketClient();
var wsConnection;
ws.on('connect', function (connection) {
  console.log('Websocket client connected');
  wsConnection = connection;
  connection.sendUTF(JSON.stringify({
    type: 'join',
    room: wsConfig.cchat.room
  }));

  // Register
  connection.sendUTF(JSON.stringify({
    type: 'message',
    room: wsConfig.cchat.room,
    text: 'ircrelay'
  }));

  connection.sendUTF(JSON.stringify({
    type: 'message',
    room: wsConfig.cchat.room,
    text: 'IRC relay to ' + config.server.addr + ' ' +  config.chans[0] + ' connected.'
  }));
});
ws.connect('ws://' + wsConfig.server.addr + ':' + wsConfig.server.port);

// IRC CONNECTION
// Self-signed certs
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

if (config.server.ssl === true) {
  irc.socket = tls.connect(config.server.port, config.server.addr);
} else {
  irc.socket = new net.Socket();
}

irc.socket.on('data', function (data) {
  data = data.split('\n');
  for (var i = 0; i < data.length; i++) {
    console.log('RECV -', data[i]);
    if (data !== '') {
      irc.handle(data[i].slice(0, -1));
    }
  }
});

var connectFunction =  function () {
  console.log('Established connection, registering...');
  irc.on(/^PING :(.+)$/i, function(info) {
    irc.raw('PONG :' + info[1]);
  });

  setTimeout(function () {
    irc.raw('NICK ' + config.user.nick);
    irc.raw('USER ' + config.user.user + ' 8 * :' + config.user.real);

    setTimeout(function () {
      for (var i = 0; i < config.chans.length; i++) {
        irc.raw('JOIN ' + config.chans[i]);
      }
    }, 4000);
  }, 1000);
};

if (config.server.ssl === true) {
  irc.socket.on('secureConnect', connectFunction);
} else {
  irc.socket.on('connect', connectFunction);
}

irc.socket.setEncoding('utf-8');
irc.socket.setNoDelay();

if (config.server.ssl === false) {
  irc.socket.connect(config.server.port, config.server.addr);
}

irc.handle = function (data) {
  var i, info;
  for (i = 0; i < irc.listeners.length; i++) {
    info = irc.listeners[i][0].exec(data);
    if (info) {
      irc.listeners[i][1](info, data);
      if (irc.listeners[i][2]) {
        irc.listeners.splice(i, 1);
      }
    }
  }

  var tokens = data.split(' ');
  if (tokens[1] === 'PRIVMSG') {
    wsConnection.send(JSON.stringify({
      type: 'message',
      text: data.split(' :')[1],
      room: wsConfig.cchat.room,
      author: tokens[0].split('!')[0].substring(1),
      spoof: true
    }));
  }
};

irc.listeners = [];
irc.on = function (data, callback) {
  irc.listeners.push([data, callback, false]);
};

irc.on_once = function (data, callback) {
  irc.listeners.push([data, callback, true]);
};

irc.raw = function(data) {
  irc.socket.write(data + '\n', 'ascii', function () {
    console.log('SENT -', data);
  });
};