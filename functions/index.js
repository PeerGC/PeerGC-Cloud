const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const toString = require('stream-to-string')
const clone = require('rfdc')();
admin.initializeApp();

exports.matchingAlgo = functions.https.onCall(async (data, context) => {

  //File Operations
  const scenariosFromFile = await fetchAndReadAlgorithmMatrix();
  //End File Operations

  const uid = data.uid
  if (uid == null) {
    console.log("User not authenticated.");
    return;
  }

  console.log("check 1");

  const usersRef = admin.firestore().collection("users");
  console.log("check 1.1");
  const studentRef = usersRef.doc(uid);
  console.log("check 1.2");
  const studentDoc = await studentRef.get();

  const uidToRelativeWeight = []

  console.log("check 2");

  const mentorsQuery = await usersRef.where("accountType", "==", "mentor").get();

  console.log(mentorsQuery.size);
  console.log("check 4");

  for (let mentorDoc of mentorsQuery.docs) {
    console.log(mentorDoc.id);
    console.log("check 4.1");
    let scenarios = clone(scenariosFromFile);
    console.log("check 4.2");
    let relativeWeight = 0;
    console.log("check 4.3");
    console.log("check 5");

    for (let scenario of scenarios) {
      //Replace Relative Variables
      console.log(scenario);
      console.log("check 5.1");
      for (let i = 0; i < scenario.length; i++) {
        console.log("check 5.2");
        let splitItem = scenario[i].split(" ");
        console.log("check 5.3");
        if (splitItem[0] == "$MENTOR") {
          console.log(splitItem);
          scenario[i] = mentorDoc.data()[splitItem[1]];
        }
        else if (splitItem[0] == "$STUDENT") {
          scenario[i] = studentDoc.data()[splitItem[1]];
        }
        console.log("check 5.4");
      }

      console.log("check 6");
      console.log(scenario);

      let mentorKeys = scenario[0].split(" && ");
      console.log("check 6.1");
      let mentorValues = scenario[1].split(" && ");
      console.log("check 6.2");
      let studentKeys = scenario[2].split(" && ");
      console.log("check 6.3");
      let studentValues = scenario[3].split(" && ");
      console.log("check 6.4");

      console.log("check 7");

      if (passesChecks(mentorKeys, mentorValues, mentorDoc) && passesChecks(studentKeys, studentValues, studentDoc)) {
        relativeWeight += parseInt(scenario[4]);
      }
    }

    console.log("RELATIVE WEIGHT FOR " + mentorDoc.id + " = " + relativeWeight);
    uidToRelativeWeight.push({uid: mentorDoc.id, relativeWeight: relativeWeight});
  }

  console.log("check 8");

  uidToRelativeWeight.sort((a, b) => (a.relativeWeight > b.relativeWeight) ? 1 : -1);

  console.log("check 9");

  let highestWeightMentor = uidToRelativeWeight[uidToRelativeWeight.length-1];

  console.log("UID: " + highestWeightMentor.uid + " RELATIVE_WEIGHT: " + highestWeightMentor.relativeWeight)
});

function passesChecks(keys, values, document) {
  let checksPassed = 0

  for (let i = 0; i < keys.length; i++) {
    let validValues = values[i].split(" || ");

    for (let validValue of validValues) {
      if (document.data()[keys[i]] == validValue) {
        checksPassed++;
      }
    }
  }
  return checksPassed == keys.length;
}

async function fetchAndReadAlgorithmMatrix() {
  return new Promise((resolve) => {
    https.get("https://docs.google.com/spreadsheets/d/1gndunHC6Ch7F9K_NkhE6OhzpEG9zr0eiIoHjuPsqwOQ/gviz/tq?tqx=out:csv&sheet=PeerGC-Matching-Algorithm.CONFIG", async function (response) {
      toString(response, function (err, msg) {
        let lines = msg.split("\n");
        let scenariosFromFile = [];

        for (let i = 1; i < lines.length; i++) {
          let line = lines[i];
          let lineSplit = line.replace(/"/g, "").split(",");
          scenariosFromFile.push(lineSplit);
        }
        resolve(scenariosFromFile);
      })
    });
  });
}