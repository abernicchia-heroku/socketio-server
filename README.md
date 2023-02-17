# socket.io server on Heroku

## DISCLAIMER

The author of this article makes any warranties about the completeness, reliability and accuracy of this information. Any action you take upon the information of this website is strictly at your own risk, and the author will not be liable for any losses and damages in connection with the use of the website and the information provided.

## Description

Example of socket.io server that supports multiple nodes and the usage of broadcasting, server to client and client to server events.

This code can run locally or on Heroku, both on Common Runtime and Private Spaces.
It uses Websocket-only transport protocol and not long-polling as the latter is not currently supported by Private Spaces as [session affinity feature is not available yet](https://blog.heroku.com/session-affinity-ga#getting-started-with-session-affinity).

Multiple server nodes (e.g. nodejs cluster or multiple dynos) are supported with the use of Redis adapater, in this way broadcast events can be sent to all clients connected across different processes/dynos.

The server listens for **c2s-event** events from the clients, emits **seq-num** events and broadcast **s2c-event** events.

## Setup procedure

Use the following Heroku Button to create an application on a Private Space, all the required add-ons and configuration variables will be created automatically.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

Otherwise, use the following procedure to deploy the application manually:

1. git clone https://github.com/abernicchia-heroku/socketio-server.git
2. cd socketio-server
3. heroku create
4. heroku addons:create heroku-redis
5. heroku addons:create papertrail (optional)
6. git add .
7. git commit -m "starting point"
8. git push heroku main
9. heroku ps:scale web=1

## Environment variables configuration

The following configuration variables are used by the application:

SERVER2CLIENT_MESSAGE_INTERVAL_MSECS: Server to clients message emit frequency in milliseconds.

BROADCAST_MESSAGE_INTERVAL_MSECS: Broadcast events frequency in milliseconds.

WEB_CONCURRENCY: The number of processes / socket.io servers to run within the same dyno / container. This configuration variable can be also removed as it's automatically set by Heroku based on the dyno tier in use (see [Tuning the concurrency level](https://devcenter.heroku.com/articles/node-concurrency#tuning-the-concurrency-level))

## Test

You can test your server using any socket.io compatible client like this compound multi-client that allows you to create multiple parallel sessions and be able to handle the events sent/received by the server.














