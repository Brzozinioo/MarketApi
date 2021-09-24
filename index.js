const config = require("config");
const Joi = require("joi");
Joi.objectId = require("joi-objectid")(Joi);
const mongoose = require("mongoose");
const users = require("./routes/users");
const auth = require("./routes/auth");
const allegro = require("./routes/allegro");
const ebay = require("./routes/ebay");
const monitor = require("./routes/monitor");
const cors = require("cors");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  cors: {
    origin: process.env.WEBSITE_URL,
    methods: ["GET", "POST"],
  },
  pingInterval: 300,
  pingTimeout: 200,
  "sync disconnect on unload": true,
});
const socketioJWT = require("socketio-jwt");
require("dotenv").config();
require("./lib/agenda");

var usersArray = [];

if (!config.get("jwtKey")) {
  console.error("Error: jwtKey nie został zdefiniowany!");
  process.exit(1);
}

mongoose
  .connect(process.env.DB_HOST, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => {
    console.log("Połączono z bazą danych ...");
  })
  .catch((err) => console.error("Nie udało połączyć się z bazą danych..."));

app.use(express.json());
app.use(cors());
app.use("/users", users);
app.use("/auth", auth);
app.use("/allegro", allegro);
app.use("/ebay", ebay);
app.use("/monitor", monitor);

io.use(
  socketioJWT.authorize({
    secret: config.get("jwtKey"),
    handshake: true,
  })
);

io.on("connection", (socket) => {
  console.log(
    `${socket.decoded_token.email} otworzył aplikację id: ${socket.id}`
  );

  usersArray.push({
    id: socket.id,
    userID: socket.decoded_token._id,
  });

  socket.on("disconnect", () => {
    usersArray.forEach((element, index) => {
      if (element.id === socket.id) {
        usersArray.splice(index, 1);
      }
    });
  });
  console.log(usersArray);
});

const port = process.env.DB_PORT || 3000;
http.listen(port, () => console.log(`Nasłuchiwanie na porcie ${port}`));

module.exports.usersArray = usersArray;
module.exports.io = io;
