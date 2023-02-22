const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const {
    checkEmailAndNumber,
    encryptPssword,
    verifyPassword,
    checkAvailable,
    checkLists,
} = require("../utils/helper");

const User = require("../models/user");

// GET Single User 
const getUser = async (req, res) => {
    const user = req.user;
    const { id } = req.params;

    try {
        // Check weather request is for Users own profile
        const match = user._id.toHexString() === id;
        if (match) {
            let userdata = { ...user }

            delete userdata.password;
            return res.json({ status: true, message: "Operation successfull", data: userdata })
        }
        else {
            let userdata = await User.findOne({ _id: id }).lean();

            // ChecK user blocklist or other user (ID) blockList
            const result_1 = checkLists(id, [], [], [], user.blockList);
            const result_2 = checkLists(user._id, [], [], [], userdata.blockList);

            if ((result_1.isBlocked) || (result_2.isBlocked)) {
                return res.status(400).json({ status: false, message: "User doesnot exit" })
            }

            return res.json({
                status: true,
                message: "Operation successfull",
                data: userdata
            })
        }

    } catch (error) {
        return res.status(400).json({ status: false, message: "An error occured!", trace: error.message })
    }
}

// Suggest Users based on filter
const suggestUsers = async (req, res) => {
    console.log(req.user)
    try {
        const { page = 1 } = req.query;
        let limit = 10

        console.log(await User.find())

        // validate the page and limit parameters
        if (!Number.isInteger(+page) || +page <= 0) {
            return res.status(400).json({ message: 'Invalid page number' });
        }
        if (!Number.isInteger(+limit) || +limit <= 0 || +limit > 100) {
            return res.status(400).json({ message: 'Invalid limit value' });
        }

        // Check if any query parameters are present
        const { username, minAge, maxAge, gender, location, profession } = req.query;
        let filter = {
            friends: { $nin: [req.user._id] },
            pendingRequests: { $nin: [req.user._id] },
            sendRequests: { $nin: [req.user._id] },
            blockList: { $nin: [req.user._id] },
            _id: { $ne: req.user._id },
            // deactivate: false,
        };

        if (username) {
            console.log("username")
            filter.username = { $regex: username, $options: 'i' };
        }

        if (minAge || maxAge) {
            filter.dateOfBirth = {};
            console.log("age")
            if (minAge) {
                const minDate = new Date();
                minDate.setFullYear(minDate.getFullYear() - minAge);
                filter.dateOfBirth.$lte = minDate;
            }

            if (maxAge) {

                const maxDate = new Date();
                maxDate.setFullYear(maxDate.getFullYear() - maxAge - 1);
                filter.dateOfBirth.$gt = maxDate;
            }
        }

        if (gender) {
            console.log("gender")
            filter.gender = gender;
        }

        if (location) {
            console.log("location")
            filter.location = { $regex: location, $options: 'i' };
        }

        if (profession) {
            console.log("profession")
            filter.profession = { $regex: profession, $options: 'i' };
        }

        console.log(filter)
        // If there are no filter parameters, just return all users
        const count = await User.countDocuments(filter);
        console.log(count)
        if (count === 0) {
            let users = await User.aggregate([{ $match: filter }, { $sample: { size: parseInt(limit) } }]);
            return res.json({ data: users, totalPages: 1 });
        }

        // Otherwise, filter and paginate users
        const users = await User.find(filter)
            .sort({ _id: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .select('-friends -pendingRequests -sendRequests -blockList');


        const totalPages = Math.ceil(count / limit);

        res.json({ status: true, message: "Operation successfull", trace: users, totalPages });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: false, message: 'Internal server error' });
    }
};

// Creating User
const registerUser = async (req, res) => {
    let {
        email,
        password,
        username,
        location,
        phone,
        gender,
        profession,
    } = req.body;

    try {
        const isAvailable = await checkEmailAndNumber(email, phone); // return user

        if (isAvailable) {
            return res.json({ status: false, message: "Email/Number already in used!" });
        }

        password = await encryptPssword(password);

        const userObj = {
            email,
            password,
            username,
            location,
            phone,
            gender,
            profession,
        }

        const result = await User.create(userObj);
        return res.status(201).json({ status: true, message: "User created!" });
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
            return res.status(400).json({ status: false, message: "Email/Number already exits" });
        }

        const result = await verifyPassword(password, user.password);

        if (!result) {
            return res.status(400).json({ status: false, message: "Please enter correct password" });
        }

        // Creating token
        const token = jwt.sign({ id: user._id }, process.env.JWT);

        return res.status(200).json({
            status: true, message: "Login successfull", data: {
                id: user._id,
                username: user.username,
                email: user.email,
                phone: user.phone,
                gender: user.gender,
                profile: user.profile,
                profession: user.profession,
                token
            }
        });
    } catch (error) {
        return res.status(400).json({ status: false, message: "An error occured!", trace: error.message });
    }
}

// Update User
const updateUser = async (req, res) => {

    const body = req.body;
    const user = req.user;

    try {
        const updatedUser = await User.findByIdAndUpdate({ _id: user._id }, { $set: body }, { new: true, runValidators: true });

        return res.status(200).json({
            status: true,
            message: 'User Updated!',
            data: updatedUser
        });

    } catch (error) {
        res.json({
            status: false,
            message: "Unexpected Error Occured!",
            trace: error.message
        })
    }
}

// Update Profile Picture
const updateProfilePicture = async (req, res) => {
    try {
        let profilePicture = req.files?.profilePicture;

        if (!profilePicture) {
            return res.status(400).json({
                status: false,
                message: "Please add profile picture!"
            });
        }

        let fileName = `public/profiles/${Date.now()}-${profilePicture.name.replace(/ /g, '-').toLowerCase()}`;
        await profilePicture.mv(fileName);

        profilePicture = fileName.replace("public", "");
        const updateUser = await User.findByIdAndUpdate(req.user._id, { $set: { profile: profilePicture } }, { new: true });

        return res.status(200).json({
            status: true,
            message: "Profile Picture Updated!",
            data: updateUser
        });
    } catch (error) {
        return res.status(422).json({
            status: false,
            message: "Unexpected Error Occured!",
            trace: error.message
        });
    }
}

// Send Request
const sendRequest = async (req, res) => {
    try {
        const { id } = req.body;
        const user = req.user;

        await User.findByIdAndUpdate({ _id: id }, {
            $push: {
                pendingRequests: { _id: user._id }
            }
        }, { new: true });

        await User.findByIdAndUpdate({ _id: user._id }, {
            $push: {
                sendRequests: { _id: new ObjectId(id) }
            }
        }, { new: true });

        let loggedUser = await User.findOne({ _id: user._id });

        return res.status(200).json({
            status: true,
            message: "Request Sent!",
            data: loggedUser
        });

    } catch (error) {
        return res.status(422).json({
            status: false,
            message: "Unexpected Error Occured! while sending request",
            trace: error.message
        });
    }
}

// Responce request 
const responceRequest = async (req, res) => {
    const { id, status } = req.body;  // request sender
    const user = req.user;

    try {
        if (status === 1) { //Accepting Request
            //  check user available in the list or not
            const result = checkAvailable(id, user.pendingRequests);
            if (!result) {
                return res.status(404).json({
                    status: false,
                    message: "User is not Available!"
                });
            }

            // adding user in the request sender friend list and deleting user from sender request list from request sender
            await User.updateOne(
                { _id: id },
                {
                    $push: { friends: { _id: user._id } },
                    $pull: { sendRequests: { _id: user._id } }
                }
            );

            // adding requset sender into the friend list of user and remove sender request from pending request list 
            await User.updateOne(
                { _id: user._id },
                {
                    $push: { friends: { _id: new ObjectId(id) } },
                    $pull: { pendingRequests: { _id: new ObjectId(id) } }
                }
            );

            return res.status(200).json({
                status: true,
                message: "Operation is successfull, request has been accepted",
            });

        } else { // Rejecting friend request

            //  check user available in the list or not
            const result = checkAvailable(id, user.pendingRequests);
            if (!result) {
                return res.status(404).json({
                    status: false,
                    message: "User is not Available!"
                });
            }

            // deleting send request from sender request list of request sender  
            await User.updateOne(
                { _id: id },
                {
                    $pull: { sendRequests: { _id: user._id } }
                }
            );

            // delete request from user pending request list
            await User.updateOne(
                { _id: user._id },
                { $pull: { pendingRequests: { _id: new ObjectId(id) } } }
            );

            res.json({ status: true, message: "Operation is successfull, request has been declined" });
        }

    } catch (error) {
        return res.status(422).json({
            status: false,
            message: "Unexpected Error Occured!",
            trace: error.message
        });
    }


}

// Block User
const blockUser = async (req, res) => {
    const user = req.user;
    const { id } = req.body;

    const result = checkLists(id, user.friends, user.pendingRequests, user.sendRequests);

    try {
        if (result.friend) {
            await User.updateOne(
                { _id: user._id },
                {
                    $pull: { friends: { _id: new ObjectId(id) } },
                    $push: { blockList: { _id: new ObjectId(id) } },
                }
            );
            await User.updateOne(
                { _id: id },
                {
                    $pull: { friends: { _id: user._id } },
                }
            );
        }
        else if (result.pendingRequest) {
            await User.updateOne(
                { _id: user._id },
                {
                    $pull: { pendingRequests: { _id: new ObjectId(id) } },
                    $push: { blockList: { _id: new ObjectId(id) } },
                }
            );
            await User.updateOne(
                { _id: id },
                {
                    $pull: { sendRequests: { _id: user._id } },
                }
            );
        }
        else {
            await User.updateOne(
                { _id: user._id },
                {
                    $pull: { sendRequests: { _id: new ObjectId(id) } },
                    $push: { blockList: { _id: new ObjectId(id) } }
                }
            );
            await User.updateOne(
                { _id: id },
                {
                    $pull: { pendingRequests: { _id: user._id } },
                }
            );
        }

        return res.json({ status: true, message: "Operation is successfull, user is blocked" });
    } catch (error) {
        return res.status(422).json({
            status: false,
            message: "Unexpected Error Occured! while blocking user",
            trace: error.message
        });
    }
}

// See Friend List
const friendsList = async (req, res) => {
    const { friends } = req.user;
    if (friends.length) {
        try {
            const ids = friends.map(friend => ObjectId(friend._id));
            const data = await User.find({ _id: { $in: ids } }, { userName: 1, profile: 1 });

            return res.status(200).json({
                status: true,
                message: "Operation successfull",
                trace: data
            });

        } catch (error) {
            return res.status(422).json({
                status: false,
                message: "Unexpected Error Occured! while fetching friend list",
                trace: error.message
            });
        }
    } else {
        return res.status(200).json({
            status: true,
            message: "No friends",
            trace: []
        });
    }
}

// See Pending Request List
const pendingRequestList = async (req, res) => {
    const { pendingRequests } = req.user;
    if (pendingRequests.length) {
        try {
            const ids = pendingRequests.map(pendingRequest => ObjectId(pendingRequest._id));
            const data = await User.find({ _id: { $in: ids } }, { userName: 1, profile: 1 });

            return res.status(200).json({
                status: true,
                message: "Operation successfull",
                trace: data
            });

        } catch (error) {
            return res.status(422).json({
                status: false,
                message: "Unexpected Error Occured! while fetching pending request list",
                trace: error.message
            });
        }
    } else {
        return res.status(200).json({
            status: true,
            message: "No friends",
            trace: []
        });
    }
}

// See Block List
const blockList = async (req, res) => {
    const { blockList } = req.user;
    if (blockList.length) {
        try {
            const ids = blockList.map(user => ObjectId(user._id));
            const data = await User.find({ _id: { $in: ids } }, { userName: 1, profile: 1 });

            return res.status(200).json({
                status: true,
                message: "Operation successfull",
                trace: data
            });

        } catch (error) {
            return res.status(422).json({
                status: false,
                message: "Unexpected Error Occured! while fetching block list",
                trace: error.message
            });
        }
    } else {
        return res.status(200).json({
            status: true,
            message: "No User",
            trace: []
        });
    }
}

const unfriend = async (req, res) => {
    const { id } = req.body; // End Person
    const user = req.user;

    //  check user available in the list or not
    const result = checkAvailable(id, user.friends);
    if (!result) {
        return res.status(404).json({
            status: false,
            message: "User is not Available!"
        });
    }

    try {
        // removing end person from user friends list
        await User.updateOne(
            { _id: user._id },
            {
                $pull: { friends: { _id: new ObjectId(id) } },
            }
        );

        // removing user from end person friends list
        await User.findByIdAndUpdate(
            { _id: id },
            {
                $pull: { friends: { _id: user._id } },
            }
        );

        return res.status(200).json({
            status: true,
            message: "Operation successfull user is unfriended",
        });
    } catch (error) {
        return res.status(422).json({
            status: false,
            message: "Unexpected Error Occured!",
            trace: error.message
        });
    }
}

const unblock = async (req, res) => {
    const { id } = req.body; // end person
    const user = req.user;

    //  check user available in the list or not
    const result = checkAvailable(id, user.blockList);

    if (!result) {
        return res.status(404).json({
            status: false,
            message: "User is not Available!"
        });
    }

    try {
        // removing end person from user block list
        await User.updateOne(
            { _id: user._id },
            {
                $pull: { blockList: { _id: new ObjectId(id) } },
            }
        );

        return res.status(200).json({
            status: true,
            message: "Operation successfull user is unblocked"
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
    getUser,
    registerUser,
    login,
    updateUser,
    updateProfilePicture,
    suggestUsers,
    sendRequest,
    responceRequest,
    blockUser,
    friendsList,
    pendingRequestList,
    blockList,
    unfriend,
    unblock
}