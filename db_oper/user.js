const User = require("../models/user");


const createUser = async ({ userName, email, phoneNumber, password }) => {
    try {
        const user = await User({
            userName, email, phoneNumber, password
        });
        const result = await user.save()
        return result;
    } catch (error) {
        throw new Error(error.message);
    }
};


module.exports = {
    createUser,

}