// This file must be in the public folder.

importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.2.0/firebase-messaging-compat.js");

const firebaseConfig = {
  apiKey: "AIzaSyA3BcsYHFGcwgsNp8-p0U5HXZeAIMiYR0Q",
  authDomain: "bitsim-realtrade.firebaseapp.com",
  databaseURL: "https://bitsim-realtrade-default-rtdb.firebaseio.com",
  projectId: "bitsim-realtrade",
  storageBucket: "bitsim-realtrade.firebasestorage.app",
  messagingSenderId: "475728173031",
  appId: "1:475728173031:web:63e0e891c6651bf96ecf42"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  // Customize notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
