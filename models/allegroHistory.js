const config = require("config");
const jwt = require("jsonwebtoken");
const Joi = require("joi");
const mongoose = require("mongoose");

const allegroHistorySchema = new mongoose.Schema({
  auctionid: {
    type: String,
  },
  auctionName: {
    type: String,
  },
  userid: {
    type: String,
  },
  image: {
    type: String,
  },
});

const allegroHistory = mongoose.model("allegroHistory", allegroHistorySchema);

exports.allegroHistory = allegroHistory;
