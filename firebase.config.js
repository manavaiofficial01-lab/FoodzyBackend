const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

try {
  const serviceAccountPath = path.join(__dirname, 'foodzy-firebase-adminsdk.json');
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: 'manavai-2adb5.firebasestorage.app'
      });
      console.log('Firebase Admin SDK initialized successfully in firebase.config.js');
    }
  } else {
    console.warn('Firebase service account file (foodzy-firebase-adminsdk.json) not found in firebase.config.js.');
  }
} catch (error) {
  console.error('Error initializing Firebase in firebase.config.js:', error.message);
}

module.exports = admin;
