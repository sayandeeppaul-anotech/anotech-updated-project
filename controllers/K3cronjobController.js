const express = require("express");
const User = require("../models/userModel");
const K3Result = require("../models/K3ResultModel");
const k3betmodel = require("../models/K3betmodel");
const Timer1Min = require("../models/timersModel");
const Timer3Min = require("../models/timersModel");
const Timer5Min = require("../models/timersModel");
const Timer10Min = require("../models/timersModel");
const cron = require("node-cron");
const moment = require("moment");

function secondsToHms2(d) {
  d = Number(d);
  var m = Math.floor((d % 3600) / 60);
  return ("0" + m).slice(-2) + ":" + ("0" + (d % 60)).slice(-2);
}

async function getLatestPeriodId2(timer) {
  let timerModel;
  switch (timer) {
    case "1min":
      timerModel = Timer1Min;
      break;
    case "3min":
      timerModel = Timer3Min;
      break;
    case "5min":
      timerModel = Timer5Min;
      break;
    case "10min":
      timerModel = Timer10Min;
      break;
    default:
      throw new Error("Invalid timer specified");
  }
  const latestTimer = await timerModel.findOne().sort({ _id: -1 });
  return latestTimer ? latestTimer.periodId : null;
}

const createTimer2 = (TimerModel, interval, timerName) => {
  const cronInterval = `*/${interval} * * * *`;
  const jobFunction = async () => {
    const periodId = moment().format("YYYYMMDDHHmmss");
    await TimerModel.create({ periodId });

    setTimeout(async () => {
      const userBets = await k3betmodel.find({ periodId });

      // Initialize variables for least bet amounts
      let leastBetUserTotalSum = null;
      let leastBetAmountTotalSum = Infinity;
      let leastBetUserTwoSameOneDifferent = null;
      let leastBetAmountTwoSameOneDifferent = Infinity;
      let leastBetUserThreeSame = null;
      let leastBetAmountThreeSame = Infinity;
      let leastBetUserThreeDifferentNumbers = null;
      let leastBetAmountThreeDifferentNumbers = Infinity;

      let betAmountsTotalSum = {};

      // Collect bet amounts for each possible outcome (3 to 18)
      userBets.forEach((bet) => {
        if (bet.selectedItem === "totalSum") {
          if (!betAmountsTotalSum[bet.totalSum]) {
            betAmountsTotalSum[bet.totalSum] = 0;
          }
          betAmountsTotalSum[bet.totalSum] += bet.betAmount;

          if (bet.betAmount < leastBetAmountTotalSum) {
            leastBetAmountTotalSum = bet.betAmount;
            leastBetUserTotalSum = bet;
          }
        }

        if (
          bet.selectedItem === "twoSameOneDifferent" &&
          bet.betAmount < leastBetAmountTwoSameOneDifferent
        ) {
          leastBetAmountTwoSameOneDifferent = bet.betAmount;
          leastBetUserTwoSameOneDifferent = bet;
        }
        if (
          bet.selectedItem === "threeSame" &&
          bet.betAmount < leastBetAmountThreeSame
        ) {
          leastBetAmountThreeSame = bet.betAmount;
          leastBetUserThreeSame = bet;
        }
        if (
          bet.selectedItem === "threeDifferentNumbers" &&
          bet.betAmount < leastBetAmountThreeDifferentNumbers
        ) {
          leastBetAmountThreeDifferentNumbers = bet.betAmount;
          leastBetUserThreeDifferentNumbers = bet;
        }
      });

      // Check if all numbers from 3 to 18 have been bet on
      let allNumbersBetOn = true;
      for (let i = 3; i <= 18; i++) {
        if (!betAmountsTotalSum[i]) {
          allNumbersBetOn = false;
          break;
        }
      }

      // Determine the winning number
      let winningNumberTotalSum;
      if (allNumbersBetOn) {
        winningNumberTotalSum = leastBetUserTotalSum ? leastBetUserTotalSum.totalSum : null;
      } else {
        // Find a number from 3 to 18 that hasn't been bet on
        for (let i = 3; i <= 18; i++) {
          if (!betAmountsTotalSum[i]) {
            winningNumberTotalSum = i;
            break;
          }
        }
      }

      // Generate dice outcomes that match the winning number
      let diceOutcomeD1, diceOutcomeD2, diceOutcomeD3;
      if (
        winningNumberTotalSum !== null &&
        winningNumberTotalSum >= 3 &&
        winningNumberTotalSum <= 18
      ) {
        const possibleOutcomes = [];
        for (let i = 1; i <= 6; i++) {
          for (let j = 1; j <= 6; j++) {
            for (let k = 1; k <= 6; k++) {
              if (i + j + k === winningNumberTotalSum) {
                possibleOutcomes.push([i, j, k]);
              }
            }
          }
        }
        const randomIndex = Math.floor(Math.random() * possibleOutcomes.length);
        [diceOutcomeD1, diceOutcomeD2, diceOutcomeD3] = possibleOutcomes[randomIndex];
      } else {
        // Handle the case when there are no user bets or winning number is outside the range
        diceOutcomeD1 = Math.floor(Math.random() * 6) + 1;
        diceOutcomeD2 = Math.floor(Math.random() * 6) + 1;
        diceOutcomeD3 = Math.floor(Math.random() * 6) + 1;
      }

      // Generate dice outcomes for twoSameOneDifferent
      let diceOutcomeTwoSameOneDifferent;
      if (leastBetUserTwoSameOneDifferent) {
        const twoSameOneDifferentValue = leastBetUserTwoSameOneDifferent.twoSameOneDifferent;
        diceOutcomeTwoSameOneDifferent = twoSameOneDifferentValue.filter(
          (value, index, self) => self.indexOf(value) === index
        ); // Get unique values from the array
      }

      // Generate dice outcomes for threeSame
      let diceOutcomeThreeSame;
      if (leastBetUserThreeSame) {
        const threeSameValue = leastBetUserThreeSame.threeSame;
        diceOutcomeThreeSame = [threeSameValue, threeSameValue, threeSameValue];
      }

      // Generate dice outcomes for threeDifferentNumbers
      let diceOutcomeThreeDifferentNumbers;
      if (leastBetUserThreeDifferentNumbers) {
        const threeDifferentNumbersValue = leastBetUserThreeDifferentNumbers.threeDifferentNumbers.map(Number);
        diceOutcomeThreeDifferentNumbers = threeDifferentNumbersValue;
      }

      // Save dice outcomes in the ResultK3 model
      const K3Results = new K3Result({
        timerName: timerName,
        periodId: periodId,
        totalSum: winningNumberTotalSum,
        size:
          winningNumberTotalSum >= 3 && winningNumberTotalSum <= 10
            ? "Small"
            : "Big",
        parity: winningNumberTotalSum % 2 === 0 ? "Even" : "Odd",
        diceOutcome: [diceOutcomeD1, diceOutcomeD2, diceOutcomeD3],
        twoSameOneDifferent: diceOutcomeTwoSameOneDifferent,
        threeSame: diceOutcomeThreeSame,
        threeDifferentNumbers: diceOutcomeThreeDifferentNumbers,
      });
      await K3Results.save();
      console.log(`K3 Timer ${timerName} & ${periodId} ended.`);

      // Process user bets
      if (userBets.length === 0) {
        console.log(`No bets for ${timerName} & ${periodId}`);
      } else {
        console.log(`Processing bets for ${timerName} & ${periodId}`, userBets);
      }
      for (let bet of userBets) {
        let userWon = false;
        let winAmount = 0;

        // Check if user's bet matches the winning number
        if (
          bet.selectedItem === "totalSum" &&
          bet.totalSum === winningNumberTotalSum
        ) {
          userWon = true;
          winAmount = bet.betAmount * bet.multiplier;
        }

        // Check if user's bet matches the twoSameOneDifferent outcome
        if (
          bet.selectedItem === "twoSameOneDifferent" &&
          diceOutcomeTwoSameOneDifferent
        ) {
          const twoSameOneDifferentValue = bet.twoSameOneDifferent.map(Number);
          if (
            (diceOutcomeTwoSameOneDifferent[0] ===
              twoSameOneDifferentValue[0] &&
              diceOutcomeTwoSameOneDifferent[1] ===
                twoSameOneDifferentValue[0] &&
              diceOutcomeTwoSameOneDifferent[2] ===
                twoSameOneDifferentValue[1]) ||
            (diceOutcomeTwoSameOneDifferent[0] ===
              twoSameOneDifferentValue[0] &&
              diceOutcomeTwoSameOneDifferent[1] ===
                twoSameOneDifferentValue[1] &&
              diceOutcomeTwoSameOneDifferent[2] ===
                twoSameOneDifferentValue[0]) ||
            (diceOutcomeTwoSameOneDifferent[0] ===
              twoSameOneDifferentValue[1] &&
              diceOutcomeTwoSameOneDifferent[1] ===
                twoSameOneDifferentValue[0] &&
              diceOutcomeTwoSameOneDifferent[2] ===
                twoSameOneDifferentValue[0])
          ) {
            userWon = true;
            winAmount = bet.betAmount * bet.multiplier;
          }
        }

        // Check if user's bet matches the threeSame outcome
        if (bet.selectedItem === "threeSame" && diceOutcomeThreeSame) {
          const threeSameValue = bet.threeSame;
          if (
            diceOutcomeThreeSame[0] === threeSameValue &&
            diceOutcomeThreeSame[1] === threeSameValue &&
            diceOutcomeThreeSame[2] === threeSameValue
          ) {
            userWon = true;
            winAmount = bet.betAmount * bet.multiplier;
          }
        }

        // Check if user's bet matches the threeDifferentNumbers outcome
        if (
          bet.selectedItem === "threeDifferentNumbers" &&
          diceOutcomeThreeDifferentNumbers
        ) {
          const threeDifferentNumbersValue = bet.threeDifferentNumbers.map(Number);
          if (
            threeDifferentNumbersValue.includes(diceOutcomeThreeDifferentNumbers[0]) &&
            threeDifferentNumbersValue.includes(diceOutcomeThreeDifferentNumbers[1]) &&
            threeDifferentNumbersValue.includes(diceOutcomeThreeDifferentNumbers[2]) &&
            new Set(threeDifferentNumbersValue).size === 3
          ) {
            userWon = true;
            winAmount = bet.betAmount * bet.multiplier;
          }
        }

        if (userWon) {
          const user = await User.findById(bet.user);
          if (user) {
            user.walletAmount += winAmount;
            await user.save();
            bet.winLoss = "win";
            bet.status = "won";
          }
        } else {
          bet.winLoss = "loss";
          bet.status = "lost";
        }
        await bet.save();
      }
    }, interval * 60 * 1000);
    console.log(`K3 Timer ${timerName} & ${periodId} started.`);
  };

  const job = cron.schedule(cronInterval, jobFunction);
  job.start();
};

const calculateRemainingTime2 = (periodId, minutes) => {
  const endtime = moment(periodId, "YYYYMMDDHHmmss").add(minutes, "minutes");
  const now = moment();
  const diff = endtime.diff(now, "seconds");
  return diff > 0 ? diff : 0;
};

module.exports = {
  createTimer2,
  getLatestPeriodId2,
  calculateRemainingTime2,
  secondsToHms2,
};
