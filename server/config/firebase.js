const admin = require('firebase-admin');

const serviceAccount = require('path-to-your-service-account-file.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'your-firebase-storage-bucket-url',
});

const bucket = admin.storage().bucket();

module.exports = bucket;