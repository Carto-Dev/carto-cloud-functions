const functions = require('firebase-functions');
const admin = require('firebase-admin');
const algoliaSearch = require('algoliasearch');
const algoliaKeys = require('./keys/algolia');
const firebaseUtils = require('./utils/firebase');

// Initializing firebase admin.
admin.initializeApp();

// Initializing algolia client.
const algoliaClient = algoliaSearch(
  algoliaKeys.applicationId,
  algoliaKeys.adminKey
);

/**
 * Sync newly added data with Algolia to enable searching
 * on the main mobile app itself.
 */
exports.onProductCreated = functions.firestore
  .document('products/{productId}')
  .onCreate((snapshot, context) => {
    const product = snapshot.data();
    const productId = snapshot.id;

    // Preparing object to be stored on algolia.
    const algoliaProduct = {
      objectID: productId,
      title: product.title,
      description: product.description,
      categories: product.categories,
      price: product.cost,
    };

    // Preparing algolia index.
    const index = algoliaClient.initIndex(algoliaKeys.indexName);

    // Saving the object.
    return index.saveObject(algoliaProduct);
  });

/**
 * Sync any changes made to any previously existing product
 * with Algolia.
 */
exports.onProductUpdated = functions.firestore
  .document('products/{productId}')
  .onUpdate((change, context) => {
    const updatedProduct = change.after.data();
    const productId = change.before.id;

    // Preparing object to be updated on algolia.
    const algoliaProduct = {
      objectID: productId,
      title: updatedProduct.title,
      description: updatedProduct.description,
      categories: updatedProduct.categories,
      price: updatedProduct.cost,
    };

    // Preparing algolia index.
    const index = algoliaClient.initIndex(algoliaKeys.indexName);

    // Saving the object.
    return index.saveObject(algoliaProduct);
  });

/**
 * When a product is deleted from firebase, delete
 * it from Algolia as well
 */
exports.onProductDeleted = functions.firestore
  .document('products/{productId}')
  .onDelete((snapshot, context) => {
    const deletedProductId = snapshot.id;

    // Preparing algolia index.
    const index = algoliaClient.initIndex(algoliaKeys.indexName);

    // Saving the object.
    return index.deleteObject(deletedProductId);
  });

/**
 * Actual searching mechanism. First query the algolia database
 * for ids and run it through firestore to get the actual data.
 */
exports.searchForProducts = functions.https.onRequest(async (req, res) => {
  // Getting the search query
  const searchQuery = req.query.searchQuery;

  // Initializing Algolia.
  const index = algoliaClient.initIndex(algoliaKeys.indexName);

  // Searching across Algolia database.
  const search = (await index.search(searchQuery)).hits;

  // Getting specific ids to fetch from firestore.
  const objectIds = search.map((result) => result.objectID);

  // Fetching documents from firestore.
  const searchResult = await firebaseUtils.getFirestoreDocsById(
    objectIds,
    'products'
  );

  // Sending the data to client.
  res.send(searchResult);
});
