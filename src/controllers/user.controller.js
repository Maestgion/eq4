import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import cloudinaryUpload from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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

    await user.save();

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

    if (!username || !email) {
        throw new ApiError(400, "All field are required");
    }

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
    
    const loggedUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true,

    } 

    return res.status(200).cookie("accessToken", accessToken, options).cookie("refreshToken", refreshToken, options).json(
        new ApiResponse(200,
            {
                user: loggedUser, accessToken, refreshToken
            },
            "User logged in successfully")
    )

    // ye achhi practice nahi hai user ko tokens ko bhejna but, bas ek corner case cover karne ke liye hi if user wants to set it in localstorage by himself

    // set in the cookie
});

const logoutUser = asyncHandler(async  (req, res) => {

    // clear this cookie
    // reset the refreshToken

   await User.findByIdAndUpdate(req.user._id, {
    $set: {
        refreshTokens: undefined
    }}, 
    {
        new: true
    }
   )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).clearCookie("accessToken", options).clearCookie("refreshToken", options).json(
        new ApiResponse(200, "User logged out successfully")
    )
} )

export { registerUser, loginUser, logoutUser };
