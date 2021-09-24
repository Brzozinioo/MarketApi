const auth = require("../middleware/auth");
const _ = require("lodash");
const express = require("express");
const { default: Axios } = require("axios");
const {
  ebayToken,
  renewToken,
  requestToken,
  getUserData,
} = require("../models/ebayToken");
const ebayAuth = require("../middleware/ebayAuth");
const router = express.Router();

router.get("/token", auth, async (req, res) => {
  let token = await ebayToken.findOne({ userid: req.user._id });
  if (token) {
    let date1 = new Date(token.expiredTime);
    let date2 = new Date(Date.now());

    if (date1.getTime() <= date2.getTime()) {
      let ebayResponse = await renewToken(token.refresh_token);
      if (ebayResponse.error) {
        res.status(400).send(ebayResponse.error_description);
      } else {
        let time = new Date(Date.now() + ebayResponse.data.expires_in * 1000);
        token.token = ebayResponse.data.access_token;
        token.expiredTime = time;
        await token.save();
        return res.status(200).send(token.token);
      }
    } else {
      res.send(token.token);
    }
  } else {
    res.status(405).send("Nie zautoryzowano swojego konta EBay");
  }
});

router.post("/token", auth, async (req, res) => {
  let code = req.body.code;
  let ebayResponse = await requestToken(code);
  console.log(ebayResponse.data);
  if (ebayResponse.error) {
    res.status(400).send(ebayResponse.error_description);
  } else {
    let time = new Date(Date.now() + ebayResponse.data.expires_in * 1000);
    let token = new ebayToken({
      userid: req.user._id,
      token: ebayResponse.data.access_token,
      refresh_token: ebayResponse.data.refresh_token,
      expiredTime: time,
    });
    token.save();
    const user = await getUserData(token.token);
    res.status(200).send({
      message: "Powiązano swoje konto Ebay",
      messageType: "success",
      user: user,
    });
  }
});

router.delete("/token", auth, async (req, res) => {
  const token = await ebayToken.findOne({ userid: req.user._id });
  if (token) {
    await token.delete();
    res.status(200).send({
      message: "Pomyślnie usunięto powiązanie z Ebay",
      messageType: "success",
    });
  } else {
    res.status(402).send({
      message: "Nie posiadasz połączonego konta",
      messageType: "error",
    });
  }
});

router.get("/me", auth, ebayAuth, async (req, res) => {
  const user = await getUserData(req.user._id);
  res.status(200).send(user);
});

module.exports = router;
