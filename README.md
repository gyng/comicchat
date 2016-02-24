`<font face="ms comic sans">`

# comicchat

Based off Microsoft Comic Chat. Uses node.js and websockets.

![Screenshot](http://i.imgur.com/J1k7iwn.png)

## Features

* Comic chat
* Rooms
* Notifications
* Text-to-speech via Web Speech API
* Basic relay support for animating your (IRC) chat

## Usage

0. Clone repo.
1. `npm install`
2. Change address of server in `client/js/client.js`
3. Change port of server in `server/server.js`
4. `node server/server.js` or `npm start`
5. Visit `client/index.html`

## Deploy

* Deploy the client to `gh-pages` with `npm run deploy`

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

## Relay

If you want to watch your Best Internet IRC Friends in a voiced comic you can configure `relay/relay.js` and then run it with `node relay/relay.js`.

## TODO

* Tests

`</font>`
