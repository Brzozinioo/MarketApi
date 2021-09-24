const { ebayToken, renewToken } = require("../models/ebayToken");

module.exports = async function (req, res, next) {
  let token = await ebayToken.findOne({ userid: req.user._id });
  if (token) {
    let date1 = new Date(token.expiredTime);
    let date2 = new Date(Date.now());

    if (date1.getTime() <= date2.getTime()) {
      let ebayResponse = await renewToken(token.refresh_token);
      if (ebayResponse.error) {
        res.status(400).send(ebayResponse.error_description);
      } else {
        let time = new Date(Date.now() + ebayResponse.data.expires_in * 1000);
        token.token = ebayResponse.data.access_token;
        token.expiredTime = time;
        await token.save();
        return (req.token = token.token);
      }
    } else {
      req.token = token.token;
    }
  } else {
    res.status(405).send({
      message: "Nie zautoryzowano swojego konta EBay",
      messageType: "error",
    });
  }
  next();
};
