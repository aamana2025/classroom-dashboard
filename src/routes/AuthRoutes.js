import express from 'express';
import { loginUser, getSignupStatus, createPendingUser, forgotPassword, resetPassword, getPendingUser, logoutUser, logedUser } from '../controllers/AuthControlles.js';

const router = express.Router();

router.post("/pending", createPendingUser); // create pending user before payment
router.get("/pending/:pendingId", getPendingUser); // get pendinguse for cancel redirct
router.get("/status/:id", getSignupStatus); // check signup status

router.post("/login", loginUser); // login user app flutter
router.post("/loged", logedUser); // login user app flutter
router.post("/logout", logoutUser); // logout user app flutter

router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;