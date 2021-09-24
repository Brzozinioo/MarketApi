require("dotenv").config();

var nodemailer = require("nodemailer");

const mail = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_LOGIN,
    pass: process.env.EMAIL_PASSWORD,
  },
});

module.exports = mail;
