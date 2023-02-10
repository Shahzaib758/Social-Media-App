const mongoose = require("mongoose");


const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    profile: {
        type: String,
    },
    friends: {
        type: Array,
    },
    pendingRequests: {
        type: Array,
    },
    sendRequests: {
        type: Array,
    },
    blockList: {
        type: Array,
    }
});


const User = mongoose.model("user", userSchema);

module.exports = User;