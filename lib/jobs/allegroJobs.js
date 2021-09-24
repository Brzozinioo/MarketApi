const { default: axios } = require("axios");
const socket = require("../../index");
const { comparer } = require("../../functions/compare");
const { getUserToken } = require("../../models/allegroToken");
const { Monitor } = require("../../models/monitor");
const { monitorHistory } = require("../../models/monitorHistory");
const { User } = require("../../models/user");
const generateNewOfferMail = require("../emailTemplates/newOffer");
const mail = require("../mailer");
const { allegroHistory } = require("../../models/allegroHistory");
const noImage =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA5NiA5NiI+PHBhdGggZD0iTTEyIDEydjcyaDcyVjEyem02OCA0djQ3LjgyN0w2Mi4wNjkgNDQuMSA1NCA1Mi4xNzJsLTIwLTIwLTE4IDE4VjE2ek0xNiA4MFY1NS44MjhsMTgtMTggMjAgMjAgNy45MzEtNy45MjhMODAgNjkuNzczVjgweiIgZmlsbD0iI2RkZCIvPjxjaXJjbGUgY3g9IjY0IiBjeT0iMzIiIHI9IjQiIGZpbGw9IiNkZGQiLz48L3N2Zz4=";
const client = require("twilio")(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

module.exports = function (agenda) {
  agenda.define("addAllegroKeywordMonitor", async (job) => {
    try {
      let urlTail = "";
      const { monitorID, userID } = job.attrs.data;
      const token = await getUserToken(userID);
      const mon = await Monitor.findById(monitorID);
      const kategory = mon.kategoriaAllegro[mon.kategoriaAllegro.length - 1];
      if (kategory != "0") {
        urlTail = urlTail + "&category.id=" + kategory;
      }

      const api = axios.create({
        baseURL: process.env.ALLEGRO_BASE_URL,
        timeout: 10000,
        headers: {
          Accept: "application/vnd.allegro.public.v1+json",
          Authorization: "Bearer " + token.token,
        },
      });

      var offers = await api
        .get("/offers/listing?phrase=" + mon.monitorKeyWords + urlTail, {})
        .catch(function (error) {
          if (error.response) {
          } else if (error.request) {
            console.log(error.request);
          } else {
            console.log("Error", error.message);
          }
        });

      if (!mon.monitorAllegroResults.length && !mon.monitorFirstRun) {
        var arr = [];
        arr = offers.data.items.promoted.concat(offers.data.items.regular);
        arr.forEach(async (element) => {
          if (element.images.length !== 0) {
            img = element.images[0].url;
          } else {
            img = noImage;
          }
          var history = new allegroHistory({
            auctionid: element.id,
            auctionName: element.name,
            userid: user._id,
            image: img,
          });
          await history.save();
        });
        mon.monitorAllegroResults = arr;
        mon.monitorFirstRun = true;
        await mon.save();
      } else {
        var newArr = [];
        newArr = offers.data.items.promoted.concat(offers.data.items.regular);
        var newOffer = [];
        newOffer = newArr.filter(comparer(mon.monitorAllegroResults));
        if (!mon.monitorMoneyChecked)
          newOffer.forEach((element, index, arr) => {
            if (
              element.sellingMode.price.amount < mon.monitorKwotaMin ||
              element.sellingMode.price.amount > mon.monitorKwotaMax
            ) {
              arr.splice(index, 1);
            }
          });
        var hello = await new Promise((resolve, reject) => {
          var ReturnOffers = [...newOffer];
          console.log(ReturnOffers);
          var counter = 0;
          newOffer.forEach(async (offer, index) => {
            var history = await allegroHistory.find({
              auctionid: offer.id,
              auctionName: offer.name,
              userid: user._id,
            });
            console.log("HISTORY", history);

            if (history.length != 0) {
              console.log("DELETE ITEM");
              var ind = ReturnOffers.findIndex((x) => x.id == offer.id);
              ReturnOffers.splice(ind, 1);
              counter++;
              if (counter == newOffer.length) {
                console.log(ReturnOffers);
                resolve(ReturnOffers);
              }
            } else {
              if (offer.images.length !== 0) {
                img = offer.images[0].url;
              } else {
                img = noImage;
              }
              var newHistory = new allegroHistory({
                auctionid: offer.id,
                auctionName: offer.name,
                userid: user._id,
                image: img,
              });
              await newHistory.save();
              counter++;
              if (counter == newOffer.length) {
                console.log("RETURN: ", ReturnOffers);
                resolve(ReturnOffers);
              }
            }
          });
          console.log("RESOLVE CHECKER", counter, newOffer.length);
          if (newOffer.length == 0) {
            resolve(ReturnOffers);
          }
        })
          .then(async (offersArray) => {
            console.log("OFFERS CHECKED", offersArray);
            if (offersArray.length >= 1) {
              const historyObj = new monitorHistory({
                userid: userID,
                auctions: offersArray,
                website: "allegro",
                monitorid: monitorID,
              });
              await historyObj.save();
              mon.monitorAllegroResults = newArr;
              await mon.save();

              var items = "";
              var smsBody = "";
              offersArray.map((value, index) => {
                if (value.images.length !== 0) {
                  items =
                    items +
                    "<tr style='font-size:14px; line-height:19px; font-family: 'Oxygen', 'Helvetica Neue', helvetica, sans-serif; color:#777777'>                            <td width='50%'>                              <table cellpadding='0' cellspacing='0' style='font-size:14px; line-height:19px; font-family: 'Oxygen', 'Helvetica Neue', helvetica, sans-serif;' width='100%'>                                <tbody>                                  <tr>                                    <td style='padding-right:5px;' width='35%'>                                      <table border='0' cellpadding='0' cellspacing='0' role='presentation' style='border-collapse:collapse;border-spacing:0px;'>                                        <tbody>                                          <tr>                                            <td style='width:110px;'>                                              <a href='" +
                    process.env.ALLEGRO_URL +
                    "/oferta/" +
                    value.id +
                    "' target='_blank'>                                                <img alt='item1' height='auto' src='" +
                    value.images[0].url +
                    "' style='border: 1px solid #e6e6e6;border-radius:4px;display:block;font-size:13px;height:auto;outline:none;text-decoration:none;width:100%;' width='110' />                                              </a>                                            </td>                                          </tr>                                        </tbody>                                      </table>                                    </td>                                    <td style='text-align:left; font-size:14px; line-height:19px; font-family: ' oxygen', 'helvetica neue', helvetica, sans-serif; color: #777777;'>                                      <span style='color: #4d4d4d; font-weight:bold;'>                                        <a href='" +
                    process.env.ALLEGRO_URL +
                    "/oferta/" +
                    value.id +
                    "'>" +
                    value.name +
                    "</a>                                      </span>                                    </td>                                  </tr>                                </tbody>                              </table>                            </td>                            <td style='text-align:right; ' width='10%'>" +
                    value.sellingMode.price.amount +
                    " " +
                    value.sellingMode.price.currency +
                    " </td> </tr>";
                } else {
                  items =
                    items +
                    "<tr style='font-size:14px; line-height:19px; font-family: 'Oxygen', 'Helvetica Neue', helvetica, sans-serif; color:#777777'>                            <td width='50%'>                              <table cellpadding='0' cellspacing='0' style='font-size:14px; line-height:19px; font-family: 'Oxygen', 'Helvetica Neue', helvetica, sans-serif;' width='100%'>                                <tbody>                                  <tr>                                    <td style='padding-right:5px;' width='35%'>                                      <table border='0' cellpadding='0' cellspacing='0' role='presentation' style='border-collapse:collapse;border-spacing:0px;'>                                        <tbody>                                          <tr>                                            <td style='width:110px;'>                                              <a href='" +
                    process.env.ALLEGRO_URL +
                    "/oferta/" +
                    value.id +
                    "' target='_blank'>                                                <img alt='item1' height='auto' src='" +
                    noImage +
                    "' style='border: 1px solid #e6e6e6;border-radius:4px;display:block;font-size:13px;height:auto;outline:none;text-decoration:none;width:100%;' width='110' />                                              </a>                                            </td>                                          </tr>                                        </tbody>                                      </table>                                    </td>                                    <td style='text-align:left; font-size:14px; line-height:19px; font-family: ' oxygen', 'helvetica neue', helvetica, sans-serif; color: #777777;'>                                      <span style='color: #4d4d4d; font-weight:bold;'>                                        <a href='" +
                    process.env.ALLEGRO_URL +
                    "/oferta/" +
                    value.id +
                    "'>" +
                    value.name +
                    "</a>                                      </span>                                    </td>                                  </tr>                                </tbody>                              </table>                            </td>                            <td style='text-align:right; ' width='10%'>" +
                    value.sellingMode.price.amount +
                    " " +
                    value.sellingMode.price.currency +
                    " </td> </tr>";
                }

                smsBody =
                  smsBody +
                  value.name +
                  " - " +
                  process.env.ALLEGRO_URL +
                  "/oferta/" +
                  value.id +
                  " ";
              });

              mon.monitorNotifications.forEach((element) => {
                switch (element) {
                  case "email":
                    emailNotify = true;
                    break;
                  case "sms":
                    smsNotify = true;
                    break;
                }
              });

              if (emailNotify) {
                var mailOptions = {
                  from: process.env.EMAIL_LOGIN,
                  to: user.email,
                  subject: "Nowy wynik Monitorowania",
                  html: generateNewOfferMail(
                    user.name.replace(/ .*/, ""),
                    "<strong>" +
                      mon.monitorName +
                      "</strong> znalazł dla Ciebie nowe Oferty",
                    items
                  ),
                };
                await mail.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log("Wysłano email: " + info.response);
                  }
                });
              }
              if (smsNotify)
                client.messages
                  .create({
                    body: smsBody,
                    from: "+12013836526",
                    to: user.phone,
                  })
                  .then((message) => console.log(message.sid));

              socket.usersArray.forEach((element) => {
                if (element.userID == user._id) {
                  socket.io
                    .to(element.id)
                    .emit(
                      "newMonitorMessage",
                      "Pojawił się nowy wynik monitorowania dla monitora " +
                        mon.monitorName
                    );
                }
              });
            } else {
              console.log("PRZYPISANIE NOWYCH OFERT DO MONITORA");
              mon.monitorAllegroResults = newArr;
              await mon.save();
            }
          })
          .catch((err) => console.log(err));
        console.log("END");
      }
    } catch (exception) {
      console.log(exception);
    }
  });

  agenda.define("addAllegroUserMonitor", async (job) => {
    try {
      let urlTail = "";
      const { monitorID, userID } = job.attrs.data;
      const user = await User.findById(userID);
      const token = await getUserToken(userID);
      const mon = await Monitor.findById(monitorID);
      const kategory = mon.kategoriaAllegro[mon.kategoriaAllegro.length - 1];
      var emailNotify = false;
      var smsNotify = false;
      var img = "";
      if (kategory != "0") {
        urlTail = urlTail + "&category.id=" + kategory;
      }

      const api = axios.create({
        baseURL: process.env.ALLEGRO_BASE_URL,
        timeout: 10000,
        headers: {
          Accept: "application/vnd.allegro.public.v1+json",
          Authorization: "Bearer " + token.token,
        },
      });

      let offers = await api
        .get(
          "/offers/listing?seller.login=" + mon.monitorUsername + urlTail,
          {}
        )
        .catch(function (error) {
          if (error.response) {
          } else if (error.request) {
            console.log(error.request);
          } else {
            console.log("Error", error.message);
          }
        });

      if (!mon.monitorAllegroResults.length && !mon.monitorFirstRun) {
        var arr = [];
        arr = offers.data.items.promoted.concat(offers.data.items.regular);
        arr.forEach(async (element) => {
          if (element.images.length !== 0) {
            img = element.images[0].url;
          } else {
            img = noImage;
          }
          var history = new allegroHistory({
            auctionid: element.id,
            auctionName: element.name,
            userid: user._id,
            image: img,
          });
          await history.save();
        });
        mon.monitorAllegroResults = arr;
        mon.monitorFirstRun = true;
        await mon.save();
      } else {
        var newArr = [];
        newArr = offers.data.items.promoted.concat(offers.data.items.regular);
        var newOffer = [];
        newOffer = newArr.filter(comparer(mon.monitorAllegroResults));
        if (!mon.monitorMoneyChecked)
          newOffer.forEach((element, index, arr) => {
            if (
              element.sellingMode.price.amount < mon.monitorKwotaMin ||
              element.sellingMode.price.amount > mon.monitorKwotaMax
            ) {
              arr.splice(index, 1);
            }
          });
        var hello = await new Promise((resolve, reject) => {
          var ReturnOffers = [...newOffer];
          console.log(ReturnOffers);
          var counter = 0;
          newOffer.forEach(async (offer, index) => {
            var history = await allegroHistory.find({
              auctionid: offer.id,
              auctionName: offer.name,
              userid: user._id,
            });
            console.log("HISTORY", history);

            if (history.length != 0) {
              console.log("DELETE ITEM");
              var ind = ReturnOffers.findIndex((x) => x.id == offer.id);
              ReturnOffers.splice(ind, 1);
              counter++;
              if (counter == newOffer.length) {
                console.log(ReturnOffers);
                resolve(ReturnOffers);
              }
            } else {
              if (offer.images.length !== 0) {
                img = offer.images[0].url;
              } else {
                img = noImage;
              }
              var newHistory = new allegroHistory({
                auctionid: offer.id,
                auctionName: offer.name,
                userid: user._id,
                image: img,
              });
              await newHistory.save();
              counter++;
              if (counter == newOffer.length) {
                console.log("RETURN: ", ReturnOffers);
                resolve(ReturnOffers);
              }
            }
          });
          console.log("RESOLVE CHECKER", counter, newOffer.length);
          if (newOffer.length == 0) {
            resolve(ReturnOffers);
          }
        })
          .then(async (offersArray) => {
            console.log("PROMISE THEN", offersArray);
            if (offersArray.length >= 1) {
              const historyObj = new monitorHistory({
                userid: userID,
                auctions: offersArray,
                website: "allegro",
                monitorid: monitorID,
              });
              await historyObj.save();
              mon.monitorAllegroResults = newArr;
              await mon.save();

              var items = "";
              var smsBody = "";
              offersArray.map((value, index) => {
                if (value.images.length !== 0) {
                  items =
                    items +
                    "<tr style='font-size:14px; line-height:19px; font-family: 'Oxygen', 'Helvetica Neue', helvetica, sans-serif; color:#777777'>                            <td width='50%'>                              <table cellpadding='0' cellspacing='0' style='font-size:14px; line-height:19px; font-family: 'Oxygen', 'Helvetica Neue', helvetica, sans-serif;' width='100%'>                                <tbody>                                  <tr>                                    <td style='padding-right:5px;' width='35%'>                                      <table border='0' cellpadding='0' cellspacing='0' role='presentation' style='border-collapse:collapse;border-spacing:0px;'>                                        <tbody>                                          <tr>                                            <td style='width:110px;'>                                              <a href='" +
                    process.env.ALLEGRO_URL +
                    "/oferta/" +
                    value.id +
                    "' target='_blank'>                                                <img alt='item1' height='auto' src='" +
                    value.images[0].url +
                    "' style='border: 1px solid #e6e6e6;border-radius:4px;display:block;font-size:13px;height:auto;outline:none;text-decoration:none;width:100%;' width='110' />                                              </a>                                            </td>                                          </tr>                                        </tbody>                                      </table>                                    </td>                                    <td style='text-align:left; font-size:14px; line-height:19px; font-family: ' oxygen', 'helvetica neue', helvetica, sans-serif; color: #777777;'>                                      <span style='color: #4d4d4d; font-weight:bold;'>                                        <a href='" +
                    process.env.ALLEGRO_URL +
                    "/oferta/" +
                    value.id +
                    "'>" +
                    value.name +
                    "</a>                                      </span>                                    </td>                                  </tr>                                </tbody>                              </table>                            </td>                            <td style='text-align:right; ' width='10%'>" +
                    value.sellingMode.price.amount +
                    " " +
                    value.sellingMode.price.currency +
                    " </td> </tr>";
                } else {
                  items =
                    items +
                    "<tr style='font-size:14px; line-height:19px; font-family: 'Oxygen', 'Helvetica Neue', helvetica, sans-serif; color:#777777'>                            <td width='50%'>                              <table cellpadding='0' cellspacing='0' style='font-size:14px; line-height:19px; font-family: 'Oxygen', 'Helvetica Neue', helvetica, sans-serif;' width='100%'>                                <tbody>                                  <tr>                                    <td style='padding-right:5px;' width='35%'>                                      <table border='0' cellpadding='0' cellspacing='0' role='presentation' style='border-collapse:collapse;border-spacing:0px;'>                                        <tbody>                                          <tr>                                            <td style='width:110px;'>                                              <a href='" +
                    process.env.ALLEGRO_URL +
                    "/oferta/" +
                    value.id +
                    "' target='_blank'>                                                <img alt='item1' height='auto' src='" +
                    noImage +
                    "' style='border: 1px solid #e6e6e6;border-radius:4px;display:block;font-size:13px;height:auto;outline:none;text-decoration:none;width:100%;' width='110' />                                              </a>                                            </td>                                          </tr>                                        </tbody>                                      </table>                                    </td>                                    <td style='text-align:left; font-size:14px; line-height:19px; font-family: ' oxygen', 'helvetica neue', helvetica, sans-serif; color: #777777;'>                                      <span style='color: #4d4d4d; font-weight:bold;'>                                        <a href='" +
                    process.env.ALLEGRO_URL +
                    "/oferta/" +
                    value.id +
                    "'>" +
                    value.name +
                    "</a>                                      </span>                                    </td>                                  </tr>                                </tbody>                              </table>                            </td>                            <td style='text-align:right; ' width='10%'>" +
                    value.sellingMode.price.amount +
                    " " +
                    value.sellingMode.price.currency +
                    " </td> </tr>";
                }

                smsBody =
                  smsBody +
                  value.name +
                  " - " +
                  process.env.ALLEGRO_URL +
                  "/oferta/" +
                  value.id +
                  " ";
              });

              mon.monitorNotifications.forEach((element) => {
                switch (element) {
                  case "email":
                    emailNotify = true;
                    break;
                  case "sms":
                    smsNotify = true;
                    break;
                }
              });

              if (emailNotify) {
                var mailOptions = {
                  from: process.env.EMAIL_LOGIN,
                  to: user.email,
                  subject: "Nowy wynik Monitorowania",
                  html: generateNewOfferMail(
                    user.name.replace(/ .*/, ""),
                    "<strong>" +
                      mon.monitorName +
                      "</strong> znalazł dla Ciebie nowe Oferty",
                    items
                  ),
                };
                await mail.sendMail(mailOptions, function (error, info) {
                  if (error) {
                    console.log(error);
                  } else {
                    console.log("Wysłano email: " + info.response);
                  }
                });
              }
              if (smsNotify)
                client.messages
                  .create({
                    body: smsBody,
                    from: "+12013836526",
                    to: user.phone,
                  })
                  .then((message) => console.log(message.sid));

              socket.usersArray.forEach((element) => {
                if (element.userID == user._id) {
                  socket.io
                    .to(element.id)
                    .emit(
                      "newMonitorMessage",
                      "Pojawił się nowy wynik monitorowania dla monitora " +
                        mon.monitorName
                    );
                }
              });
            } else {
              console.log("PRZYPISANIE NOWYCH OFERT DO MONITORA");
              mon.monitorAllegroResults = newArr;
              await mon.save();
            }
          })
          .catch((err) => console.log(err));
        console.log("END");
      }
    } catch (exception) {
      console.log(exception);
    }
  });
};
