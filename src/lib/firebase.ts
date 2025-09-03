
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set } from "firebase/database";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyA3BcsYHFGcwgsNp8-p0U5HXZeAIMiYR0Q",
  authDomain: "bitsim-realtrade.firebaseapp.com",
  databaseURL: "https://bitsim-realtrade-default-rtdb.firebaseio.com",
  projectId: "bitsim-realtrade",
  storageBucket: "bitsim-realtrade.firebasestorage.app",
  messagingSenderId: "475728173031",
  appId: "1:475728173031:web:63e0e891c6651bf96ecf42"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);

// Get a messaging instance.
export const messaging = (async () => {
    if (typeof window !== 'undefined') {
        const { getMessaging } = await import('firebase/messaging');
        return getMessaging(app);
    }
    return null;
})();


export const getMessagingToken = async () => {
    let currentToken = '';
    if (!messaging) return;

    try {
        const messagingInstance = await messaging;
        if (messagingInstance) {
            const status = await Notification.requestPermission();
            if (status && status === 'granted') {
                currentToken = await getToken(messagingInstance, {
                    vapidKey: process.env.NEXT_PUBLIC_FCM_VAPID_KEY,
                });
                
                if (currentToken) {
                    // Save the token to the Realtime Database
                    const username = localStorage.getItem('username');
                    if(username) {
                        const tokenRef = ref(db, `fcmTokens/${username}`);
                        await set(tokenRef, currentToken);
                    }
                }
            }
        }
    } catch (error) {
        console.error('An error occurred while retrieving token. ', error);
    }

    return currentToken;
};
