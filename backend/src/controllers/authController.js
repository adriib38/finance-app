const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { validateUserFields } = require("../utils/validators");

require("dotenv").config();

const signin = async (req, res) => {
  let { username, password } = req.body;

  if (!username | !password) {
    return res.status(400).json({
      message: "Username and password required.",
    });
  }

  username = username.toLowerCase().trim().replace(/\s+/g, "");

  const { valid, errors } = validateUserFields({ username, password });
  if (!valid) {
    return res.status(400).json({
      message: errors,
    });
  }

  User.getUserByUsername(username, async (err, results) => {
    if (err) {
      // Send the error if there was one
      return res
        .status(500)
        .json({ message: "Error getting user", error: err });
    }

    if (results == undefined) {
      return res.status(404).json({ message: "User not found" });
    }

    const correctPassword = await User.validatePassword(
      password,
      results.password
    );

    // If the password is valid
    if (correctPassword) {
      // Create a token inside the callback
      let token = jwt.sign({ id: results.uuid }, process.env.JWT_SECRET, {
        expiresIn: "1h",
      });

      res
        .cookie("access_token", token, {
          httpOnly: true, //Read cookie only in server (no js)
          secure: true,
          sameSite: "strict",
          maxAge: 1000 * 60 * 60,
        })
        .status(200)
        .json({ user: results });
    } else {
      res.status(401).json({ message: "Invalid password" });
    }
  });
};

const signout = async (req, res) => {
  // Set token to none and expire after 5 seconds
  res.cookie("access_token", "none", {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ message: "User logged out successfully" });
};

const getUserByUuid = async (req, res) => {
  let uuid = req.userUuid;
  User.getUserByUuid(uuid, async (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ message: "Error getting user", error: err });
    }

    if (results == undefined) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user: results });
  });
};

module.exports = {
  signin,
  signout,
  getUserByUuid,
};
