const { default: Axios } = require("axios");
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

const ebayToken = mongoose.model("ebayToken", tokenSchema);

async function requestToken(code) {
  console.log(process.env.EBAY_BASE);
  const options = {
    headers: {
      Authorization: "Basic " + process.env.EBAY_BASE,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  };
  let response = Axios.post(
    process.env.EBAY_BASE_URL +
      "/identity/v1/oauth2/token?grant_type=authorization_code&code=" +
      code +
      "&redirect_uri=Krystian_Brzoza-Krystian-Market-vthlpzc",

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
    headers: { Authorization: "Basic " + process.env.EBAY_BASE },
  };
  let response = Axios.post(
    process.env.EBAY_URL +
      "/identity/v1/oauth2/token?grant_type=refresh_token&refresh_token=" +
      token +
      "&scope=" +
      process.env.EBAY_SCOPE,
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
  let token = await ebayToken.findOne({ userid: userid });
  let date1 = new Date(token.expiredTime);
  let date2 = new Date(Date.now());

  if (date1.getTime() <= date2.getTime()) {
    let ebayResponse = await renewToken(token.refresh_token);
    if (ebayResponse.error) {
      return { message: "Error in renewToken", messageType: "error" };
    } else {
      let time = new Date(Date.now() + ebayResponse.data.expires_in * 1000);
      token.token = ebayResponse.data.access_token;
      token.expiredTime = time;
      await token.save();
      return token;
    }
  }
  return token;
}

async function getUserData(userid) {
  const token = await ebayToken.findById({ userid: userid });
  if (token) return true;
  else return false;
}

exports.ebayToken = ebayToken;
exports.requestToken = requestToken;
exports.renewToken = renewToken;
exports.getUserData = getUserData;
exports.getUserToken = getUserToken;
