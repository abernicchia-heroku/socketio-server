// Code based on socket.io examples and https://gist.github.com/luciopaiva/e6f60bd6e156714f0c5505c2be8e06d8, adapted to run locally and on Heroku, both on Common Runtime and Private Spaces
// It uses Websocket transport protocol and not long-polling as the latter is not supported by Private Spaces as session affinity feature is not available yet. 
// Multiple server nodes (e.g. nodejs cluster or multiple dynos) are supported with the use of Redis adapater, in this way broadcast events can be sent to all clients connected across different processes/dynos 

import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import throng from 'throng'

const WORKERS = process.env.WEB_CONCURRENCY || 1;
const PORT = process.env.PORT || 3000;
const CONTAINERNAME = process.env.DYNO || "local";
const SERVERID = `${CONTAINERNAME}-` + Math.floor(Math.random() * 1000000);

const SERVER2CLIENT_MESSAGE_INTERVAL_MSECS = process.env.SERVER2CLIENT_MESSAGE_INTERVAL_MSECS || 1000;
const BROADCAST_MESSAGE_INTERVAL_MSECS = process.env.BROADCAST_MESSAGE_INTERVAL_MSECS || 2000;


function start() {

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
      console.info(`Client connected [id=${socket.id}] serverID: ${SERVERID} clients: ${sequenceNumberByClient.size}`);

      socket.on("c2s-event", (data) => {
          console.info(`Client2Server event [id=${socket.id}] data: ${data}`);
          socket.emit("s2c-event", data);
      });

      // when socket disconnects, remove it from the list:
      socket.on("disconnect", () => {
          sequenceNumberByClient.delete(socket);
          console.info(`Client disconnected [id=${socket.id}] serverID: ${SERVERID} clients: ${sequenceNumberByClient.size}`);
      });
  });

  console.info(`Listening on PORT: ${PORT} serverID: ${SERVERID}`);
  io.listen(PORT);

  // sends each client its current sequence number
  setInterval(() => {
      for (const [client, sequenceNumber] of sequenceNumberByClient.entries()) {
          client.emit("seq-num", sequenceNumber);
          sequenceNumberByClient.set(client, sequenceNumber + 1);
      }
  }, SERVER2CLIENT_MESSAGE_INTERVAL_MSECS);

  // broadcast a message to all clients. With Redis all clients are notified even if not directly coonected to this socket.io server instance
  setInterval(() => {
    if(sequenceNumberByClient.size > 0) {
      console.info(`Broadcasting ...`);
      io.emit(`s2c-event`, `server broadcast message - from: ${SERVERID}`);
    }
  }, BROADCAST_MESSAGE_INTERVAL_MSECS);
}

throng({
    // Fn to call in cluster workers (can be async)
    worker: start,

    // Number of workers
    count: WORKERS,

    // Min time to keep cluster alive (ms)
    lifetime: Infinity,
})
