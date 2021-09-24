const auth = require("../middleware/auth");
const _ = require("lodash");
const express = require("express");
const {
  allegroToken,
  requestToken,
  renewToken,
  getUserData,
} = require("../models/allegroToken");
const allegroAuth = require("../middleware/allegroAuth");
const { default: Axios } = require("axios");
const router = express.Router();

const findNode = (parentCategoryID, subCategoryData, wholeObject) => {
  for (var i = 0; i < wholeObject.length; i++) {
    if (wholeObject[i].value == parentCategoryID) {
      wholeObject[i].children = subCategoryData;
    } else {
      if (typeof wholeObject[i].children !== "undefined")
        findNode(parentCategoryID, subCategoryData, wholeObject[i].children);
    }
  }
};

router.get("/categories", auth, allegroAuth, async (req, res) => {
  const api = Axios.create({
    baseURL: process.env.ALLEGRO_BASE_URL,
    timeout: 10000,
    headers: {
      Accept: "application/vnd.allegro.public.v1+json",
      Authorization: "Bearer " + req.token,
    },
  });

  let kategorie = await api.get("sale/categories", {}).catch(function (error) {
    if (error.response) {
      console.log(error.response.headers);
      return res.send(error.response.data);
    } else if (error.request) {
      console.log(error.request);
      return res.send(error.request);
    } else {
      console.log("Error", error.message);
      return res.send("Error" + error.message);
    }
  });
  res.send(kategorie.data["categories"]);
});

router.post("/subcategories", auth, allegroAuth, async (req, res) => {
  const { categories, parentID } = req.body;
  const api = Axios.create({
    baseURL: process.env.ALLEGRO_BASE_URL,
    timeout: 10000,
    headers: {
      Accept: "application/vnd.allegro.public.v1+json",
      Authorization: "Bearer " + req.token,
    },
  });

  let kategorie = await api
    .get("sale/categories/?parent.id=" + parentID, {})
    .catch(function (error) {
      if (error.response) {
        console.log(error.response.headers);
        return res.send(error.response.data);
      } else if (error.request) {
        console.log(error.request);
        return res.send(error.request);
      } else {
        console.log("Error", error.message);
        return res.send("Error" + error.message);
      }
    });

  const insertCategories = [];
  kategorie.data["categories"].map((value, index) => {
    insertCategories.push({
      value: value.id,
      isLeaf: value.leaf,
      label: value.name,
    });
  });
  findNode(parentID, insertCategories, categories);
  res.send(categories);
});

router.get("/token", auth, async (req, res) => {
  let token = await allegroToken.findOne({ userid: req.user._id });
  if (token) {
    let date1 = new Date(token.expiredTime);
    let date2 = new Date(Date.now());

    if (date1.getTime() <= date2.getTime()) {
      let allegroResponse = await renewToken(token.refresh_token);
      if (allegroResponse.error) {
        res.status(400).send(allegroResponse.error_description);
      } else {
        let time = new Date(
          Date.now() + allegroResponse.data.expires_in * 1000
        );
        token.token = allegroResponse.data.access_token;
        token.refresh_token = allegroResponse.data.refresh_token;
        token.expiredTime = time;
        await token.save();
        return res.status(200).send(token.token);
      }
    } else {
      res.send(token.token);
    }
  } else {
    res.status(405).send("Nie zautoryzowano swojego konta Allegro");
  }
});

router.post("/token", auth, async (req, res) => {
  let code = req.body.code;
  let allegroResponse = await requestToken(code);
  console.log(allegroResponse.data);
  if (allegroResponse.error) {
    res.status(400).send(allegroResponse.error_description);
  } else {
    let time = new Date(Date.now() + allegroResponse.data.expires_in * 1000);
    let token = new allegroToken({
      userid: req.user._id,
      token: allegroResponse.data.access_token,
      refresh_token: allegroResponse.data.refresh_token,
      expiredTime: time,
    });
    token.save();
    const user = await getUserData(token.token);
    res.status(200).send({
      message: "Powiązano swoje konto Allegro",
      messageType: "success",
      user: user.data,
    });
  }
});

router.delete("/token", auth, async (req, res) => {
  const token = await allegroToken.findOne({ userid: req.user._id });
  if (token) {
    await token.delete();
    res.status(200).send({
      message: "Pomyślnie usunięto powiązanie z Allegro",
      messageType: "success",
    });
  } else {
    res.status(402).send({
      message: "Nie posiadasz połączonego konta",
      messageType: "error",
    });
  }
});

router.get("/me", auth, allegroAuth, async (req, res) => {
  const user = await getUserData(req.token);
  res.status(200).send(user.data);
});

module.exports = router;
