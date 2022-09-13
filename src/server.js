import express from "express";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { Server } from "socket.io";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");

app.use("/public", express.static(__dirname + "/public"));

app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer);

httpServer.listen(3000, () => {
  console.log("Server is working");
});

wsServer.on("connection", (socket) => {
  socket.on("enter_room", (msg, done) => {
    console.log(msg);
    setTimeout(() => {
      done();
    }, 10000);
  });
});

// const server = http.createServer(app);

// const wss = new WebSocketServer({ server });

// const sokets = [];

// wss.on("connection", (socket) => {
//   sokets.push(socket);
//   console.log("connected to Browser");
//   socket.on("message", (message) => {
//     sokets.forEach((aSocket) => aSocket.send(message));
//   });
// });

// server.listen(3000, handleListen);

// {
//   type: "message";
//   payload: "hello everyone!";
// }

// {
//   type: "nickname";
//   payload: "tae";
// }
