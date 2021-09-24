const { boolean } = require("joi");
const Joi = require("joi");
const mongoose = require("mongoose");

const monitorSchema = new mongoose.Schema({
  userid: {
    type: String,
    required: false,
    minlength: 5,
    maxlength: 50,
    unique: false,
  },

  monitorStatus: {
    type: Boolean,
    required: true,
  },
  monitorName: {
    type: String,
    required: true,
    unique: false,
  },
  monitorType: {
    type: Number,
    required: true,
  },
  monitorKeyWords: {
    type: String,
  },
  monitorUsername: {
    type: String,
  },
  monitorAllegro: {
    type: Boolean,
  },
  monitorEBay: {
    type: Boolean,
  },
  kategoriaAllegro: {
    type: Array,
  },
  kategoriaEBay: {
    type: Array,
  },
  monitorKwotaMin: {
    type: Number,
  },
  monitorKwotaMax: {
    type: Number,
  },
  monitorMoneyChecked: {
    type: Boolean,
    required: true,
  },
  monitorTimeHours: {
    type: Number,
    required: true,
  },
  monitorTimeMinutes: {
    type: Number,
    required: true,
  },
  monitorAllegroResults: {
    type: Array,
    required: false,
    default: [],
  },
  monitorEbayResults: {
    type: Array,
    requred: false,
    default: [],
  },
  monitorNotifications: {
    type: Array,
    required: true,
    default: [],
  },
  monitorFirstRun: {
    type: Boolean,
    required: false,
    default: false,
  },
  jobID: {
    type: String,
    required: false,
    default: "",
  },
  createTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
});

const Monitor = mongoose.model("Monitor", monitorSchema);

exports.Monitor = Monitor;
