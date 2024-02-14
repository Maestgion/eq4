import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import cloudinaryUpload from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshTokens = refreshToken;

        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(
            500,
            "error occured while generating access and refresh tokens"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // getting user details
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res

    const { fullName, username, email, password } = req.body;

    // console.log(email);

    // if(fullName === ""){
    //     throw new ApiError(400, "fullname is required")
    // }

    if (
        [fullName, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    // console.log("ex user====> ", existedUser)

    if (existedUser) {
        throw new ApiError(
            409,
            "User with same username or email already exists"
        );
    }
    const avatarLocalPath = await req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // console.log("====File Path====", avatarLocalPath)

    const avatar = await cloudinaryUpload(avatarLocalPath);

    const coverImage = await cloudinaryUpload(coverImageLocalPath);

    //    console.log(avatar)

    if (!avatar) {
        throw new ApiError(404, "Avatar is required");
    }

    const user = await User.create({
        fullName,
        username,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        password,
    });

    // await user.save();
    // don't need this it will automatically do it

    //    to tackle the error at the time of db connection

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    if (!createdUser) {
        throw new ApiError(
            500,
            "Something went wrong while registering the user"
        );
    }

    return res
        .status(201)
        .json(
            new ApiResponse(200, createdUser, "user registerd successfully!")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    // get user details
    // validation: empty or not
    //  check if user exists in the database
    // comparing password  with hashed password from the database
    // create and provide both access and refresh token
    //  send cookie

    const { email, username, password } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "All field are required");
    }

    // console.table([email, username, password])

    const user = await User.findOne({
        $or: [{ email }, { username }],
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    // do not access with capital 'U', it's a mongoose object talking about doc methods here

    const isPasswordValid = await user.isPasswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user password");
    }

    const { refreshToken, accessToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    // updating the user because here it's still empty as the token method is called later

    // can also update that particular field also

    const loggedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user: loggedUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );

    // ye achhi practice nahi hai user ko tokens ko bhejna but, bas ek corner case cover karne ke liye hi if user wants to set it in localstorage by himself

    // set in the cookie
});

const logoutUser = asyncHandler(async (req, res) => {
    // clear this cookie
    // reset the refreshToken

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshTokens: undefined,
            },
        },
        {
            new: true,
        }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // firstly, use the cookies to access the refreshToken
    // verify token
    // get the decoded token
    // use the id in the payload to access the user
    // match the tokens

    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    // accessing from body if someone is using mobile app

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    // now we are sending an error as a response instead of sending the ususal response because, here app is not working and it's needed to send an error response to avoid sending the fake 200 response

    try {
        // verify
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );

        const user = await User.findById(decodedToken?._id);

        if (!user) {
            throw new ApiError(401, "unauthorized request");
        }

        if (incomingRefreshToken !== user?.refreshTokens) {
            throw new ApiError(401, "refresh token is expired or used");
        }

        const options = {
            httpOnly: true,
            secure: true,
        };

        // options ko global bhi rakh sakte hai kafi baar use ho raha hai

        const { accessToken, newRefreshToken } =
            await generateAccessAndRefreshTokens(user._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    {
                        accessToken,
                        refreshToken: newRefreshToken,
                    },
                    "token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(
            401,
            error?.message || "something went wrong while refreshing the tokens"
        );
    }
});

const changePassword = asyncHandler(async (req, res) => {
    // verification to middleware se ho jayega
    // take the fields required
    // grab the user details
    // find the User in the db

    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user?._id);

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordValid) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, "Password changed Successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    // grab the user info from the user stored in the token
    // send it back as a response

    return res
        .status(200)
        .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    // decide on which details to take as per the modifications allowed to the user
    // validation
    // find the user
    // look for the changes
    // save the changes in the database
    // send the response

    // file update ka alag endpoint as vahi use fatafat image change ka option deke db me update kara denge instead of updating it here and slowing down the process as text data bhi jata hai phir

    const { username, fullName, email } = req.body;

    // yaha par sabko hi validate kar lete hai ab kya selective change ho raha vo info bhejne ke liye frontend hai na

    if (!username || !fullName || !email) {
        throw new ApiError(400, "Please provide all fields");
    }

    const updatedUser = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                username,
                fullName,
                email,
            },
        },
        {
            new: true,
        }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedUser,
                "account details updated successfully"
            )
        );
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // get file from the req
    // upload on the cloudinary
    // update the db

    // TODO: DELETE OLD IMAGE

    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "No image provided");
    }

    const avatar = await cloudinaryUpload(avatarLocalPath);

    if (!avatar.url) {
        throw new ApiError(500, "Server Error : Failed to upload Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar?.url,
            },
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(200, user, "avatar updated successfully");
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // TODO: DELETE COVER IMAGE
    const coverImagaeLocalPath = req.file?.path;

    if (!coverImagaeLocalPath) {
        throw new ApiError(400, "No image provided");
    }

    const coverImagae = await cloudinaryUpload(avatarLocalPath);

    if (!coverImagae.url) {
        throw new ApiError(500, "Server Error : Failed to upload Image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImagae: coverImagae?.url,
            },
        },
        { new: true }
    ).select("-password -refreshToken");

    return res.status(200).json(200, user, "cover image updated successfully");
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // get username from params
    // aggregations: match, lookup for subscribers, lookup for subscriptions, sum
    // adding the fields including isSubscribed
    // then finally project

    const { username } = req.params;

    if (!username?.trim()) {
        throw new ApiError(400, "Username is required");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(),
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers",
            },
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscriptions",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers",
                },
                subscriptionsCount: {
                    $size: "$subsctiptions",
                },
                isSubscribed: {
                    $cond: {
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"]
                        },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                subscriptionsCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);

    console.log(channel);

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exist");
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res)=>{
    
    // const userId = req.user._id
    // now this only gives the string not the mongodb object id. It's mongoose who converts into the mongodb object id. 
    // But when we are using pipelines, the entire code executes directly into the mongodb server.Thus, we can't use req.user._id directly as it's only a string not a mongodb object id.
    // therefore we need to convert it and we'll use mongoose for this conversion

    // sub-pipeline is being used here for the nested approach

    const user = await User.aggregate(
        {
            $match :{
                _id: new mongoose.Types.ObjectId(req.user._id)
            },
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project:{
                                        fullName:1,
                                        username: 1,
                                        avatar: 1
                                    } 
                                }
                            ]
                        }
                    }, 
                    {
                        $addFields:{
                            owner:{
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    )

        return res(200).status(200).json(
            new ApiResponse(200, 
                user[0].watchHistory, "watch history fetched successfully")
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
