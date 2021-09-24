const { default: Axios } = require("axios");
const Joi = require("joi");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  code: {
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

const restoreCode = mongoose.model("restoreCode", userSchema);

exports.restoreCode = restoreCode;
