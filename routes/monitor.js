const auth = require("../middleware/auth");
const { Monitor } = require("../models/monitor");
const express = require("express");
const router = express.Router();
const agenda = require("../lib/agenda");

var ObjectID = require("agenda/node_modules/mongodb").ObjectID;
const { monitorHistory } = require("../models/monitorHistory");

router.post("/", auth, async (req, res) => {
  const {
    monitorName,
    monitorType,
    monitorKeyWords,
    monitorUsername,
    monitorAllegro,
    monitorEBay,
    kategoriaAllegro,
    kategoriaEBay,
    monitorKwotaMin,
    monitorKwotaMax,
    monitorTimeHours,
    monitorTimeMinutes,
    monitorMoneyChecked,
    monitorNotifications,
  } = req.body;

  try {
    const newMonitor = await new Monitor({
      userid: req.user._id,
      monitorStatus: true,
      monitorName: monitorName,
      monitorType: monitorType,
      monitorKeyWords: monitorKeyWords,
      monitorUsername: monitorUsername,
      monitorAllegro: monitorAllegro,
      monitorEBay: monitorEBay,
      kategoriaAllegro: kategoriaAllegro,
      kategoriaEBay: kategoriaEBay,
      monitorKwotaMin: monitorKwotaMin,
      monitorKwotaMax: monitorKwotaMax,
      monitorMoneyChecked: monitorMoneyChecked,
      monitorTimeHours: monitorTimeHours,
      monitorTimeMinutes: monitorTimeMinutes,
      monitorNotifications: monitorNotifications,
      jobID: 0,
    });

    await newMonitor.save();
    if (newMonitor.monitorType == 1) {
      const job = await agenda
        .create("addAllegroKeywordMonitor", {
          monitorID: newMonitor._id,
          userID: req.user._id,
        })
        .repeatEvery("*/" + monitorTimeMinutes + " * * * *");
      await job.save();
      newMonitor.jobID = job.attrs._id;
      await newMonitor.save();
    }
    if (newMonitor.monitorType == 2) {
      const job = await agenda
        .create("addAllegroUserMonitor", {
          monitorID: newMonitor._id,
          userID: req.user._id,
        })
        .repeatEvery("*/" + monitorTimeMinutes + " * * * *");
      await job.save();
      newMonitor.jobID = job.attrs._id;
      await newMonitor.save();
    }

    res
      .status(200)
      .send({ message: "Pomyślnie dodano Monitor", messageType: "success" });
  } catch (exception) {
    res.status(400).send(exception);
  }
});

router.get("/", auth, async (req, res) => {
  const { monitor } = req.query;
  if (!monitor) {
    const monitors = await Monitor.find({ userid: req.user._id });
    if (monitors) {
      res.status(200).send({ monitors: monitors });
    } else {
      res.status(403).send("NOT FOUND");
    }
  } else {
    const monitorX = await Monitor.findById(monitor);
    if (monitorX) {
      res.status(200).send(monitorX);
    } else {
      res.status(403).send("NOT FOUND");
    }
  }
});

router.delete("/", auth, async (req, res) => {
  const monitor = await Monitor.findById(req.body.monitorID);
  if (monitor) {
    if (monitor.monitorStatus) {
      agenda.cancel(
        { _id: ObjectID(monitor.jobID) },
        (err, num) => console.log(err, num) // output: null 1
      );
    }
    await monitor.delete();
    const monitors = await Monitor.find({ userid: req.user._id });
    return res.status(200).send({
      message: "Pomyślnie usunięto",
      messageType: "success",
      monitors: monitors,
    });
  } else {
    res
      .status(403)
      .send({ message: "Taki monitor nie istnieje", messageType: "error" });
  }
});

router.post("/edit", auth, async (req, res) => {
  try {
    let job;
    const {
      _id,
      userid,
      monitorName,
      monitorType,
      monitorKeyWords,
      monitorUsername,
      monitorAllegro,
      monitorEBay,
      kategoriaAllegro,
      kategoriaEBay,
      monitorKwotaMin,
      monitorKwotaMax,
      monitorTimeHours,
      monitorTimeMinutes,
      monitorMoneyChecked,
    } = req.body;

    const monitor = await Monitor.findById(_id);

    if (monitor) {
      if (monitor.jobID)
        agenda.cancel(
          { _id: ObjectID(monitor.jobID) },
          (err, num) => console.log(err, num) // output: null 1
        );
      monitor.monitorName = monitorName;
      monitor.monitorType = monitorType;
      monitor.monitorKeyWords = monitorKeyWords;
      monitor.monitorUsername = monitorUsername;
      monitor.monitorAllegro = monitorAllegro;
      monitor.monitorEBay = monitorEBay;
      monitor.kategoriaAllegro = kategoriaAllegro;
      monitor.kategoriaEBay = kategoriaEBay;
      monitor.monitorKwotaMin = monitorKwotaMin;
      monitor.monitorKwotaMax = monitorKwotaMax;
      monitor.monitorTimeHours = monitorTimeHours;
      monitor.monitorTimeMinutes = monitorTimeMinutes;
      monitor.monitorMoneyChecked = monitorMoneyChecked;

      if (monitor.monitorStatus) {
        if (monitor.monitorType == 1) {
          job = await agenda
            .create("addAllegroKeywordMonitor", {
              monitorID: monitor._id,
              userID: req.user._id,
            })
            .repeatEvery("*/" + monitor.monitorTimeMinutes + " * * * *");
        }
        if (monitor.monitorType == 2) {
          job = await agenda
            .create("addAllegroUserMonitor", {
              monitorID: monitor._id,
              userID: req.user._id,
            })
            .repeatEvery("*/" + monitor.monitorTimeMinutes + " * * * *");
        }
        await job.save();
        monitor.jobID = job.attrs._id;
      }
      await monitor.save();

      res
        .status(200)
        .send({ message: "Zapisano Zmiany", messageType: "success" });
    }
  } catch (exception) {
    console.log(exception);
    res.status(400).send(exception);
  }
});

router.post("/status", auth, async (req, res) => {
  let job;

  const monitor = await Monitor.findById(req.body.monitorID);
  if (req.user.isAdmin) {
    req.user._id = monitor.userid;
  }
  if (monitor) {
    if (monitor.monitorStatus) {
      agenda.cancel(
        { _id: ObjectID(monitor.jobID) },
        (err, num) => console.log(err, num) // output: null 1
      );
      monitor.jobID = "";
      monitor.monitorResults = [];
    } else {
      if (monitor.monitorType == 1) {
        job = await agenda
          .create("addAllegroKeywordMonitor", {
            monitorID: monitor._id,
            userID: req.user._id,
          })
          .repeatEvery("*/" + monitor.monitorTimeMinutes + " * * * *");
      }
      if (monitor.monitorType == 2) {
        job = await agenda
          .create("addAllegroUserMonitor", {
            monitorID: monitor._id,
            userID: req.user._id,
          })
          .repeatEvery("*/" + monitor.monitorTimeMinutes + " * * * *");
      }
      await job.save();
      monitor.jobID = job.attrs._id;
    }
    monitor.monitorStatus = !monitor.monitorStatus;
    await monitor.save();
    const monitors = await Monitor.find({ userid: req.user._id });
    if (monitors)
      return res.status(200).send({
        message: "Pomyślnie zmieniono status",
        messageType: "success",
        monitors: monitors,
      });
    else {
      return res
        .status(401)
        .send({ message: "Nieznany Błąd", messageType: "error" });
    }
  } else {
    return res
      .status(403)
      .send({ message: "Taki monitor nie istnieje", messageType: "error" });
  }
});

router.get("/history", auth, async (req, res) => {
  const history = await monitorHistory.find({ userid: req.user._id });
  const monitors = await Monitor.find({ userid: req.user._id });

  res.status(200).send({
    history: history,
    monitors: monitors,
  });
});
module.exports = router;
