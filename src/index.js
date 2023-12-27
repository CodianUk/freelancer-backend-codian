// Package imports
import "dotenv/config";
import express from "express";
import { createServer } from "http";
// import { Server as server } from "socket.io";
import mongoose from "mongoose";
import helmet from "helmet";
import Session from "express-session";
import passport from "passport";
// import morgan from "morgan";
import cors from "cors";

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");

// Redis
import Redis from "ioredis";
const redisClient = new Redis(process.env.REDIS_URL);
import { RedisSessionStore } from "./sessionStore.js";
const sessionStore = new RedisSessionStore(redisClient);

// Error Classes
import errorHandler from "./middleware/globalErrorHandler.js";
import NOTFOUND from "./errors/notFound.js";
import BadRequest from "./errors/badRequest.js";

import { accessTokenVerify } from "./middleware/authentication.js";

// Routes import
import authRouter from "./routes/auth.routes.js";
import uploadsRoute from "./routes/uploads.routes.js";
import adminRouter from "./routes/admin.routes.js";
import startupRouter from "./routes/startup.routes.js";
import freelanceRouter from "./routes/freelancer.routes.js";
import chatRouter from "./routes/chat.routes.js";
import jobsRouter from "./routes/jobs.routes.js";
import orderRouter from "./routes/order.routes.js";
import warningRouter from "./routes/warning.routes.js";
import userRouter from "./routes/user.routes.js";
import transactionRouter from "./routes/transaction.routes.js";
import walletRouter from "./routes/wallet.routes.js";
import stripeRouter from "./routes/stripe.routes.js";
import likeRouter from "./routes/like.routes.js";
import skillsRouter from "./routes/skills.routes.js";

// Connect to Mongoose
mongoose.set("strictQuery", true);
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connected to the Database");
  })
  .catch((err) => console.log(err));

// APP
const app = express();
app.timeout = 5000;
// Socket.io
const httpServer = createServer(app);
// const io = new server(httpServer, {
//   cors: {
//     origin: "*",
//   },
// });

// check if token in header is valid
// io.use(async (socket, next) => {
//   const header = socket.handshake;
//   const req = socket.request;
//   if (!header) {
//     return next(new BadRequest("No header object"));
//   }
//   if (!req) {
//     return next(new BadRequest("No request object"));
//   }
//   accessTokenVerify(req, socket, next);
// });

// io.use(async (socket, next) => {
//   const req = socket.request;
//   console.log("Client connected", req.user);
//   socket.sessionID = req.user._id;
//   socket.userID = req.user._id;
//   next();
// });

// io.on("connection", async (socket) => {
//   sessionStore.saveSession(socket.sessionID, {
//     userID: socket.userID,
//     connected: true,
//   });

//   // emit session details
//   socket.emit("session", {
//     sessionID: socket.sessionID,
//     userID: socket.userID,
//   });

//   // join the "userID" room
//   socket.join(socket.userID);
//   // notify other users
//   let users = [];
//   for (let [id, socket] of io.of("/").sockets) {
//     users.push({
//       userID: socket.userID,
//     });
//   }
//   io.emit("users", users);

//   // send a message to the other user
//   socket.on("private message", async ({ content, to }) => {
//     const toSocket = await io.in(to).allSockets();
//     toSocket.forEach((socketID) => {
//       io.to(socketID).emit("private message", {
//         content,
//         from: socket.userID,
//       });
//     });
//   });

//   // join a room
//   socket.on("join-room", (roomID) => {
//     socket.join(roomID);
//   });

//   // send a msg to group
//   socket.on("group message", (message, roomId) => {
//     socket.to(roomId).emit("get-group-messages", message, socket.userID);
//   });

//   socket.on("disconnect", async () => {
//     console.log("Client disconnected");
//     const matchingSockets = await io.in(socket.userID).allSockets();
//     const isDisconnected = matchingSockets.size === 0;
//     if (isDisconnected) {
//       // notify other users
//       // socket.broadcast.emit("user disconnected", socket.userID);
//       let users = [];
//       for (let [id, socket] of io.of("/").sockets) {
//         users.push({
//           userID: id,
//         });
//       }
//       io.emit("users", users);
//       // update the connection status of the session
//       sessionStore.saveSession(socket.sessionID, {
//         userID: socket.userID,
//         connected: false,
//       });
//     }
//   });
// });
// Middleware
app.use(cors());
app.use(helmet());
// app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("views"));
app.use(
  Session({
    name: "google-oauth-session",
    secret: "knsdkjfjk88yyihyiuh3n98y9iuin-v-lslsjfsf-scfmlkjfsdfrvdfcsf",
    resave: true,
    saveUninitialized: false,
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get("/", async (req, res) => {
  res.json({ message: "APP UP AND RUNNING!!! CONGRATS" });
});

// Routes
app.use("/auth", authRouter);
app.use("/media", uploadsRoute);
app.use("/user", userRouter);
app.use("/admin", adminRouter);
app.use("/startup", startupRouter);
app.use("/freelancer", freelanceRouter);
app.use("/chat", chatRouter);
app.use("/jobs", jobsRouter);
app.use("/orders", orderRouter);
app.use("/warnings", warningRouter);
app.use("/transactions", transactionRouter);
app.use("/wallet", walletRouter);
app.use("/stripe", stripeRouter);
app.use("/like",likeRouter);
app.use('/skills',skillsRouter);

//404 when invalid route is given
app.use((req, res, next) => {
  next(new NOTFOUND("Resource not found"));
});

// Error handler
app.use(errorHandler);

// Listen
const PORT = process.env.PORT || 8000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
