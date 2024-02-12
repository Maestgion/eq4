import { Router } from "express";
import { loginUser, registerUser, logoutUser, refreshAccessToken, changePassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
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

router.route('/get-user').get(verifyToken, getCurrentUser)

router.route('/update-account').post(verifyToken, updateAccountDetails)

router.route('/update-avatar').post(verifyToken, upload.single('avatar'), updateUserAvatar)

router.route('/update-cover-image').post(verifyToken, upload.single('avatar'), updateUserCoverImage)


export default router;
