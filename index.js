console.clear()
require("dotenv").config();
const upload = require('express-fileupload');
const express = require("express");
const app = express();
const cors = require('cors');
const colors = require("colors");
const { errorHandler, routeNotFound } = require("./middleware/errorMiddleware");

const userRouter = require("./router/userRouter");
const chatRouter = require("./router/chatRouter");
const messageRouter = require("./router/messageRouter");
const notificationRouter = require("./router/notificationRouter");

require("./database/conn");

const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());
app.use(upload());
app.use(express.static('public'));

// Main Routes
app.use("/api/user", userRouter);
app.use("/api/chats", chatRouter);
app.use("/api/message", messageRouter);
app.use("/api/notification", notificationRouter);


// Error handling routes
app.use(routeNotFound); 
app.use(errorHandler);

const server = app.listen(process.env.PORT || 5000, () => {
    console.log(
        colors.brightMagenta(`\nServer is UP on PORT ${process.env.PORT}`)
    );
});


const io = require("socket.io")(server, {
    cors: {
        origin: "*",
    },
});

io.on("connection", (socket) => {
    console.log("Sockets are in action");
    socket.on("setup", (userData) => {
        socket.join(userData._id);
        console.log(userData.username, "connected");
        socket.emit("connected");
    });
    socket.on("join chat", (room) => {
        socket.join(room);
        console.log("User joined room: " + room);
    });
    socket.on("new message", (newMessage) => {
        var chat = newMessage.chatId;
        console.log(chat, 'chat here');
        if (!chat.users) return console.log("chat.users not defined");

        chat.users.forEach((user) => {
            if (user._id === newMessage.sender._id) return;
            console.log(newMessage, 'new message content');
            socket.in(user._id).emit("message received", newMessage);
        });
    });
    socket.off("setup", () => {
        console.log("USER DISCONNECTED");
        socket.leave(userData._id);
    });
});
