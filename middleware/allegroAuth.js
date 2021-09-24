const { allegroToken, renewToken } = require("../models/allegroToken");

module.exports = async function (req, res, next) {
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
        return (req.token = token.token);
      }
    } else {
      req.token = token.token;
    }
  } else {
    res
      .status(405)
      .send({
        message: "Nie zautoryzowano swojego konta Allegro",
        messageType: "error",
      });
  }
  next();
};
