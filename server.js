// 'use strict';

// const express = require('express');
// const socketIO = require('socket.io');

// const PORT = process.env.PORT || 3000;
// const INDEX = '/index.html';

// const server = express()
//   .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
//   .listen(PORT, () => console.log(`Listening on ${PORT}`));

// const io = socketIO(server);

// io.on('connection', (socket) => {
//   console.log('Client connected');
//   socket.on('disconnect', () => console.log('Client disconnected'));
// });

// setInterval(() => io.emit('time', new Date().toTimeString()), 1000);



const PORT = process.env.PORT || 8000;

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const options = { 
  transports: [ "websocket" ]
};

const io = new Server(PORT, options);

if (process.env.REDIS_URL) {
  console.info(`Using Redis ${process.env.REDIS_URL}`);

  const pubClient = createClient({ 
    url: process.env.REDIS_URL,
    socket: {
      tls: true,
      rejectUnauthorized: false
    }     
  });
  const subClient = pubClient.duplicate();

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });
}

let
    sequenceNumberByClient = new Map();

// event fired every time a new client connects:
io.on("connection", (socket) => {
    // initialize this client's sequence number
    sequenceNumberByClient.set(socket, 1);
    console.info(`Client connected [id=${socket.id}] clients: ${sequenceNumberByClient.size}`);

    socket.on("c2s-event", (data) => {
        console.info(`Client2Server event [id=${socket.id}] data: ${data}`);
        socket.emit("seq-num", data);
    });

    // when socket disconnects, remove it from the list:
    socket.on("disconnect", () => {
        sequenceNumberByClient.delete(socket);
        console.info(`Client gone [id=${socket.id}] clients: ${sequenceNumberByClient.size}`);
    });
});

// sends each client its current sequence number
setInterval(() => {
    for (const [client, sequenceNumber] of sequenceNumberByClient.entries()) {
        client.emit("seq-num", sequenceNumber);
        sequenceNumberByClient.set(client, sequenceNumber + 1);
    }
}, 1000);
