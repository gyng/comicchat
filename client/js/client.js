(function () {
  'use strict';

  var serverAddress = 'ws://hidoi.moebros.org:8084';

  var ui = new UI({
    content:       document.getElementById('content'),
    input:         document.getElementById('input'),
    inputForm:     document.getElementById('input-form'),
    status:        document.getElementById('status'),
    notifyEnabled: document.getElementById('notify')
  });

  if (typeof (window.WebSocket || window.MozWebSocket) === 'undefined') {
    document.getElementByTag('body').innerHTML = 'Websocket support required.';
    return;
  }

  var connection = new WebSocket(serverAddress);
  ui.setConnection(connection);

  connection.onopen = function () {
    console.log('Connection to ' + serverAddress + ' established');
    ui.setStatus('Connected.');
  };

  connection.onerror = function (e) {
    console.log('Connection error', e);
    ui.setStatus('Disconnected.');
  };

  connection.onmessage = function (message) {
    try {
      var obj = JSON.parse(message.data);
    } catch (e if e instanceof SyntaxError) {
      console.log('Invalid message', e);
      return;
    }

    switch (obj.type) {
    case 'history':
      ui.addHistory(obj.data);
      break;
    case 'message':
      ui.addLine(obj.data);
      ui.notify(obj.data);
      break;
    default:
      console.log('Unknown message', obj);
      break;
    }
  };
})();