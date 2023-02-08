const bcrypt = require("bcrypt");
const User = require("../models/user");



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
        const salt = await bcrypt.genSaltSync(12);
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


module.exports = {
    checkEmailAndNumber,
    encryptPssword,
    verifyPassword
}