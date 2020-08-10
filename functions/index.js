const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const fs = require('fs');
const util = require('util');
const clone = require('rfdc')();
admin.initializeApp();

exports.matchingAlgo = functions.https.onCall(async (data, context) => {

  //File Operations
  await fetchFile()
  console.log("check 0");
  const scenariosFromFile = readFile()
  //End File Operations
  console.log("file read 2");

  const uid = context.auth.uid;
  if (uid == null) {
    console.log("User not authenticated.");
    return;
  }

  console.log("check 1");

  const usersRef = admin.firestore().collection("users");
  const studentRef = usersRef.doc(uid);
  const studentDoc = await studentRef.get();

  console.log("check 2");

  const mentorsQuery = await usersRef.where("accountType", "==", "mentor").get();

  console.log("check 4");

  for (let mentorDoc of mentorsQuery.docs) {
    console.log("check 4.1");
    let scenarios = clone(scenariosFromFile);
    console.log("check 4.2");
    let relativeWeight = 0;
    console.log("check 4.3");
    console.log("check 5");

    for (let scenario of scenarios) {
      //Replace Relative Variables
      console.log("check 5.1");
      for (let i = 0; i < scenario.length; i++) {
        console.log("check 5.2");
        let splitItem = scenario[i].split(" ");
        console.log("check 5.3");
        if (splitItem[0] == "$MENTOR") {
          scenario[i] = mentorDoc[splitItem[1]];
        }
        else if (splitItem[0] == "$STUDENT") {
          scenario[i] = studentDoc[splitItem[1]];
        }
        console.log("check 5.4");
      }

      console.log("check 6");

      let mentorKeys = scenario[0].split(" && ");
      let mentorValues = scenario[1].split(" && ");
      let studentKeys = scenario[2].split(" && ");
      let studentValues = scenario[3].split(" && ");

      console.log("check 7");

      if (passesChecks(mentorKeys, mentorValues, mentorDoc) && passesChecks(studentKeys, studentValues, studentDoc)) {
        relativeWeight += parseInt(scenario[4]);
      }
    }
    mentorDoc.relativeWeight = relativeWeight
  }

  console.log("check 8");

  mentorsQuery.docs.sort((a, b) => (a.relativeWeight > b.relativeWeight) ? 1 : -1);

  console.log("check 9");

  let highestWeightMentor = mentorsQuery.docs[mentorsQuery.docs.length-1];

  console.log("UID: " + highestWeightMentor.id + " RELATIVE_WEIGHT: "+ highestWeightMentor.relativeWeight)

});

async function fetchFile() {
  const fileWriteStream = fs.createWriteStream("PeerGC-Matching-Algorithm-Matrix.csv");
  return new Promise ((resolve, reject) => {
    https.get("https://docs.google.com/spreadsheets/d/1gndunHC6Ch7F9K_NkhE6OhzpEG9zr0eiIoHjuPsqwOQ/gviz/tq?tqx=out:csv&sheet=PeerGC-Matching-Algorithm.CONFIG", async function (response) {
      response.pipe(fileWriteStream);
      fileWriteStream.on('finish', function() {
        fileWriteStream.close();
        resolve();
      });
    });
  });
}

function readFile() {
  const buffer = fs.readFileSync("PeerGC-Matching-Algorithm-Matrix.csv");
  const data = buffer.toString()
  let lines = data.split("\n");
  let scenariosFromFile = [];

  for (let i = 1; i < lines.length; i++) {
    let line = lines[i];
    let lineSplit = line.replace(/"/g, "").split(",");
    scenariosFromFile.push(lineSplit);
  }

  return scenariosFromFile;
}

function passesChecks(keys, values, document) {
  let checksPassed = 0

  for (let i = 0; i < keys.length; i++) {
    let validValues = values[i].split(" || ");

    for (let validValue of validValues) {
      if (document[keys[i]] == validValue) {
        checksPassed++;
      }
    }
  }
  return checksPassed == keys.length;
}
