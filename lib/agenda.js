require("dotenv").config();
const Agenda = require("agenda");

const agenda = new Agenda();
agenda.database(process.env.DB_HOST, "agenda", { useUnifiedTopology: true });
agenda.processEvery("one minute");
agenda.defaultLockLifetime(1000);

const jobTypes = process.env.JOB_TYPES ? process.env.JOB_TYPES.split(",") : [];

jobTypes.forEach((type) => {
  require("./jobs/" + type)(agenda);
});

if (jobTypes.length) {
  agenda.start().then(() => {
    console.log("Agenda Started");
  });
}

module.exports = agenda;
