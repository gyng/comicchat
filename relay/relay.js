/* jslint node: true */

'use strict';

function log (text) {
  console.log("\n" + (new Date()) + "\n" + text);
}

var net = require('net');
var tls = require('tls');
var WebSocketClient = require('websocket').client;

var config = {
  cchat: {
    nick: 'ircrelay',
    room: '#!',
    host: 'hidoi.moebros.org',
    port: 8084
  },
  irc: {
    nick: 'comicrelay',
    user: 'comic',
    real: 'relay',
    channel: '#',
    host: '',
    port: 6697,
    ssl: true
  }
};



// COMIC CHAT CONNECTION

var wsConnection;
var wsRetryHandlerID = null;

function makeComicChat () {
  var reconnectFunction = function () {
    if (wsRetryHandlerID === null) {
      wsRetryHandlerID = setInterval(function () {
        log('CC: Reconnecting...');
        makeComicChat();
      }, 10000);
    }
  };

  function addHandlers (ws) {
    ws.on('connect', function (connection) {
      log('CC: Websocket client connected to comic chat.');
      wsConnection = connection;
      if (wsRetryHandlerID !== null) {
        clearInterval(wsRetryHandlerID);
        wsRetryHandlerID = null;
      }

      // Join room, register nick, announce to room that relay has joined.
      [
        { type: 'join',    room: config.cchat.room },
        { type: 'message', room: config.cchat.room, text: config.cchat.nick },
        { type: 'message', room: config.cchat.room, text: 'IRC relay to ' + config.irc.host + ' connected.' }
      ].forEach(function (message) {
        connection.sendUTF(JSON.stringify(message));
      });

      connection.on('error', function (e) {
        log('CC: Connection error', e);
        reconnectFunction();
      });

      connection.on('close', function (e) {
        log('CC: Connection closed', e);
        reconnectFunction();
      });
    });

    return ws;
  }

  var ws = addHandlers(new WebSocketClient());
  ws.on('connectFailed', function (e) {
    log('CC: Conenction failed', e);
    reconnectFunction();
  });
  ws.connect('ws://' + config.cchat.host + ':' + config.cchat.port);
}

makeComicChat();



// IRC CONNECTION

var irc = {};
irc.listeners = [];

function makeIRC() {
  var connectHandler = function () {
    log('IRC: established connection, registering...');

    irc.on(/^PING :(.+)$/i, function (info) {
      irc.raw('PONG :' + info[1]);
    });

    irc.on(/^.+ 001 .+$/i, function () {
      irc.raw('JOIN ' + config.irc.channel);
    });

    irc.on(/^:(.+)!.+@.+ PRIVMSG .+? :(.+)$/i, function (info) {
      if (wsConnection && wsConnection.send) {
        log('CC -> RELAY ' + info[1] + ': ' + info[2]);
        wsConnection.send(JSON.stringify({
          type: 'message',
          room: config.cchat.room,
          text: info[2],
          author: info[1],
          spoof: true
        }));
      } else {
        log('IRC->CC Problem with CC connection, not relaying');
      }
    });

    irc.raw('NICK ' + config.irc.nick);
    irc.raw('USER ' + config.irc.user + ' 8 * :' + config.irc.real);
  };

  if (config.irc.ssl === true) {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Self-signed certificates
    irc.socket = tls.connect(config.irc.port, config.irc.host);
    irc.socket.on('secureConnect', connectHandler);
  } else {
    irc.socket = new net.Socket();
    irc.socket.on('connect', connectHandler);
    irc.socket.connect(config.irc.port, config.irc.host);
  }

  irc.socket.setEncoding('utf-8');
  irc.socket.setNoDelay();

  irc.handle = function (data) {
    var info;

    for (var i = 0; i < irc.listeners.length; i++) {
      info = irc.listeners[i][0].exec(data);

      if (info) {
        irc.listeners[i][1](info, data);

        if (irc.listeners[i][2]) {
          irc.listeners.splice(i, 1);
        }
      }
    }
  };

  irc.on = function (data, callback) {
    irc.listeners.push([data, callback, false]);
  };

  irc.on_once = function (data, callback) {
    irc.listeners.push([data, callback, true]);
  };

  irc.raw = function(data) {
    if (data !== '') {
      irc.socket.write(data + '\n', 'utf-8');
      log('IRC -> ' + data);
    }
  };

  irc.socket.on('data', function (data) {
    data = data.split("\n");

    for (var i = 0; i < data.length; i++) {
      if (data[i] !== '') {
        log('IRC <- ' + data[i]);
        irc.handle(data[i].slice(0, -1));
      }
    }
  });

  irc.socket.on('close', function () {
    makeIRC();
  });
}

makeIRC();