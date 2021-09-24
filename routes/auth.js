const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Joi = require("joi");
const _ = require("lodash");
const { User } = require("../models/user");
const express = require("express");
const { restoreCode } = require("../models/restoreCode");
const router = express.Router();

router.post("/", async (req, res) => {
  let user = await User.findOne({ email: req.body.email });
  if (!user)
    return res
      .status(400)
      .send({ message: "Niepoprawny email/hasło", messageType: "error" });

  const validPassword = await bcrypt.compare(req.body.password, user.password);
  if (!validPassword)
    return res
      .status(400)
      .send({ message: "Niepoprawny email/hasło", messageType: "error" });

  const token = user.generateAuthToken();
  res.status(200).header("x-auth-token", token).send({
    token: token,
    message: "Zalogowano Użytkownika",
    messageType: "success",
  });
});

router.post("/code", async (req, res) => {
  let code = req.body.code;
  console.log(code);
  let isValid = await restoreCode.findOne({ code: code });
  if (isValid) {
    res
      .status(200)
      .send({ message: "Kod jest prawidłowy", messageType: "success" });
  } else {
    res
      .status(403)
      .send({ message: "Błędny kod autoryzacyjny", messageType: "error" });
  }
});

module.exports = router;
