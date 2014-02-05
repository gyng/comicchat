/* jslint node: true */

'use strict';

process.title = 'comicchat-server';

// Basic global logger -- replace with library
function log (text) {
  console.log((new Date()) + ' ' + text);
}

var http = require('http');
var websocketServer = require('websocket').server;

var wsServerPort = 8084;
var historySize = 100;
var clients = [];
var rooms = {};

// Dummy HTML server for websocket server to hook into
var httpServer = http.createServer(function () {});
httpServer.listen(wsServerPort, function () {
  log('Server listening on port ' + wsServerPort);
});

var wsServer = new websocketServer({
  httpServer: httpServer
});

function initRoom (name) {
  // Init room if doesn't exist
  rooms[name] = rooms[name] || {};
  rooms[name].history = rooms[name].history || [];
  rooms[name].clients = rooms[name].clients || [];
}

wsServer.on('request', function (request, response) {
  log('Connection from origin ' + request.origin);
  var connection = request.accept(null, request.origin);
  var index = clients.push(connection) - 1;
  var username = false;
  var room = false;
  var roomIndex = false;

  connection.on('message', function (message) {
    if (message.type === 'utf8') {
      log(' <- ' + username + ': ' + message.utf8Data);

      var obj;
      try {
        obj = JSON.parse(message.utf8Data);
      } catch (e) {
        log(' Bad message ' + username + ': ' + message.utf8Data);
        log(e);
        return;
      }

      switch (obj.type) {
      case 'requestHistory':
        initRoom(obj.room);

        // Send room scrollback
        connection.sendUTF(JSON.stringify({
          type: 'history',
          history: rooms[obj.room].history
        }));
        break;
      case 'requestStatus':
        connection.sendUTF(JSON.stringify({
          type: 'status',
          clients: clients.length,
          rooms: rooms.length
        }));
        break;
      case 'message':
        if (username === false) {
          // Register -- TODO: split out into message type
          username  = obj.text;
          room      = obj.room;
          roomIndex = rooms[obj.room].clients.push(connection);
        } else {
          // Broadcast
          var json = JSON.stringify({
            type: 'message',
            room:   obj.room,
            time:   (new Date()).getTime(),
            text:   obj.text,
            author: username
          });

          rooms[obj.room].history.push(json);
          rooms[obj.room].history.slice(-100);

          rooms[obj.room].clients.forEach(function (client) {
            client.sendUTF(json);
          });
        }
        break;
      }
    }
  });

  connection.on('close', function (connection) {
    log('Peer ' + connection.remoteAddress + ' disconnected');
    clients.splice(index, 1);
    if (roomIndex !== false) {
      rooms[room].clients.splice(index, 1);
    }
  });
});