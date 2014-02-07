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
var historySize = 500;
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
  var joinedRooms = [];

  function sendHistory (room) {
    initRoom(room);

    // Send room scrollback
    connection.sendUTF(JSON.stringify({
      type: 'history',
      history: rooms[room].history
    }));
  }

  function joinRoom (newRoom) {
    initRoom(newRoom);
    rooms[newRoom].clients.push(connection);
    joinedRooms.push(newRoom);
  }

  function leaveRoom (room) {
    var i;
    if (typeof rooms[room] !== 'undefined') {
      i = rooms[room].clients.indexOf(connection);
      rooms[room].clients.splice(i, 1);
    }

    i = joinedRooms.indexOf(room);
    joinedRooms.splice(i, 1);
  }

  function broadcastTo (room, data) {
    rooms[room].clients.forEach(function (client) {
      client.sendUTF(data);
    });
  }

  connection.on('message', function (message) {
    try {
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
        case 'history':
          sendHistory(obj.room);
          break;
        case 'join':
          joinRoom(obj.room);
          break;
        case 'part':
          leaveRoom(obj.room);
          break;
        case 'message':
          if (username === false) {
            // Register -- split out into message type?
            username  = obj.text;
          } else {
            // Broadcast
            var json = JSON.stringify({
              type: 'message',
              room:   obj.room,
              time:   (new Date()).getTime(),
              text:   obj.text,
              author: obj.spoof ? obj.author : username
            });

            rooms[obj.room].history.push(json);
            rooms[obj.room].history = rooms[obj.room].history.slice(-100);

            broadcastTo(obj.room, json);
          }
          break;
        }
      }
    } catch (e) {
      log(' Error in connection.on');
      log(e);
    }
  });

  connection.on('close', function (connection) {
    log('Peer ' + username + ' ' + connection.remoteAddress + ' disconnected');
    joinedRooms.forEach(function (room) {
      leaveRoom(room);
    });
    clients.splice(index, 1);
  });
});