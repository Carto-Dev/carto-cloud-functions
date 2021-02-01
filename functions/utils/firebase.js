const admin = require('firebase-admin');

exports.getFirestoreDocsById = async (ids, collection) => {
  const firestoreDB = admin.firestore();

  const firestoreDocs = await firestoreDB
    .collection(collection)
    .where(admin.firestore.FieldPath.documentId(), 'in', ids)
    .get();

  return firestoreDocs.docs.map((doc) => doc.data());
};
