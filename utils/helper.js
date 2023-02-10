const bcrypt = require("bcrypt");
const User = require("../models/user");
const jwt = require("jsonwebtoken");


const createUser = async ({ userName, email, phoneNumber, password, profile }) => {
    try {
        const user = await User({
            userName, email, phoneNumber, password, profile
        });
        const result = await user.save()
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
};



// Future Update custumize message is fuind user or email
const checkEmailAndNumber = async (email = "null", phoneNumber = 0000000) => {
    try {
        const user = await User.findOne({ $or: [{ email }, { phoneNumber }] }).exec();
        return user;
    } catch (error) {
        throw new Error(error.message);
    }
}

const encryptPssword = async (password) => {
    try {
        const salt = await bcrypt.genSaltSync(10);
        const hash = await bcrypt.hashSync(password, salt);
        return hash;
    } catch (error) {
        throw new Error(error.message);
    }
}

const verifyPassword = async (plaintextPassword, hashedPassword) => {
    try {
        const result = await bcrypt.compare(plaintextPassword, hashedPassword)
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
};

const verifationToken = async (req, res, next) => {
    const token = req.headers.token;
    const result = jwt.verify(token, process.env.JWT);
    if (result.id && result.iat) {
        try {
            const user = await User.findById({ _id: result.id })
            req.user = user;
            next();
        } catch (error) {
            return res.json({ status: false, message: "Invalid user, user doesnot exit", data: null });
        }

    } else {
        return res.status(403).json({ status: "error", message: "Malformed sign-in token! Please use a valid sign-in token to continue.", data: null });
    }
}

const checkAvailable = (id, pendingRequests) => {
    console.log(id)
    console.log(pendingRequests[0]._id);
    return pendingRequests.some((person) => person._id.toHexString() === id);
};


const checkLists = (id, friends, pendingRequests, sendRequests) => {
    const friend = friends.some(element => element._id.toHexString() == id);
    const pendingRequest = pendingRequests.some(element => element._id.toHexString() == id);
    const sendRequest = sendRequests.some(element => element._id.toHexString() == id);

    return { friend, pendingRequest, sendRequest };
}

module.exports = {
    createUser,
    checkEmailAndNumber,
    encryptPssword,
    verifyPassword,
    verifationToken,
    checkAvailable,
    checkLists
}