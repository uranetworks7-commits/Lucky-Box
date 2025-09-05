
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase, ref, set, push, query, orderByChild, equalTo, get } from "firebase/database";
import { getMessaging, getToken } from "firebase/messaging";
import type { UserData } from "@/types";

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


export const createUserIfNotExists = async (username: string): Promise<string> => {
    const usersRef = ref(db, 'users');
    const userQuery = query(usersRef, orderByChild('username'), equalTo(username));
    const snapshot = await get(userQuery);

    if (snapshot.exists()) {
        // User exists, return their key (ID)
        return Object.keys(snapshot.val())[0];
    } else {
        // User does not exist, create them
        const newUserRef = push(usersRef);
        const newUser: UserData = {
            user_id: newUserRef.key!,
            username: username,
            xp: 500, // Set default XP to 500 for new users
        };
        await set(newUserRef, newUser);
        return newUserRef.key!;
    }
};
