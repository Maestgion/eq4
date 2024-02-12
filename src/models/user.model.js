import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true, // for searching
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        fullName: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        avatar: {
            type: String, //cloudinary url
            required: true,
        },
        coverImage: {
            type: String,
        },
        watchHistory: {
            type: [
                {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Video",
                },
            ],
        },
        password: {
            type: String,
            required: [true, "Password is required"],
        },
        refreshTokens: {
            type: String,
        },
    },
    { timeseries: true }
);

userSchema.pre("save", async function(next){
    
    // console.log("save")
    if(!this.isModified("password")) return 


    this.password = await bcrypt.hash(this.password, 10)

    // console.log(this.password)

next()
});


userSchema.methods.isPasswordCorrect = async function(password)
{   
    // console.log("pass check")
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAccessToken = function()
{   
    return jwt.sign({
        _id: this._id,
        email: this.email,
        username: this.username,
        fullName: this.fullName
    }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
}

userSchema.methods.generateRefreshToken = function()
{   
   return jwt.sign({
        _id: this._id,
       
    }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRY
    })
}

export const User = mongoose.model("User", userSchema);
