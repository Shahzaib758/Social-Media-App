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
    try {
        const currentUser = req.user;

        let limit = parseInt(req.query.limit) || 10; // default to 10 results per page

        // Validate the limit parameter
        if (limit <= 0) {
            return res.status(400).json({ status: false, message: 'Invalid limit parameter. Must be a positive integer.' });
        }

        const page = parseInt(req.query.page) || 1; // default to the first page

        // Calculate the number of documents to skip based on the current page
        const skip = (page - 1) * limit;

        // Create a filter object for the MongoDB query
        const filter = {
            _id: { $ne: currentUser._id },
            friends: { $nin: [currentUser._id] },
            pendingRequests: { $nin: [currentUser._id] },
            sendRequests: { $nin: [currentUser._id] },
            blockList: { $nin: [currentUser._id] }
        };

        // Add additional filters based on query parameters
        if (req.query.minAge) {
            filter.age = { $gte: req.query.minAge };
        }

        if (req.query.maxAge) {
            if (!filter.age) {
                filter.age = {};
            }

            filter.age.$lte = req.query.maxAge;
        }

        if (req.query.profession) {
            filter.profession = req.query.profession;
        }

        if (req.query.username) {
            filter.username = { $regex: req.query.username, $options: 'i' };
        }

        if (req.query.gender) {
            filter.gender = req.query.gender;
        }

        if (req.query.location) {
            filter.location = { $regex: req.query.location, $options: 'i' };
        }

        // Query the database using the filter object, skipping the appropriate number of documents and limiting to the desired number of results
        const users = await User.find(filter)
            .skip(skip)
            .limit(limit);

        res.json({ status: true, message: "operation successful", data: users });
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
                pendingRequests: user._id
            }
        }, { new: true });

        await User.findByIdAndUpdate({ _id: user._id }, {
            $push: {
                sendRequests: new ObjectId(id)
            }
        }, { new: true });


        return res.status(200).json({
            status: true,
            message: "Operation successfull, request has been sended",
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
                    $push: { friends: user._id },
                    $pull: { sendRequests: user._id }
                }
            );

            // adding requset sender into the friend list of user and remove sender request from pending request list 
            await User.updateOne(
                { _id: user._id },
                {
                    $push: { friends: new ObjectId(id) },
                    $pull: { pendingRequests: new ObjectId(id) }
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
                    $pull: { sendRequests: user._id }
                }
            );

            // delete request from user pending request list
            await User.updateOne(
                { _id: user._id },
                { $pull: { pendingRequests: new ObjectId(id) } }
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
                    $pull: { friends: new ObjectId(id) },
                    $push: { blockList: new ObjectId(id) },
                }
            );
            await User.updateOne(
                { _id: id },
                {
                    $pull: { friends: user._id },
                }
            );
        }
        else if (result.pendingRequest) {
            await User.updateOne(
                { _id: user._id },
                {
                    $pull: { pendingRequests: new ObjectId(id) },
                    $push: { blockList: new ObjectId(id) },
                }
            );
            await User.updateOne(
                { _id: id },
                {
                    $pull: { sendRequests: user._id },
                }
            );
        }
        else {
            await User.updateOne(
                { _id: user._id },
                {
                    $pull: { sendRequests: new ObjectId(id) },
                    $push: { blockList: new ObjectId(id) }
                }
            );
            await User.updateOne(
                { _id: id },
                {
                    $pull: { pendingRequests: user._id },
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
    console.log(req.user)
    if (friends.length) {
        try {
            const ids = friends.map(friend => ObjectId(friend._id));
            console.log(ids)
            const data = await User.find({ _id: { $in: ids } }, { username: 1, profile: 1 });

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
            const data = await User.find({ _id: { $in: ids } }, { username: 1, profile: 1 });

            return res.status(200).json({
                status: true,
                message: "Operation successfull",
                data: data
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
            const data = await User.find({ _id: { $in: ids } }, { username: 1, profile: 1 });

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
                $pull: { friends: new ObjectId(id) },
            }
        );

        // removing user from end person friends list
        await User.findByIdAndUpdate(
            { _id: id },
            {
                $pull: { friends: user._id },
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
                $pull: { blockList: new ObjectId(id) },
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