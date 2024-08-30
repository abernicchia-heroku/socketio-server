# socket.io server on Heroku

## DISCLAIMER

The author of this article makes any warranties about the completeness, reliability and accuracy of this information. Any action you take upon the information of this website is strictly at your own risk, and the author will not be liable for any losses and damages in connection with the use of the website and the information provided.

## Description

Example of [socket.io](https://socket.io/) server that supports multiple nodes and the usage of broadcasting, server to client and client to server events.

This code can run locally or on Heroku, both on Common Runtime and Private Spaces.
It uses **websocket**-only transport protocol and not **long-polling** as the latter is not currently supported by Private Spaces as [session affinity feature is not available yet](https://blog.heroku.com/session-affinity-ga#getting-started-with-session-affinity).

Multiple server nodes (e.g. nodejs cluster or multiple dynos) are supported with the use of [Redis adapater](https://socket.io/docs/v4/redis-adapter/), in this way broadcast events can be sent to all clients connected across different processes/dynos.

The server listens for **c2s-event** events from clients, emits **seq-num** events and broadcast **s2c-event** events.

## Setup procedure

Use the following Heroku Button to create an application on a Private Space, all required add-ons and configuration variables will be created automatically.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Otherwise, use the following procedure to deploy the application manually on a Private Space or on the Common Runtime:

```
// Private Space
git clone https://github.com/abernicchia-heroku/socketio-server.git
cd socketio-server
heroku create <app name> --space=<Private Space name>
heroku addons:create heroku-redis:private-7 // wait until the add-on is created using: heroku addons:info <Redis add-on name>
heroku addons:create papertrail
git add .
git commit -m "starting point"
git push heroku main
heroku ps:scale web=1

// Common Runtime
git clone https://github.com/abernicchia-heroku/socketio-server.git
cd socketio-server
heroku create <app name>
heroku addons:create heroku-redis:premium-0 // wait until the add-on is created using: heroku addons:info <Redis add-on name>
heroku addons:create papertrail
git add .
git commit -m "starting point"
git push heroku main
heroku ps:scale web=1
```

## Environment variables configuration

The following configuration variables are used by the application:

**SERVER2CLIENT_MESSAGE_INTERVAL_MSECS**: Server to clients message emit frequency in milliseconds.

**BROADCAST_MESSAGE_INTERVAL_MSECS**: Broadcast events frequency in milliseconds.

**FORCE_CLIENT_DISCONNECTION**: Enable/disable forced client disconnection after CLIENT_DISCONNECT_INTERVAL_MSECS.

**CLIENT_DISCONNECT_INTERVAL_MSECS**: See FORCE_CLIENT_DISCONNECTION.

**WEB_CONCURRENCY**: The number of processes / socket.io servers to run within the same dyno. This configuration variable can be omitted as it's automatically set by Heroku based on the dyno tier in use (see [Tuning the concurrency level](https://devcenter.heroku.com/articles/node-concurrency#tuning-the-concurrency-level))

## Test

You can test your server using any socket.io compatible client like this compound [multi-client](https://github.com/abernicchia-heroku/socketio-multiclient) that creates multiple parallel websocket sessions and is able to handle the events sent/received by the server.

Every SERVER2CLIENT_MESSAGE_INTERVAL_MSECS the server sends to each client connected its own sequential number (**seq-num** event), increased by 1 at each delivery, and starting from 1 once the client connects (e.g. 1, 2, 3 ...).

Every BROADCAST_MESSAGE_INTERVAL_MSECS the server broadcasts the same message (**s2c-event** event) to all clients connected inlcuding the server identifier in the payload.

Setting FORCE_CLIENT_DISCONNECTION to true (default = false) it's possible to force clients disconnection after CLIENT_DISCONNECT_INTERVAL_MSECS.

The server listens for **c2s-event** from clients and responds back emitting a **s2c-event** event including the original payload received from the client.

It's possible to enable debug messages (e.g. when events are emitted or received) setting LOG_LEVEL=debug.

## Admin UI

The server is instrumented in development mode to support socket.io [Admin UI](https://socket.io/docs/v4/admin-ui/) then using the hosted version at https://admin.socket.io/, it's possible to have access to an administrative console. When the connection modal appears, enter the URL of your server (e.g. https://example.com) without credentials (authentication is disabled), toggle "Advanced options" and "WebSocket only?" then click "Connect".














