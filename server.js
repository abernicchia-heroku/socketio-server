// Code based on socket.io examples and https://gist.github.com/luciopaiva/e6f60bd6e156714f0c5505c2be8e06d8, adapted to run locally and on Heroku

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const PORT = process.env.PORT || 3000;
const CONTAINERNAME = process.env.DYNO || "local";
const SERVERID = `${CONTAINERNAME}-` + Math.floor(Math.random() * 1000000);

const SERVER2CLIENT_MESSAGE_INTERVAL_MSECS = process.env.SERVER2CLIENT_MESSAGE_INTERVAL_MSECS || 1000;
const BROADCAST_MESSAGE_INTERVAL_MSECS = process.env.BROADCAST_MESSAGE_INTERVAL_MSECS || 2000;


const options = { 
  transports: [ "websocket" ]
};

const io = new Server(options);

// if a Redis instance is available
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

  // to avoid socket.io "missing 'error' handler on this Redis client" warning
  pubClient.on("error", (err) => {
    console.log(err);
  });

  Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
  });
}

let sequenceNumberByClient = new Map();

// event fired every time a new client connects
io.on("connection", (socket) => {
    // initialize this client's sequence number
    sequenceNumberByClient.set(socket, 1);
    console.info(`Client connected [id=${socket.id}] clients: ${sequenceNumberByClient.size}`);

    socket.on("c2s-event", (data) => {
        console.info(`Client2Server event [id=${socket.id}] data: ${data}`);
        socket.emit("s2c-event", data);
    });

    // when socket disconnects, remove it from the list:
    socket.on("disconnect", () => {
        sequenceNumberByClient.delete(socket);
        console.info(`Client disconnected [id=${socket.id}] clients: ${sequenceNumberByClient.size}`);
    });
});

console.info(`Listening on PORT ${PORT}`);
io.listen(PORT);

// sends each client its current sequence number
setInterval(() => {
    for (const [client, sequenceNumber] of sequenceNumberByClient.entries()) {
        client.emit("seq-num", sequenceNumber);
        sequenceNumberByClient.set(client, sequenceNumber + 1);
    }
}, SERVER2CLIENT_MESSAGE_INTERVAL_MSECS);

// broadcast a message to all clients. With Redis all clients are notified even if not directly coonected to this socket.io server instance (e.g. multiple nodejs processes or multiple dynos)
setInterval(() => {
  if(sequenceNumberByClient.size > 0) {
    console.info(`Broadcasting ...`);
    io.emit(`s2c-event`, `server broadcast message - from: ${SERVERID}`);
  }
}, BROADCAST_MESSAGE_INTERVAL_MSECS);
