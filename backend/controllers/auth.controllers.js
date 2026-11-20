import bcrypt from "bcryptjs";
import crypto from "crypto";

import User from "../models/user.model.js";

import { generateVerificationToken } from "../utils/generateVerificationToken.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendVerificationEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail} from "../utils/emails.js";


const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signup = async (req, res) => {
    const { email, password, name } = req.body;

  try {
    if (!email || !password || !name) {
      return res.status(400).json({ message: "Name, email, password are required ! " });

    }

   const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(400).json({ message: "User already Exist !" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const verificationToken  = generateVerificationToken();

    const newUser = new User({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      varificationToken: verificationToken,
      varificationTokenExpiresAt: Date.now() + 24 * 60 * 60 * 1000, // Token expires in 24 hours
    });

    await newUser.save();

    // jwt
    generateTokenAndSetCookie(res, newUser._id);

    await sendVerificationEmail(newUser.email, verificationToken);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: { 
        ...newUser._doc,
        password: undefined, // Exclude password from the response
        varificationToken: undefined, // Exclude verification token from the response
        varificationTokenExpiresAt: undefined, // Exclude verification token expiration from the response
      },
    });

  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export const verifyEmail = async (req, res) => {
  const { code } = req.body;

  try {
    const user = await User.findOne({
      varificationToken: code,
      varificationTokenExpiresAt: { $gt: Date.now() },
    })

    if(!user) {
       return res.status(400).json({success: false, message: "Invalid or expired verification code" });
    }

    user.isVerified = true;
    user.varificationToken = undefined;
    user.varificationTokenExpiresAt = undefined;
    
    await user.save();

    await sendWelcomeEmail(user.email, user.name);


    res.status(200).json({ success: true, message: "Email verified successfully", user: {
      ...user._doc,
      password: undefined, // Exclude password from the response
      varificationToken: undefined, // Exclude verification token from the response
      varificationTokenExpiresAt: undefined, // Exclude verification token expiration from the response
    } });

  }catch (error) {
    console.error("Error verifying email:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}


export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    
     if (!email || !password) {
       return res.status(400).json({ message: "Email and password are required" });
     }

    const normalizedEmail = email.toLowerCase().trim();

    if (!emailRegex.test(normalizedEmail)) {
      return res
        .status(400)
        .json({ message: "Please provide a valid email address" });
    }


    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Please verify your email before logging in" });
    }


    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    generateTokenAndSetCookie(res, user._id);

    user.lastLogin = new Date();

    await user.save();

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      user: {
        ...user._doc,
        password: undefined, // Exclude password from the response
        varificationToken: undefined, // Exclude verification token from the response
        varificationTokenExpiresAt: undefined, // Exclude verification token expiration from the response
      },
    });

  
  }catch (error) {
    console.error("Error during login:", error);
    return res.status(500).json({ message: "Internal server error" });
  }

};

export const logout = async (req, res) => {
  res.clearCookie("token")
  res.status(200).json({ success: true, message: "Logged out successfully" })
};


export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }


    // Generate a reset token (you can use a library like crypto or uuid)
    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetTokenExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // Token expires in 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiresAt = resetTokenExpiresAt;

    await user.save();

    // send email 
    await sendPasswordResetEmail(user.email, `${process.env.CLIENT_URL}/reset-password/${resetToken}`);


    res.status(200).json({success: true, message: "Password reset email sent successfully" });


  }catch (error) {
    console.error("Error during forgot password:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    })

    if(!user) {
      return res.status(400).json({success: false, message: "Invalid or expired reset token" });
    }

    // update password
    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;


    await user.save();

    await sendResetSuccessEmail(user.email);


    res.status(200).json({ success: true, message: "Password reset successfully", user: {
      ...user._doc,
      password: undefined, // Exclude password from the response
      resetPasswordToken: undefined, // Exclude reset token from the response
      resetPasswordExpiresAt: undefined, // Exclude reset token expiration from the response
    } });



  }catch (error) {
    console.error("Error during password reset:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export const checkAuth = async (req, res) => {
    try {
      const user = await User.findById(req.userId).select("-password -varificationToken -varificationTokenExpiresAt -resetPasswordToken -resetPasswordExpiresAt");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.status(200).json({
        success: true,
        user
      });
    }catch (error) {
        console.error("Error during check auth:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}