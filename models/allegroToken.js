const { default: Axios } = require("axios");
const Joi = require("joi");
const mongoose = require("mongoose");

const tokenSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  token: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 2048,
  },
  refresh_token: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 2048,
  },
  expiredTime: {
    type: Date,
    required: true,
  },
});

const allegroToken = mongoose.model("allegroToken", tokenSchema);

function validateToken(allegroToken) {
  const schema = {
    userid: Joi.string().min(5).max(50).required(),
    token: Joi.string().min(5).max(2048).required(),
    refresh_token: Joi.string().min(5).max(2048).required(),
    expiredTime: Joi.date().required(),
  };
  return Joi.validate(allegroToken, schema);
}

async function requestToken(code) {
  console.log(
    process.env.ALLEGRO_URL +
      "/auth/oauth/token?grant_type=authorization_code&code=" +
      code +
      "&redirect_uri=" +
      process.env.WEBSITE_URL
  );
  const options = {
    headers: { Authorization: "Basic " + process.env.ALLEGRO_BASE },
  };
  let response = Axios.post(
    process.env.ALLEGRO_URL +
      "/auth/oauth/token?grant_type=authorization_code&code=" +
      code +
      "&redirect_uri=" +
      process.env.WEBSITE_URL +
      "/settings",
    {},
    options
  ).catch(function (error) {
    if (error.response) {
      console.log("ERROR token code", error.response.data);
      return error.response.data;
    } else if (error.request) {
      console.log(error.request);
      return error.request;
    } else {
      console.log("Error", error.message);
      return "Error" + error.message;
    }
  });
  console.log("REQUEST", response.data);
  return response;
}

async function renewToken(token) {
  const options = {
    headers: { Authorization: "Basic " + process.env.ALLEGRO_BASE },
  };
  let response = Axios.post(
    process.env.ALLEGRO_URL +
      "/auth/oauth/token?grant_type=refresh_token&refresh_token=" +
      token +
      "&redirect_uri=" +
      process.env.WEBSITE_URL +
      "/settings",
    {},
    options
  ).catch(function (error) {
    if (error.response) {
      console.log(error.response.data);
      return error.response.data;
    } else if (error.request) {
      console.log(error.request);
      return error.request;
    } else {
      console.log("Error", error.message);
      return "Error" + error.message;
    }
  });

  return response;
}

async function getUserToken(userid) {
  let token = await allegroToken.findOne({ userid: userid });
  let date1 = new Date(token.expiredTime);
  let date2 = new Date(Date.now());

  if (date1.getTime() <= date2.getTime()) {
    let allegroResponse = await renewToken(token.refresh_token);
    if (allegroResponse.error) {
      return { message: "Error in renewToken", messageType: "error" };
    } else {
      let time = new Date(Date.now() + allegroResponse.data.expires_in * 1000);
      token.token = allegroResponse.data.access_token;
      token.refresh_token = allegroResponse.data.refresh_token;
      token.expiredTime = time;
      await token.save();
      return token;
    }
  }
  return token;
}

async function getUserData(token) {
  const api = Axios.create({
    baseURL: process.env.ALLEGRO_BASE_URL,
    timeout: 10000,
    headers: {
      Accept: "application/vnd.allegro.public.v1+json",
      Authorization: "Bearer " + token,
    },
  });

  let user = await api.get("me", {}).catch(function (error) {
    if (error.response) {
      console.log(error.response.headers);
      return error.response.data;
    } else if (error.request) {
      console.log(error.request);
      return error.request;
    } else {
      console.log("Error", error.message);
      return "Error" + error.message;
    }
  });
  return user;
}

exports.allegroToken = allegroToken;
exports.validate = validateToken;
exports.requestToken = requestToken;
exports.renewToken = renewToken;
exports.getUserData = getUserData;
exports.getUserToken = getUserToken;
