// here we will verify the access and refresh tokens and will check the authenticated user
// if correct, then we will add the user to the req object

import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyToken = asyncHandler(async (req, res, next) => {
    try{
            // optional chaining isliye kari hai qki ho sakta hai cookies set na ho mobile apps me set nahi hoti, to phir custom headers ko bhi check kar lenge
    const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

if (!token) {
    throw new ApiError(401, "Not authorized / no token provided");
}

// token ke andar payload bhi to hai to usko decode bhi karna padega access karne ke liye qki ham user ko set karna chahte hai req object me

const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

const user = await User.findById(decodedToken?._id).select("-password -refreshToken")


if(!user)
{   
    // TODO: discuss about frontend
    throw new ApiError(401, "Not Authorized/ invalid token provided ");
}

req.user = user
next();
    }catch(error)
    {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
});
