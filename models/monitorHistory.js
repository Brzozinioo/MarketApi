const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 50,
  },
  monitorid: {
    type: String,
    required: true,
  },
  auctions: {
    type: Array,
    required: true,
  },
  createTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  website: {
    type: String,
    required: true,
  },
  isSended: {
    type: Boolean,
    required: true,
    default: false,
  },
});

const monitorHistory = mongoose.model("monitorHistory", userSchema);
exports.monitorHistory = monitorHistory;
