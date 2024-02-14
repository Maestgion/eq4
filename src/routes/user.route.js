import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: 'avatar',
            maxCount: 1
        },
        {
            name: 'coverImage',
            maxCount: 1
        }
    ]),
    registerUser
    )


router.route('/login').post(loginUser)

// secured routes

router.route('/logout').post(verifyToken, logoutUser)

router.route('/refresh-token').post(refreshAccessToken)

router.route('/change-password').post(verifyToken, changePassword)

router.route('/current-user').get(verifyToken, getCurrentUser)

router.route('/update-account').patch(verifyToken, updateAccountDetails)

router.route('/update-avatar').patch(verifyToken, upload.single('avatar'), updateUserAvatar)

router.route('/update-cover-image').patch(verifyToken, upload.single('avatar'), updateUserCoverImage)

router.route('/c/:username').get(verifyToken, getUserChannelProfile)

router.route('/history').get(verifyToken, getWatchHistory)

export default router;
