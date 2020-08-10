const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const fs = require('fs');
const clone = require('rfdc')();
admin.initializeApp();

exports.setCards = functions.https.onCall(async (data, context) => {
  const uid = context.auth.uid;
  if (uid == null) {
    console.log("User not authenticated.");
    return;
  }

  const usersRef = admin.firestore().collection("users");
  const studentRef = usersRef.doc(uid);
  const studentDoc = await studentRef.get();

  const mentorsQuery = await usersRef.where("accountType", "==", "mentor").get();
  const fileScenarios = parseFile();

  for (let mentorDoc of mentorsQuery.docs) {
    let scenarios = clone(fileScenarios);
    let relativeWeight = 0;

    for (let scenario of scenarios) {
      //Replace Relative Variables
      for (let i = 0; i < scenario.length; i++) {
        let splitItem = scenario[i].split(" ");
        if (splitItem[0] == "$MENTOR") {
          scenario[i] = mentorDoc[splitItem[1]];
        }
        else if (splitItem[0] == "$STUDENT") {
          scenario[i] = studentDoc[splitItem[1]];
        }
      }

      let mentorKeys = scenario[0].split(" && ");
      let mentorValues = scenario[1].split(" && ");
      let studentKeys = scenario[2].split(" && ");
      let studentValues = scenario[3].split(" && ");

      if (passsesChecks(mentorKeys, mentorValues, mentorDoc) && passsesChecks(studentKeys, studentValues, studentDoc)) {
        mentorDoc.relativeWeight = scenario[4];
      }
    }
  }

  mentorsQuery.docs.sort((a, b) => (a.relativeWeight > b.relativeWeight) ? 1 : -1);

  let highestWeightMentor = mentorsQuery.docs[mentorsQuery.docs.length-1];

  console.log("UID: " + highestWeightMentor.id + " RELATIVE_WEIGHT: "+ highestWeightMentor.relativeWeight)
});

function passsesChecks(keys, values, document) {
  let checksPassed = 0

  for (let i = 0; i < keys.length; i++) {
    let validValues = values[i].split(" || ");

    for (let validValue of validValues) {
      if (document[keys[i]] == validValue) {
        checksPassed++;
      }
    }
  }
  if (checksPassed == keys.length) {
    return true
  }
  else {
    return false
  }
}

function parseFile() {
  const file = fs.createWriteStream("PeerGC-Matching-Algorithm-Matrix.csv");
  https.get("https://docs.google.com/spreadsheets/d/1gndunHC6Ch7F9K_NkhE6OhzpEG9zr0eiIoHjuPsqwOQ/gviz/tq?tqx=out:csv&sheet=PeerGC-Matching-Algorithm.CONFIG", function(response) {
    response.pipe(file);
    file.on('finish', function() {
      file.close();
      parseFile();
    });
  });

  fs.readFile("PeerGC-Matching-Algorithm-Matrix.csv", {encoding: 'utf8'}, function(err, data) {
    let lines = data.split("\n");
    let scenarios = [];

    for (let i = 1; i < lines.length; i++) {
      let line = lines[i];
      let lineSplit = line.replace(/"/g, "").split(",");
      scenarios.push(lineSplit);
    }

    return scenarios;
  });
}
