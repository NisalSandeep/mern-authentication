import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

import { generateVerificationToken } from "../utils/generateVerificationToken.js";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { sendVerificationEmail } from "../utils/emails.js";


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

export const login = async (req, res) => {};

export const logout = async (req, res) => {};
