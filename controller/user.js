const jwt = require("jsonwebtoken");

const {
    checkEmailAndNumber,
    encryptPssword,
    verifyPassword,
} = require("../utils/helper");

const {
    createUser,
} = require("../db_oper/user");



// Creating User
const register = async (req, res) => {
    let { userName, email, phoneNumber, password } = req.body;
    try {
        const isAvailable = await checkEmailAndNumber(email, phoneNumber); // return user

        if (isAvailable) {
            return res.json({ message: "Please use different Email/Number" });
        }

        password = await encryptPssword(password);

        const result = await createUser({ userName, email, phoneNumber, password });
        return res.status(201).json({ status: true, message: "User is successfully created", trace: result });
    } catch (error) {
        return res.status(422).json({ status: false, message: "An error occured!", trace: error.message });
    }
}

// Login
const login = async (req, res) => {
    const { email, phoneNumber, password } = req.body;
    try {
        let user = await checkEmailAndNumber(email, phoneNumber);

        if (!user) {
            return res.json({ message: "Please use correct Email/Number" });
        }

        const result = await verifyPassword(password, user.password);

        if (!result) {
            return res.json({ message: "Please use correct password" });
        }

        // Creating token
        const token = jwt.sign({ id: user._id }, process.env.JWT);

        let userdata = {
            ...user._doc,
            token
        }

        delete userdata.password;
        return res.status(200).json({ status: true, message: "Login successfull", data: userdata });
    } catch (error) {
        return res.status(400).json({ status: false, message: "An error occured!", trace: error.message });
    }
}


// Update
const updateProfile = async (req, res) => {
    try {
        const body = req.body
        const user = req.user

        const validation = new SimpleSchema({
            userName: {
                type: String,
                optional: true
            },
            password: {
                type: String,
                optional: true
            }
        }).newContext();

        if (!validation.validate(body)) return res.status(422).json({
            status: false,
            message: 'All fields required!'
        });

        if (body.password) {
            const hashedPassword = await bcrypt.hash(body.password, 12);
            body.password = hashedPassword;
        }

        await User.findByIdAndUpdate(user._id, { $set: body });

        return res.status(200).json({
            status: true,
            message: 'User Updated!',
        });

    } catch (error) {
        return res.status(422).json({
            status: false,
            message: "Unexpected Error Occured!",
            trace: error.message
        });
    }
}


module.exports = {
    register,
    login,
    updateProfile,
    
}