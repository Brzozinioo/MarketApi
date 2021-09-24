const mongose = require("mongoose");
const jwt = require("jsonwebtoken");
const config = require("config");
const bcrypt = require("bcrypt");
const auth = require("../middleware/auth");
const admin = require("../middleware/admin");
const _ = require("lodash");
const express = require("express");
const { restoreCode } = require("../models/restoreCode");
const { monitorHistory } = require("../models/monitorHistory");
const { Monitor } = require("../models/monitor");
const restorePasswordMail = require("../lib/emailTemplates/restorePassword");
const router = express.Router();
const mail = require("../lib/mailer");
const socket = require("../index");
const { User } = require("../models/user");

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.send(user);
});

router.get("/userlist", auth, admin, async (req, res) => {
  const users = await User.find();
  const monitors = await Monitor.find();
  const responseMessage = [
    { users: users, monitors: monitors, active: socket.usersArray },
  ];
  res.send(responseMessage);
});

router.post("/changedata", auth, async (req, res) => {
  const { email, oldPassword, newPassword, phone } = req.body;
  const user = await User.findOne({ email: req.user.email });
  const isUser = await User.findOne({ email: email });
  if (email || (oldPassword && newPassword) || phone) {
    if (email) {
      if (isUser)
        return res.status(400).send({
          message: "Istnieje już konto z podanym adresem email",
          messageType: "error",
        });
      user.email = email;
    }
    if (oldPassword && newPassword) {
      const validPassword = await bcrypt.compare(oldPassword, user.password);
      if (validPassword) {
        const salt = await bcrypt.genSalt(10);
        const pass = await bcrypt.hash(newPassword, salt);
        user.password = pass;
      } else {
        return res
          .status(403)
          .send({ message: "Stare Hasło jest błędne", messageType: "error" });
      }
    }
    if (phone) {
      if (user.phone == "+48" + phone)
        return res.status(400).send({
          message: "Wprowadziłeś ten sam numer telefonu",
          messageType: "error",
        });
      user.phone = "+48" + phone;
    }
    await user.save();
    const token = user.generateAuthToken();
    res.status(200).send({
      token: token,
      message: "Pomyślnie zmieniono Dane",
      messageType: "success",
    });
  } else {
    res.status(400).send({
      message: "Brak wymaganych danych do zmiany",
      messageType: "error",
    });
  }
});

router.post("/restore", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (user) {
    const code = await restoreCode.findOne({ userid: user._id });
    if (!code) {
      let time = new Date(Date.now() + 3600 * 1000);
      let code = new restoreCode({
        userid: user._id,
        code: user.password,
        expiredTime: time,
      });
      await code.save();

      var mailOptions = {
        from: process.env.EMAIL_LOGIN,
        to: user.email,
        subject: "Przywracanie Hasła Do Konta",
        html: restorePasswordMail(
          user.name.replace(/ .*/, ""),
          process.env.WEBSITE_URL + "/recovery?code=" + code.code,
          code.code
        ),
      };
      await mail.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log("Wysłano email: " + info.response);
        }
      });

      res.status(200).send({
        message: "Wysłano email do przywrócenia konta",
        messageType: "success",
      });
    } else {
      res.status(402).send({
        message: "Nie można wygenerować nowego kodu przywracania",
        messageType: "warning",
      });
    }
  } else {
    res.status(403).send({
      message: "Nie istnieje konto przypisane do tego adresu email",
      messageType: "error",
    });
  }
});

router.post("/resetpassword", async (req, res) => {
  const { code, password } = req.body;
  const originalCode = await restoreCode.findOne({ code: code });
  if (originalCode) {
    const salt = await bcrypt.genSalt(10);
    const newPassword = await bcrypt.hash(password, salt);
    const user = await User.findById(originalCode.userid);
    user.password = newPassword;
    await user.save();
    await originalCode.remove();
    res
      .status(200)
      .send({ message: "Hasło zostało zmienione", messageType: "success" });
  } else {
    res
      .status(400)
      .send({ message: "Błędny kod do restartu hasła", messageType: "error" });
  }
});

router.post("/register", async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (user)
    return res.status(409).send({
      message: "Urzytkownik jest już zarejestrowany",
      messageType: "error",
    });

  user = new User(_.pick(req.body, ["name", "email", "password", "phone"]));
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
  await user.save();

  const token = user.generateAuthToken();
  res.status(201).header("x-auth-token", token).send({
    token: token,
    message: "Zarejestrowano Użytkownika",
    messageType: "success",
  });
});

router.delete("/", auth, async (req, res) => {
  const user = await User.findOne({ email: req.user.email });
  await user.delete();
  res
    .status(200)
    .send({ message: "Pomyślnie usunięto konto", messageType: "success" });
});

router.get("/dashboard", auth, async (req, res) => {
  const messages = await monitorHistory.find({ userid: req.user._id });
  let messageCounter = 0;
  let offersCounter = 0;
  if (messages)
    messages.map((value, index) => {
      if (value.isSended == false) messageCounter++;
      value.auctions.forEach((element) => {
        offersCounter++;
      });
    });
  let monitorsCounter = 0;
  const monitors = await Monitor.find({ userid: req.user._id });
  if (monitors)
    monitors.map((value, index) => {
      if (value.monitorStatus == true) monitorsCounter++;
    });
  res.status(200).send({
    message: messageCounter,
    monitors: monitorsCounter,
    offers: offersCounter,
    history: messages,
  });
});

router.delete("/user", auth, admin, async (req, res) => {
  console.log(req.body);
  const user = await User.findById(req.body.userid);
  await user.delete();
  res.status(200).send({
    message: "Pomyślnie usunięto użytkownika",
    messageType: "success",
  });
});

module.exports = router;
