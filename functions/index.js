const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

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
//test change
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


  return { success: false };

});
