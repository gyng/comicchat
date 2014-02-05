`<font face="ms comic sans">`

# comicchat

Based off Microsoft Comic Chat. Uses node.js and websockets.

![Screenshot](http://i.imgur.com/J1k7iwn.png)

## Features

* Comic chat
* Rooms
* Notifications
* Google Translate text-to-speech abuse (Chrome only right now)
* Basic relay support for animating your (IRC) chat

## Usage

0. Clone repo.
1. `npm install websocket`
2. Change address of server in `client/client.js`
3. Change port of server in `server/server.js`
4. `node server/server.js`
5. Visit `client/index.html`

## Protocol

Connect to the WebSocket server and start pushing JSON. Subject to change.

### Send

    {
        type: 'join',
        room: 'room'
    }

* `history`, `join`, `part` require `room`
* `message` requires `room` and `text`, `spoof: true` optional for relays

### Receive

* `history` --- `type`, `history` (an array of messages for the requested room)
* `message` --- `type`, `room`, `time`, `text`, `author`

## TODO

* More characters
* More algorithm
* More styling
* Cleaner code
* Everything else

`</font>`