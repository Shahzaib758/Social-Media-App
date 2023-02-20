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
    const { id } = req.body;

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

            console.log(result_1.isBlocked);
            console.log(result_2.isBlocked);

            if ((result_1.isBlocked) || (result_2.isBlocked)) {
                return res.status(400).json({ status: false, message: "User doesnot exit" })
            }

            return res.json({
                status: true, message: "Operation successfull", data: {
                    id: userdata._id,
                    username: userdata.username,
                    email: userdata.email,
                    phone: userdata.phone,
                    gender: userdata.gender,
                    profile: userdata.profile,
                    profession: userdata.profession,
                    live: userdata.live,
                    bio: userdata.bio,
                    skills: userdata.skills,
                }
            })
        }

    } catch (error) {
        return res.status(400).json({ status: false, message: "An error occured!", trace: error.message })
    }
}

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
            return res.json({ message: "Please use different Email/Number" });
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
        return res.status(201).json({ status: true, message: "User is successfully created" });
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
    const {
        username,
        gender,
        live,
        profile,
        bio,
        skills,
        profession,
    } = req.body

    const user = req.user;

    try {
        const updatedUser = await User.findByIdAndUpdate({ _id: user._id }, {
            $set: {
                username,
                gender,
                live,
                profile,
                bio,
                skills,
                profession,
            }
        }, { new: true, runValidators: true });

        return res.status(200).json({
            status: true,
            message: 'User Updated!',
            data: {
                id: updatedUser._id,
                username: updatedUser.username,
                email: updatedUser.email,
                phone: updatedUser.phone,
                gender: updatedUser.gender,
                profile: updatedUser.profile,
                profession: updatedUser.profession
            }
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
        const updateUser = await User.findByIdAndUpdate(req.user._id, { $set: { profilePicture } }, { new: true });

        return res.status(200).json({
            status: true,
            message: "Profile Picture Updated!",
            data, updateUser
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

    console.log(user);

    const result = checkLists(id, user.friends, user.pendingRequests, user.sendRequests);

    console.log(result);


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



// See All Pending request  using db.getCollection('feed').find({"_id" : {"$in" : [ObjectId("55880c251df42d0466919268"), ObjectId("55bf528e69b70ae79be35006")]}});
// https://stackoverflow.com/questions/32264225/how-to-get-multiple-document-using-array-of-mongodb-id


module.exports = {
    getUser,
    registerUser,
    login,
    updateUser,
    updateProfilePicture,
    sendRequest,
    responceRequest,
    blockUser,
    friendsList,
    blockList,
    unfriend,
    unblock
}