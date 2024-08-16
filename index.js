const { app, BrowserWindow, ipcMain, webContents } = require('electron');
const port = 5002;

const express = require("express");
const path = require("path");
const appServer = express();
const { PosPrinter } = require("electron-pos-printer");
require("electron-reload")(__dirname);
const bodyParser = require("body-parser");
const cors = require("cors");

const bwipjs = require("bwip-js");
const fs = require("fs");
const os = require("os");
const homedir = os.homedir();
var defaultprinter = [];
const moment = require("moment");
const { barcode, qrcode, svg2url } = require("pure-svg-code");

appServer.use(bodyParser.urlencoded({ extended: true }));
appServer.use(bodyParser.json());
appServer.use(express.json());

const activePrintJobs2 = {};
function generateRandomString(length = 15) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
appServer.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");
  next();
});
appServer.post("/PrintResult", async (req, res) => {
  const data = req.body;
  console.log("Data", data);

  const options = {
    preview: false,
    printerName: defaultprinter[0],
    silent: true,
    margin: "0 0 0 0",
    copies: 1,
    timeOutPerLine: 10000,
    pageSize: "80mm",
  };
  const headerdata = [
    {
      type: "text",
      value: data.cashierName,
      style: {
        position: "absolute",
        right: "6%",
        fontFamily: "Arial",
      },
    },
    {
      type: "text",
      value: data.shopName,
      style: {
        position: "absolute",
        right: "6%",
        top: "2%",
        fontFamily: "Arial",
      },
    },
    {
      type: "text",
      value: data.date,
      style: {
        position: "absolute",
        right: "6%",
        top: "3%",
        fontFamily: "Arial",
      },
    },
  ];
  const middleData = [
    {
      type: "text",
      value: "Event Result",
      style: {
        position: "absolute",
        left: "35%",
        top: "5%",
        fontWeight: "bold",
        fontSize: "15px",
        fontFamily: "Arial",
      },
    },
  ];
  const leftMiddle = [
    {
      type: "text",
      value: "Game",
      style: {
        position: "absolute",
        left: "5%",
        top: "7%",
        fontWeight: "bold",
        fontFamily: "Arial",
      },
    },
    {
      type: "text",
      value: "Event ID",
      style: {
        position: "absolute",
        left: "5%",
        top: "8%",
        fontWeight: "bold",
        fontFamily: "Arial",
      },
    },
    {
      type: "text",
      value: "Time",
      style: {
        position: "absolute",
        left: "5%",
        top: "9%",
        fontWeight: "bold",
        fontFamily: "Arial",
      },
    },
  ];
  const rightmiddle = [
    {
      type: "text",
      value: data.Game,
      style: {
        position: "absolute",
        right: "6%",
        top: "7%",
        fontWeight: "bold",
        fontFamily: "Arial",
      },
    },
    {
      type: "text",
      value: data.eventId,
      style: {
        position: "absolute",
        right: "6%",
        top: "8%",
        fontWeight: "bold",
        fontFamily: "Arial",
      },
    },
    {
      type: "text",
      value: data.formattedTime,
      style: {
        position: "absolute",
        right: "6%",
        top: "9%",
        fontWeight: "bold",
        fontFamily: "Arial",
      },
    },
  ];
  const results = [
    {
      type: "text",
      value: data.result,
      style: {
        position: "absolute",
        right: "1%",
        top: "10%",
        fontFamily: "Arial",
      },
    },
  ];
  const middleBottom = [
    {
      type: "text",
      value: generateRandomString(),
      style: {
        position: "absolute",
        left: "30%",
        top: "14%",
        fontSize: "10px",
        fontFamily: "Arial",
      },
    },
  ];
  var dataToPrint = [
    ...headerdata,
    ...middleData,
    ...leftMiddle,
    ...rightmiddle,
    ...results,
    ...middleBottom,
  ];
  PosPrinter.print(dataToPrint, options)
    .then(console.log("printed"))
    .catch((error) => {
      console.error("result errpr", error);
    })
    .finally(() => {
      delete activePrintJobs2[printJobId];
    });
  res.status(200).json({ message: "success" });
});
const hasDecimalPlaces = (num) => {
  return num % 1 !== 0;
};
appServer.post("/printTicket", async (req, res) => {
  const {
    shopName,
    minPayout,
    maxPayout,
    stake,
    cashierName,
    betSlipNumber,
    gameStart,
    tickets,
    oddType,
  } = req.body;
  const isCopyparse = JSON.parse(req.body.isCopy);
  const isCopy = isCopyparse.isCopy;
  console.log("req:", isCopy);
  console.log("copy flag: " + JSON.stringify(req.body));

  const printJobId = generatePrintJobId(betSlipNumber, stake, minPayout);

  const options = {
    preview: false,
    printerName: defaultprinter[0],
    silent: true,
    margin: "0 0 0 0",
    copies: 1,
    timeOutPerLine: 10000,
    pageSize: "80mm",
  };

  const individualTickets = [];

  for (let ticket of tickets) {
    const keys = Object.keys(ticket);

    let title = ticket.oddType;

    if (
      ticket["selected"].includes("Heads") ||
      ticket["selected"].includes("Evens") ||
      ticket["selected"].includes("Tails")
    ) {
      title = "Heads and Tails";
    }

    for (let key of keys) {
      if (key === "stake") {
        const right = {
          type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
          value: "Br " + ticket[key].toLocaleString("en-us") + ".00",
          style: {
            fontFamily: "arial",
            fontWeight: "600",
            textAlign: "right",
            fontSize: "11px",
            margin: "0px 20px 0px 0px",
          },
        };

        const left = {
          type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
          value: title,
          style: {
            fontFamily: "arial",
            fontWeight: "600",
            textAlign: "left",
            fontSize: "11px",
            margin: "0px 0px 0px 10px",
            position: "relative",
            bottom: "10px",
          },
        };

        left !== null && individualTickets.push(right);
        right !== null && individualTickets.push(left);
      } else {
        const left = {
          type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
          value: key !== "oddType" ? ticket[key] : "",
          style: {
            fontFamily: "arial",
            fontWeight: "300",
            textAlign: "left",
            fontSize: "11px",
            margin: key === "game" ? "0px 0px 0px 10px" : "0px 0px 0px 20px",
            position: "relative",
            bottom: "10px",
          },
        };

        left !== null && individualTickets.push(left);
      }
    }
  }

  const headData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: betSlipNumber,
      style: {
        fontFamily: "arial",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "2px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: shopName,
      style: {
        fontFamily: "arial",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "2px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: cashierName,
      style: {
        fontFamily: "arial",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: gameStart,
      style: {
        fontFamily: "arial",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "2px 20px 10px 0px",
      },
    },
  ];

  let barcodeData = null;

  console.log("request incoming....");

  var svgString = barcode(betSlipNumber.toLocaleString(), "code128", {
    width: "100",
    barWidth: 5,
    barHeight: 20,
  });

  fs.writeFile(
    homedir + "/Documents" + "/db/barcode.svg",
    svgString,
    (result) => {
      console.log(result);

      barcodeData = {
        style: {
          width: "75%",
          margin: "-30px auto",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginTop: "2px",
        },
        type: "image",
        path: homedir + "/Documents" + "/db/barcode.svg",
        height: 20,
      };

      const filePath = path.join(__dirname, "copystamp.jpg");

      console.log("barcode data: ", barcodeData);

      const endData = [
        {
          type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
          value: "Br " + stake.toLocaleString("en-us") + ".00",
          style: {
            fontFamily: "arial",
            fontWeight: "600",
            textAlign: "right",
            fontSize: "12px",
            margin: "0px 20px -8px 0px",
          },
        },
        {
          type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
          value: "Total Stake",
          style: {
            fontFamily: "arial",
            fontWeight: "600",
            textAlign: "left",
            fontSize: "12px",
            margin: "0px 0px 0px 10px",
            position: "relative",
            bottom: "4px",
          },
        },
        {
          type: "text",
          style: {
            fontFamily: "arial",
            display: "flex",
            fontSize: "12px",
            flexDirection: "column",
            border: "1px solid #595959",
            borderBottom: "none",
            width: "88%",
            fontWeight: "600",
            textAlign: "left",
            padding: "1.6px",
            margin: "0px 0px 0px 10px",
          },
          value: "Min Payout(incl. Stake)",
        },
        {
          type: "text",
          style: {
            fontFamily: "arial",
            fontSize: "12px",
            fontWeight: "600",
            textAlign: "right",
            margin: "0px 20px 0px 0px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            bottom: "15px",
          },
          value: "Br " + minPayout.toLocaleString("en-us") + ".00",
        },
        {
          type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
          value: "Max Payout(incl. Stake)",
          style: {
            fontFamily: "arial",
            padding: "1.6px",
            border: "1px solid #595959",
            fontSize: "12px",
            fontWeight: "600",
            borderTop: "none",
            textAlign: "left",
            fontSize: "12px",
            display: "flex",
            margin: "0px 0px 0px 10px",
            flexDirection: "column",
            position: "relative",
            bottom: "15px",
            width: "88%",
          },
        },
        {
          type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
          value:
            "Br " +
            maxPayout.toLocaleString("en-us") +
            (!hasDecimalPlaces(maxPayout.toLocaleString("en-us")) ? ".00" : ""),
          style: {
            fontFamily: "arial",
            fontWeight: "600",
            textAlign: "right",
            fontSize: "12px",
            margin: "0px 20px 0px 0px",
            display: "flex",
            flexDirection: "column",
            position: "relative",
            bottom: "30px",
          },
        },
        barcodeData,
        {
          type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
          value: `*${betSlipNumber.toLocaleString()}*`,
          style: {
            fontFamily: "Arial",
            fontWeight: "300",
            textAlign: "center",
            width: "100%",
            fontSize: "10px",
            margin: "0px 0px 0px 2px",
            position: "relative",
            top: "30px",
            letterSpacing: "8px",
          },
        },
      ];

      const copyTag = [
        {
          type: "image",
          path: filePath,
          style: {
            zIndex: -1,
            opacity: 0.6,
            position: "absolute",
            top: "100px",
            left: "50%",
            height: "120px",
            transform: "translate(-50%, -50%)",
          },
        },
      ];

      var dataToPrint =
        isCopy === true
          ? [...headData, ...individualTickets, ...endData, ...copyTag]
          : [...headData, ...individualTickets, ...endData];
      PosPrinter.print(dataToPrint, options)
        .then(console.log("printed"))

        .catch((error) => {
          console.error(error);
        })
        .finally(() => {
          delete activePrintJobs2[printJobId];
        });
      return res.status(200).json({ message: "success" });
    }
  );
});

appServer.post("/printRedeem", async (req, res) => {
  const {
    cashierName,
    shopName,
    gameStart,
    betSlipNumber,
    redeemedAmount,
    status,
  } = req.body;

  const printTime = new Date().toLocaleTimeString();

  const printJobId = generatePrintJobId(betSlipNumber, redeemedAmount, status);

  const options = {
    preview: false,
    printerName: defaultprinter[0],
    silent: true,
    margin: "0 0 0 0",
    copies: 1,
    timeOutPerLine: 10000,
    pageSize: "80mm",
  };

  const headData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: betSlipNumber,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: shopName,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: cashierName,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: gameStart,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 16px 0px",
      },
    },
  ];

  const middleData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Redeem Receipt",
      style: {
        fontFamily: "Roboto",
        fontWeight: "600",
        textAlign: "center",
        fontSize: "12px",
        marginBottom: "10px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: betSlipNumber,
      style: {
        fontFamily: "Roboto",
        fontWeight: "600",
        textAlign: "center",
        fontSize: "12px",
      },
    },
  ];

  const endData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + redeemedAmount + ".00",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Redeemed Amount",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "11px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "10px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: printTime,
      style: {
        fontFamily: "Roboto",
        bottom: "12px",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Redeemed Time",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "11px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "12px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: status,
      style: {
        fontFamily: "Roboto",
        fontWeight: "600",
        textAlign: "center",
        marginTop: "10px",
        fontSize: "12px",
      },
    },
  ];

  var dataToPrint = [...headData, ...middleData, ...endData];
  PosPrinter.print(dataToPrint, options)
    .then(console.log("printed"))

    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      delete activePrintJobs2[printJobId];
    });
  res.status(200).json({ message: "success" });
});

appServer.post("/printCancel", async (req, res) => {
  const { cashierName, shopName, gameStart, betSlipNumber, cancelledAmount } =
    req.body;
  const printTime = new Date().toLocaleTimeString();

  const printJobId = generatePrintJobId(
    betSlipNumber,
    cancelledAmount,
    cashierName
  );

  const options = {
    preview: false,
    printerName: defaultprinter[0],
    silent: true,
    margin: "0 0 0 0",
    copies: 1,
    timeOutPerLine: 10000,
    pageSize: "80mm",
  };

  const headData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: betSlipNumber,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: shopName,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: cashierName,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: gameStart,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 16px 0px",
      },
    },
  ];

  const middleData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Cancel Receipt",
      style: {
        fontFamily: "Roboto",
        fontWeight: "600",
        textAlign: "center",
        fontSize: "12px",
        marginBottom: "10px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: betSlipNumber,
      style: {
        fontFamily: "Roboto",
        fontWeight: "600",
        textAlign: "center",
        fontSize: "12px",
      },
    },
  ];

  const endData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + cancelledAmount + ".00",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Cancelled Amount",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "11px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "10px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: printTime,
      style: {
        fontFamily: "Roboto",
        bottom: "12px",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Cancelled Time",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "11px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "12px",
      },
    },
  ];

  var dataToPrint = [...headData, ...middleData, ...endData];
  PosPrinter.print(dataToPrint, options)
    .then(console.log("printed"))

    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      delete activePrintJobs2[printJobId];
    });
  res.status(200).json({ message: "success" });
});

appServer.post("/printSummary", async (req, res) => {
  const {
    from,
    to,
    startBalance,
    deposits,
    bets,
    cancellations,
    redeemed,
    withdraws,
    endBalance,
    cashierName,
    shopName,
  } = req.body;
  const printTime = new Date().toLocaleTimeString();

  const printJobId = generatePrintJobId(cancellations, redeemed, cashierName);

  const options = {
    preview: false,
    printerName: defaultprinter[0],
    silent: true,
    margin: "0 0 0 0",
    copies: 1,
    timeOutPerLine: 10000,
    pageSize: "80mm",
  };

  const headData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: shopName,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: cashierName,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: printTime,
      style: {
        fontFamily: "Roboto",
        fontWeight: "300",
        textAlign: "right",
        fontSize: "10px",
        margin: "6px 20px 16px 0px",
      },
    },
  ];

  const middleData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: `Summary (${cashierName})`,
      style: {
        fontFamily: "Roboto",
        fontWeight: "600",
        textAlign: "center",
        fontSize: "12px",
        marginBottom: "4px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: `${from} - ${to}`,
      style: {
        fontFamily: "Roboto",
        marginBottom: "6px",
        fontWeight: "600",
        textAlign: "center",
        fontSize: "12px",
      },
    },
  ];

  const endData = [
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + startBalance + ".00",
      style: {
        fontFamily: "Roboto",
        position: "relative",
        bottom: "-4px",
        fontWeight: "600",
        textAlign: "right",
        fontSize: "12px",
        margin: "2px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Start Balance",
      style: {
        fontFamily: "Roboto",
        fontWeight: "600",
        textAlign: "left",
        fontSize: "12px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "10px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + deposits + ".00",
      style: {
        fontFamily: "Roboto",
        position: "relative",
        bottom: "7px",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Deposits",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "12px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "18px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + bets + ".00",
      style: {
        fontFamily: "Roboto",
        position: "relative",
        bottom: "16px",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Bets",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "12px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "28px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + cancellations + ".00",
      style: {
        fontFamily: "Roboto",
        position: "relative",
        bottom: "26px",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Cancellations",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "12px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "38px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + redeemed + ".00",
      style: {
        fontFamily: "Roboto",
        position: "relative",
        bottom: "34px",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Redeemed",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "12px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "48px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + withdraws + ".00",
      style: {
        fontFamily: "Roboto",
        position: "relative",
        bottom: "44px",
        fontWeight: "500",
        textAlign: "right",
        fontSize: "12px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Withdraws",
      style: {
        fontFamily: "Roboto",
        fontWeight: "500",
        textAlign: "left",
        fontSize: "12px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "58px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "Br. " + endBalance + ".00",
      style: {
        fontFamily: "Roboto",
        position: "relative",
        bottom: "56px",
        fontWeight: "600",
        textAlign: "right",
        fontSize: "12px",
        margin: "0px 20px 0px 0px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table
      value: "End Balance",
      style: {
        fontFamily: "Roboto",
        fontWeight: "600",
        textAlign: "left",
        fontSize: "12px",
        margin: "0px 0px 0px 10px",
        position: "relative",
        bottom: "68px",
      },
    },
  ];

  var dataToPrint = [...headData, ...middleData, ...endData];
  PosPrinter.print(dataToPrint, options)
    .then(console.log("printed"))

    .catch((error) => {
      console.error(error);
    })
    .finally(() => {
      delete activePrintJobs2[printJobId];
    });
  res.status(200).json({ message: "success" });
});

function generatePrintJobId(ticket, stake, win) {
  return `${ticket}-${stake}-${win}`;
}

function printReceipt() {
  const currentdate = moment();
  const formatteddate = currentdate.format("YY/MM/DD");
  console.log(defaultprinter[0]);
  const printTime = new Date().toLocaleTimeString();
  const options = {
    preview: false,
    printerName: defaultprinter[0],
    silent: true,
    margin: "0 0 0 0",
    copies: 1,
    timeOutPerLine: 10000,
    pageSize: "80mm",
  };

  const data = [
    {
      type: "image",
      path: __dirname + "/Kiron.png",
      style: {
        position: "absolute",
        width: "150px",
        height: "80px",
        top: "1%",
        left: "1%",
        opacity: 1,
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Slip Id",
      style: {
        fontFamily: "Arial",
        fontSize: "11px",
        textAlign: "start",
        color: "black",
        position: "absolute",
        top: "2%",
        right: "10%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Oprator Name",
      style: {
        fontFamily: "Arial",
        fontSize: "11px",
        textAlign: "center",
        color: "black",
        position: "absolute",
        top: "3%",
        right: "10%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Cashier Name",
      style: {
        fontFamily: "Arial",
        fontSize: "11px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        right: "10%",
        top: "4%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: formatteddate + printTime,
      style: {
        fontFamily: "Arial",
        fontSize: "10px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        right: "10%",
        top: "5.5%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Header",
      style: {
        fontFamily: "Arial",
        fontSize: "13px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "40%",
        top: "12%",
        fontWeight: "bold",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Header Font: Arial(10)",
      style: {
        fontFamily: "Arial",
        fontSize: "14px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "14%",
      },
    },

    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Content Font: Arial(8)",
      style: {
        fontFamily: "Arial",
        fontSize: "12px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "16%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Terms font: Arial(5)",
      style: {
        fontFamily: "Arial",
        fontSize: "12px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "18%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Left Aligned",
      style: {
        fontFamily: "Arial",
        fontSize: "12px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "20%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Center Aligned",
      style: {
        fontFamily: "Arial",
        fontSize: "12px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "35%",
        top: "20%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Right Aligned",
      style: {
        fontFamily: "Arial",
        fontSize: "12px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        right: "10%",
        top: "20%",
        fontWeight: "100px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "BOLD",
      style: {
        fontFamily: "Arial",
        fontSize: "12px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "22%",
        fontWeight: "bold",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Italic",
      style: {
        fontFamily: "Arial",
        fontSize: "12px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "24%",
        fontStyle: "italic",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Same Line Left",
      style: {
        fontFamily: "Arial",
        fontSize: "10px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "26%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Same Line Center",
      style: {
        fontFamily: "Arial",
        fontSize: "10px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "35%",
        top: "26%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Same Line Right",
      style: {
        fontFamily: "Arial",
        fontSize: "10px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        right: "10%",
        top: "26%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Line 1",
      style: {
        fontFamily: "Arial",
        fontSize: "8px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "28%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Line 2",
      style: {
        fontFamily: "Arial",
        fontSize: "8px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "29%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Line 3",
      style: {
        fontFamily: "Arial",
        fontSize: "8px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "30%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Line 4",
      style: {
        fontFamily: "Arial",
        fontSize: "8px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "5%",
        top: "31%",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "*9234567890128*",
      style: {
        fontFamily: "Arial",
        fontSize: "8px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        left: "15%",
        top: "38%",
        letterSpacing: "10px",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "Terms and conditions",
      style: {
        fontFamily: "Arial",
        fontSize: "10px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        top: "39%",
        left: "-5%",
        width: "100%",
        display: "flex",
        justifyContent: "center",
      },
    },
    {
      type: "text", // 'text' | 'barCode' | 'qrCode' | 'image' | 'table'
      value: "A0A8CD97D9",
      style: {
        fontFamily: "Arial",
        fontSize: "12px",
        textAlign: "end",
        color: "black",
        position: "absolute",
        top: "41%",
        left: "-5%",
        width: "100%",
        display: "flex",
        justifyContent: "center",
      },
    },
  ];

  var svgString = barcode("9234567890128", "code128", {
    width: "110",
    barWidth: 1,
    barHeight: 19,
  });
  fs.writeFile(homedir + "/Documents" + "/barcode.svg", svgString, (result) => {
    console.log(result);

    barcodeData = {
      style: {
        width: "75%",
        position: "absolute",
        top: "33%",
        left: "11%",
      },
      type: "image",
      path: homedir + "/Documents" + "/barcode.svg",
      height: 20,
    };
    const printdata = [...data, barcodeData];
    PosPrinter.print(printdata, options)
      .then(console.log("printed"))

      .catch((error) => {
        console.log(error);
      });
  });
}

const createwindow = () => {
  var window = new BrowserWindow({
    width: 500,
    height: 230,
    show: true,
    icon: path.join(__dirname, "./logo.ico"),
    resizable: false,
    fullscreen: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      enableRemoteModule: false,

      preload: path.join(__dirname, "preload.js"),
    },
  });

  window.loadFile("index.html");

  ipcMain.on("get-printers", async (event) => {
    try {
      const printers = await window.webContents.getPrintersAsync();
      console.log("printer's name: ", printers.name);
      event.sender.send("printersList", printers); // Send printers back to renderer
    } catch (error) {
      console.error("Error getting printers:", error);
    }
  });
  ipcMain.on("set-default-printer", async (event, selectedPrinterName) => {
    try {
      console.log(selectedPrinterName);
      defaultprinter.push(selectedPrinterName);
      console.log(defaultprinter[0]);
    } catch (error) {
      console.error("Error setting default printer:", error);
    }
  });
  ipcMain.on("print-request", (event, args) => {
    printReceipt();
  });
};

try {
  require("electron-reloader")(module);
} catch (_) {}

// app.on("window-all-closed", () => {
//   if (process.platform !== "darwin") {
//     app.quit();
//   }
// });
appServer.options("*", cors());

app.whenReady().then(() => {
  const server = appServer.listen(port, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${port}`);
  });

  createwindow();
});