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
var history = [];
var clients = [];

// Dummy HTML server for websocket server to hook into
var httpServer = http.createServer(function () {});
httpServer.listen(wsServerPort, function () {
  log('Server listening on port ' + wsServerPort);
});

var wsServer = new websocketServer({
  httpServer: httpServer
});

wsServer.on('request', function (request, response) {
  log('Connection from origin ' + request.origin);
  var connection = request.accept(null, request.origin);
  var index = clients.push(connection) - 1;
  var username = false;
  log('Connection accepted');

  // Send scrollback
  connection.sendUTF(JSON.stringify({
    type: 'history',
    data: history
  }));

  connection.on('message', function (message) {
    if (message.type === 'utf8') {
      log(' <- ' + username + ': ' + message.utf8Data);

      if (username === false) {
        // Register
        username = message.utf8Data;
      } else {
        // Broadcast
        var json = JSON.stringify({
          type: 'message',
          data: {
            time:   (new Date()).getTime(),
            text:   message.utf8Data,
            author: username
          }
        });

        history.push(json);
        history.slice(-100);

        for (var i = 0; i < clients.length; i++) {
          clients[i].sendUTF(json);
        }
      }
    }
  });

  connection.on('close', function (connection) {
    log('Peer ' + connection.remoteAddress + ' disconnected');
    clients.splice(index, 1);
  });
});