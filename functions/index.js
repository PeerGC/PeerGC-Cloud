const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

//Start matchStudentToMentors
exports.matchStudentToMentors = functions.https.onCall(async (data, context) => {

  functions.logger.log("function called")

  //File Operations
  const scenariosFromFile = await fetchAndReadAlgorithmMatrix();
  //End File Operations

  functions.logger.log("check 0")

  const uid = data.uid; //LOCAL DEV: const uid = data.uid; PROD: const uid = context.auth.uid;
  functions.logger.log("uid: " + "\"" + uid + "\"")
  if (uid == null) {
    functions.logger.log("User not authenticated.");
    return;
  }

  functions.logger.log("check 0.1")
  const usersRef = admin.firestore().collection("Users");
  functions.logger.log("check 0.2")
  const studentRef = usersRef.doc(uid);
  functions.logger.log("check 0.3")
  const studentDoc = await studentRef.get();
  functions.logger.log("check 0.4")
  const mentorDocToRelativeWeight = []
  functions.logger.log("check 0.5")
  const mentorsQuery = await usersRef.where("Account_Type", "==", "mentor").get();

  functions.logger.log("Check 1")

  for (let mentorDoc of mentorsQuery.docs) {
    let scenarios = clone(scenariosFromFile);
    let relativeWeight = 0;

    functions.logger.log("Check 2")

    for (let scenario of scenarios) {
      //Replace Relative Variables
      for (let i = 0; i < scenario.length; i++) {
        let splitItem = scenario[i].split(" ");
        functions.logger.log(splitItem)
        if (splitItem[0] == "$MENTOR") {
          scenario[i] = mentorDoc.data()[splitItem[1]];
          functions.logger.log(scenario[i])
        }
        else if (splitItem[0] == "$STUDENT") {
          scenario[i] = studentDoc.data()[splitItem[1]];
          functions.logger.log(scenario[i])
        }
      }

      functions.logger.log("Check 3")

      let mentorKeys = scenario[0].split(" && ");
      let mentorValues = scenario[1].split(" && ");
      let studentKeys = scenario[2].split(" && ");
      let studentValues = scenario[3].split(" && ");

      functions.logger.log("Check 4")

      if (passesChecks(mentorKeys, mentorValues, mentorDoc) && passesChecks(studentKeys, studentValues, studentDoc)) {
        relativeWeight += parseInt(scenario[4]);
      }
    }

    mentorDocToRelativeWeight.push({mentorDoc: mentorDoc, relativeWeight: relativeWeight});
  }

  functions.logger.log("Check 5")

  mentorDocToRelativeWeight.sort((a, b) => (a.relativeWeight < b.relativeWeight) ? 1 : -1);

  functions.logger.log(mentorDocToRelativeWeight.length)
  functions.logger.log("Check 6")

  let highestWeightMentor = mentorDocToRelativeWeight[0];
  let highestWeightNonWhiteMentor;
  let highestWeightNonMaleMentor;

  functions.logger.log(highestWeightMentor)

  functions.logger.log("Check 7")

  for (let entry of mentorDocToRelativeWeight) {
    functions.logger.log("Check 7.1")
    if (entry !== highestWeightMentor && entry !== highestWeightNonWhiteMentor && entry !== highestWeightNonMaleMentor) {
      functions.logger.log("Check 7.2")
      if (entry.mentorDoc.data().Race !== "white") {
        functions.logger.log("Check 7.3")
        highestWeightNonWhiteMentor = entry;
      }
      else if (entry.mentorDoc.data().Gender !== "male") {
        functions.logger.log("Check 7.4")
        highestWeightNonMaleMentor = entry;
      }
      if (highestWeightNonWhiteMentor !== undefined && highestWeightNonMaleMentor !== undefined) {
        functions.logger.log("Check 7.5")
        break;
      }
    }
  }

  functions.logger.log(highestWeightMentor.mentorDoc.id)
  functions.logger.log(highestWeightNonWhiteMentor.mentorDoc.id)
  functions.logger.log(highestWeightNonMaleMentor.mentorDoc.id)

  functions.logger.log("Check 9")

  if (highestWeightNonMaleMentor === undefined) {
    for (let entry of mentorDocToRelativeWeight) {
      if (entry !== highestWeightMentor && entry !== highestWeightNonWhiteMentor && entry !== highestWeightNonMaleMentor) {
        highestWeightNonMaleMentor = entry;
        break;
      }

//Start matchStudentToMentors Helper Methods
async function match(studentDoc, mentorBundle, usersRef) {
  functions.logger.log("check 11.1")
  await usersRef.doc(studentDoc.id).collection("Allow_List").doc(mentorBundle.mentorDoc.id).set({"Match_Weight": mentorBundle.relativeWeight});
  functions.logger.log("check 11.2")
  await usersRef.doc(mentorBundle.mentorDoc.id).collection("Allow_List").doc(studentDoc.id).set({"Match_Weight": mentorBundle.relativeWeight});
  functions.logger.log("check 11.3")
  //return notifyOfMatch(mentorBundle.mentorDoc);
  functions.logger.log("matched!")
}

function passesChecks(keys, values, document) {
  let checksPassed = 0

  for (let i = 0; i < keys.length; i++) {
    let validValues = values[i].split(" || ");

    for (let validValue of validValues) {
      if (document.data()[keys[i]] === validValue) {
        checksPassed++;
      }
    }
  }
  return checksPassed === keys.length;
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
//End matchStudentToMentors Helper Methods
//End matchStudentToMentors

//Start Notification Utilities
async function notifyOfMatch(doc) {
  const title = "Hey, you've got a new peer!"
  const body = "Hey there. We just wanted to let you know that our matching algorithm has found you a new peer! Open up the PeerGC app to check it out."

  const userEmail = (await admin.auth.getUser(doc.id)).email;
  const userToken = (doc.token)

  await emailNotification(userEmail, title, body);
  await pushNotification(userToken, title, body);
}

async function pushNotification(token, title, body) {
  const message = {
    token: token,
    notification: {
      title: title,
      body: body
    }
  };
  return admin.messaging().send(message);
}

async function emailNotification(to, subject, body) {
  const email = "peergc.notifications@gmail.com"
  //Fetch Password From Google Cloud Secrets
  const client = new SecretManagerServiceClient();
  const [version] = await client.accessSecretVersion({
    name: "projects/loremipsum-ab1fd/secrets/NOTIFICATIONS-EMAIL-PASSWORD/versions/latest"
  });
  const password = version.payload.data.toString();
  //End Fetch Password From Google Cloud Secrets

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: email,
      pass: password
    }
  });

  const mailOptions = {
    from: email,
    to: to,
    subject: subject,
    text: body
  };

  await transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      functions.logger.log(error);
    } else {
      functions.logger.log('Email sent: ' + info.response);
    }
  });
}
