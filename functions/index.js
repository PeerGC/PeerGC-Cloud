const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

// Create and Deploy Your First Cloud Functions
// https://firebase.google.com/docs/functions/write-firebase-functions

// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
//
// const admin = require("firebase-admin")
// const firestore = admin.firestore()
// exports.getLatestPosts =
// functions.https.onRequest(async (req, res) => {
//     const snapshot = await firestore
//         .collection("users")
//         .orderBy("lastModified", "desc")
//         .limit(100)
//         .get()
//     res.send(snapshot.docs.map(doc => doc.data()))
// })

//admin.initializeApp();

exports.setCards = functions.https.onCall(async (data) => {

  console.log("Host User ID: " + data.uid)

  const usersRef = admin.firestore().collection("users")
  const docRef = usersRef.doc(data.uid)
  const uidDoc = await docRef.get();

  const accountType = uidDoc.data().accountType;
  const value = uidDoc.data().value;
  const gender = uidDoc.data().gender;
  const interest = uidDoc.data().interest;
  const race = uidDoc.data().race;

  var otherAccountType;

  if (accountType == "Tutor") {
    otherAccountType = "Student";
  }

  else if (accountType == "Student") {
    otherAccountType = "Tutor";
  }

  var amtPerUser = 3;
  const doubleMax = value + 10000;
  const doubleMin = value - 10000;
  var liveWhiteList = []

  // Start Query1
  const query1 = await usersRef
  .where("accountType", "==", otherAccountType)
  .where("gender", "==", gender)
  .where("interest", "==", interest)
  .where("race", "==", race)
  .where("value", "<", doubleMax)
  .where("value", ">", doubleMin)
  .orderBy("value")
  .limit(amtPerUser)
  .get();

  for(doc of query1.docs) {
    console.log("QUERY 1: " + doc.id);
    if(!liveWhiteList.includes(doc.id)) {
      const updateCurrentUserDocWhitelist = await docRef.collection("whitelist").doc(doc.id).set({});
      const updateRemoteUserDocWhitelist = await usersRef.doc(doc.id).collection("whitelist").doc(data.uid).set({});
      liveWhiteList.push(doc.id);
      amtPerUser--;
    }
  }

  if (amtPerUser <= 0) {
    return { success: true };
  }
  // End Query1

  // Start Query2
  const query2 = await usersRef
  .where("accountType", "==", otherAccountType)
  .where("interest", "==", interest)
  .where("race", "==", race)
  .where("value", "<", doubleMax)
  .where("value", ">", doubleMin)
  .orderBy("value")
  .limit(amtPerUser)
  .get();

  for(doc of query2.docs) {
    console.log("QUERY 2: " + doc.id);
    if(!liveWhiteList.includes(doc.id)) {
      const updateCurrentUserDocWhitelist = await docRef.collection("whitelist").doc(doc.id).set({});
      const updateRemoteUserDocWhitelist = await usersRef.doc(doc.id).collection("whitelist").doc(data.uid).set({});
      liveWhiteList.push(doc.id);
      amtPerUser--;
    }
  }

  if (amtPerUser <= 0) {
    return { success: true };
  }
  // End Query2

  // Start Query3
  const query3 = await usersRef
  .where("accountType", "==", otherAccountType)
  .where("interest", "==", interest)
  .where("value", "<", doubleMax)
  .where("value", ">", doubleMin)
  .orderBy("value")
  .limit(amtPerUser)
  .get();

  for(doc of query3.docs) {
    console.log("QUERY 3: " + doc.id);
    if(!liveWhiteList.includes(doc.id)) {
      const updateCurrentUserDocWhitelist = await docRef.collection("whitelist").doc(doc.id).set({});
      const updateRemoteUserDocWhitelist = await usersRef.doc(doc.id).collection("whitelist").doc(data.uid).set({});
      liveWhiteList.push(doc.id);
      amtPerUser--;
    }
  }

  if (amtPerUser <= 0) {
    return { success: true };
  }
  // End Query3

  // Start Query4
  const query4 = await usersRef
  .where("accountType", "==", otherAccountType)
  .where("value", "<", doubleMax)
  .where("value", ">", doubleMin)
  .orderBy("value")
  .limit(amtPerUser)
  .get();

  for(doc of query4.docs) {
    console.log("QUERY 4: " + doc.id);
    if(!liveWhiteList.includes(doc.id)) {
      const updateCurrentUserDocWhitelist = await docRef.collection("whitelist").doc(doc.id).set({});
      const updateRemoteUserDocWhitelist = await usersRef.doc(doc.id).collection("whitelist").doc(data.uid).set({});
      liveWhiteList.push(doc.id);
      amtPerUser--;
    }
  }

  if (amtPerUser <= 0) {
    return { success: true };
  }
  // End Query4

  // Start Query5
  const query5 = await usersRef
  .where("accountType", "==", otherAccountType)
  .orderBy("value")
  .limit(amtPerUser)
  .get();

  for(doc of query5.docs) {
    console.log("QUERY 5: " + doc.id);
    if(!liveWhiteList.includes(doc.id)) {
      const updateCurrentUserDocWhitelist = await docRef.collection("whitelist").doc(doc.id).set({});
      const updateRemoteUserDocWhitelist = await usersRef.doc(doc.id).collection("whitelist").doc(data.uid).set({});
      liveWhiteList.push(doc.id);
      amtPerUser--;
    }
  }

  if (amtPerUser <= 0) {
    return { success: true };
  }
  // End Query5

  console.log("REMAINING: " + amtPerUser);

  return { success: false };

});
