const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, "Username is required"],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        trim: true
    },
    phone: {
        type: Number,
        required: [true, "Phone number is required"],
    },
    password: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ["male", "female"],
        message: "Gender can't be {Value}",
        required: [true, "Gender is required"]
    },
    live: {
        type: String,
    },
    profile: {
        type: String,
    },
    bio: {
        type: String,
        maxLenght: [500, "Bio must contain 500 characters"]
    },
    skills: {
        type: String
    },
    profession: {
        type: String,
    },
    deactivate: {
        type: Boolean,
        enum: [true, false],
        message: "Deactivate can't be {Value}"
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