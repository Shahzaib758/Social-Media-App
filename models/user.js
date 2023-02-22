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
    dateOfBirth: {
        type: Date,
        required: true,
        validate: {
            validator: function (value) {
                // validate that the value is a valid date and is not in the future
                const now = new Date();
                return value instanceof Date && value <= now;
            },
            message: 'Invalid date of birth',
        },
    },
    password: {
        type: String,
        required: true
    },
    gender: {
        type: String,
        enum: ["Male", "Female", "Others"],
        message: "Gender can't be {Value}",
        required: [true, "Gender is required"]
    },
    location: {
        type: String,
        required: [true, "location is required"]
    },
    profile: {
        type: String,
        default: ""
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
        message: "Deactivate can't be {Value}",
        default: false
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