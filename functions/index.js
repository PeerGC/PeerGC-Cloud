const functions = require('firebase-functions');
const admin = require('firebase-admin');
const https = require('https');
const toString = require('stream-to-string')
const clone = require('rfdc')();
admin.initializeApp();

exports.matchStudentToMentors = functions.https.onCall(async (data, context) => {

  //File Operations
  const scenariosFromFile = await fetchAndReadAlgorithmMatrix();
  //End File Operations

  const uid = context.auth.uid; //LOCAL DEV: const uid = data.uid; PROD: const uid = context.auth.uid;
  if (uid == null) {
    console.log("User not authenticated.");
    return;
  }


  const usersRef = admin.firestore().collection("users");
  const studentRef = usersRef.doc(uid);
  const studentDoc = await studentRef.get();
  const mentorDocToRelativeWeight = []
  const mentorsQuery = await usersRef.where("accountType", "==", "mentor").get();

  for (let mentorDoc of mentorsQuery.docs) {
    let scenarios = clone(scenariosFromFile);
    let relativeWeight = 0;

    for (let scenario of scenarios) {
      //Replace Relative Variables
      for (let i = 0; i < scenario.length; i++) {
        let splitItem = scenario[i].split(" ");
        if (splitItem[0] == "$MENTOR") {
          scenario[i] = mentorDoc.data()[splitItem[1]];
        }
        else if (splitItem[0] == "$STUDENT") {
          scenario[i] = studentDoc.data()[splitItem[1]];
        }
      }

      let mentorKeys = scenario[0].split(" && ");
      let mentorValues = scenario[1].split(" && ");
      let studentKeys = scenario[2].split(" && ");
      let studentValues = scenario[3].split(" && ");

      if (passesChecks(mentorKeys, mentorValues, mentorDoc) && passesChecks(studentKeys, studentValues, studentDoc)) {
        relativeWeight += parseInt(scenario[4]);
      }
    }

    mentorDocToRelativeWeight.push({mentorDoc: mentorDoc, relativeWeight: relativeWeight});
  }

  mentorDocToRelativeWeight.sort((a, b) => (a.relativeWeight < b.relativeWeight) ? 1 : -1);

  let highestWeightMentor = mentorDocToRelativeWeight[0];
  let highestWeightNonWhiteMentor;
  let highestWeightNonMaleMentor;

  for (let entry of mentorDocToRelativeWeight) {
    if (entry !== highestWeightMentor && entry !== highestWeightNonWhiteMentor && entry !== highestWeightNonMaleMentor) {
      if (entry.mentorDoc.data().race !== "white") {
        highestWeightNonWhiteMentor = entry;
      }
      else if (entry.mentorDoc.data().gender !== "male") {
        highestWeightNonMaleMentor = entry;
      }
      if (highestWeightNonWhiteMentor !== undefined && highestWeightNonMaleMentor !== undefined) {
        break;
      }
    }
  }

  if (highestWeightNonWhiteMentor === undefined) {
    for (let entry of mentorDocToRelativeWeight) {
      if (entry !== highestWeightMentor && entry !== highestWeightNonWhiteMentor && entry !== highestWeightNonMaleMentor) {
        highestWeightNonWhiteMentor = entry;
        break;
      }
    }
  }

  if (highestWeightNonMaleMentor === undefined) {
    for (let entry of mentorDocToRelativeWeight) {
      if (entry !== highestWeightMentor && entry !== highestWeightNonWhiteMentor && entry !== highestWeightNonMaleMentor) {
        highestWeightNonMaleMentor = entry;
        break;
      }
    }
  }

  if (highestWeightMentor !== undefined) {
    await match(studentDoc, highestWeightMentor, usersRef);
  }

  if (highestWeightNonWhiteMentor !== undefined) {
    await match(studentDoc, highestWeightNonWhiteMentor, usersRef);
  }

  if (highestWeightNonMaleMentor !== undefined) {
    await match(studentDoc, highestWeightNonMaleMentor, usersRef);
  }

});

async function pushNotification(token, title, body) {
  const message = {
    token: token,
    notification: {
      title: title,
      body: body
    }
  };

  return admin.messaging().send(message)
}

async function match(studentDoc, mentorBundle, usersRef) {
  await usersRef.doc(studentDoc.id).collection("allowList").doc(mentorBundle.mentorDoc.id).set({"matchWeight": mentorBundle.relativeWeight});
  await usersRef.doc(mentorBundle.mentorDoc.id).collection("allowList").doc(studentDoc.id).set({"matchWeight": mentorBundle.relativeWeight});
}

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

pushNotification("cmu32orCrkMmpJoCQNn_Jz:APA91bEU-IsGt4Bwfd1n-7mJ3qzbyEizMBVBeCGz-HaFx6QfBXw2qCgt-MZMsXGIstB3ht1WMsD0usVe0i4KL7FGMs171ekpgeGCtkOrXpQK6pJyP5SFzKhW83jvkFfKE_KeQ94vlgeK", "Test Push Notif", "Test Message Body.").then((result) => {console.log(result)}).catch((error) => {console.log(error)})