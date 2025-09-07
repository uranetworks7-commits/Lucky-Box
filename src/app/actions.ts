
'use server';

import { assignWinnerCode, type AssignWinnerCodeInput } from '@/ai/flows/assign-winner-code';
import { get, ref, remove, runTransaction, update, push, set } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent, QuizOrPoll, UserData } from '@/types';
import { createUserIfNotExists } from '@/lib/firebase';

export async function determineWinners(eventId: string): Promise<LuckyEvent> {
  const eventRef = ref(db, `events/${eventId}`);
  const eventSnapshot = await get(eventRef);
  const eventData: LuckyEvent | null = eventSnapshot.val();

  if (!eventData) {
    throw new Error('Event not found');
  }
  
  // If winners are already determined, just return the data.
  if (eventData.winners) {
    return { id: eventId, ...eventData };
  }

  const now = Date.now();
  // If registration end time has not been reached, return without determining winners.
  if (now < eventData.endTime) {
      return { id: eventId, ...eventData }; 
  }
  
  const registeredUsers = eventData.registeredUsers ? Object.keys(eventData.registeredUsers) : [];

  if (registeredUsers.length === 0) {
      const updates = {
          winners: [],
          assignedCodes: {}
      };
      await update(eventRef, updates);
      return { id: eventId, ...eventData, ...updates };
  }

  const input: AssignWinnerCodeInput = {
    eventId: eventId,
    registeredUsers: registeredUsers,
    selectionMode: eventData.selectionMode,
    codes: eventData.codes,
    customWinnerSlots: eventData.customWinnerSlots,
  };

  try {
    const result = await assignWinnerCode(input);

    const updates = {
      winners: result.winners || [],
      assignedCodes: result.assignedCodes || {},
    };

    await update(eventRef, updates);

    return { id: eventId, ...eventData, ...updates };
  } catch(error) {
    console.error("Error assigning winner code:", error)
    // In case of AI error, assign no winners
    const updates = {
        winners: [],
        assignedCodes: {}
    };
    await update(eventRef, updates);
    return { id: eventId, ...eventData, ...updates };
  }
}

export async function registerForEvent(eventId: string, username: string): Promise<{success: boolean, message: string}> {
    const eventRef = ref(db, `events/${eventId}`);
    const eventSnapshot = await get(eventRef);
    if (!eventSnapshot.exists()) {
        return { success: false, message: "Event not found." };
    }
    const event: LuckyEvent = eventSnapshot.val();

    const userPushId = await createUserIfNotExists(username);
    const userRef = ref(db, `users/${userPushId}`);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
        return { success: false, message: "User not found." };
    }
    const userData: UserData = userSnapshot.val();
    
    // Check if event is free or paid
    const requiredXp = event.requiredXp || 0;
    if (requiredXp > 0) {
        // This is a paid event, handle unlock/join logic
        const isUnlocked = userData.unlockedEvents?.[eventId];
        
        if (!isUnlocked) {
            // UNLOCK action
            if (userData.xp < requiredXp) {
                return { success: false, message: `You need at least ${requiredXp} XP to unlock this event. You have ${userData.xp} XP.`};
            }
            const currentPending = userData.pendingXpSpend || 0;
            const updates: Record<string, any> = {};
            updates[`/users/${userPushId}/pendingXpSpend`] = currentPending + requiredXp;
            updates[`/users/${userPushId}/unlockedEvents/${eventId}`] = true;
            await update(ref(db), updates);
            return { success: true, message: "Successfully Unlocked Event! Go to settings to pay." };
        } else {
            // JOIN action for an already unlocked event
            if (Date.now() > event.endTime) {
                return { success: false, message: "Registration Failed: Deadline passed." };
            }
            if (userData.pendingXpSpend && userData.pendingXpSpend > 0) {
                return { success: false, message: "Registration Failed: Please pay your pending XP in Settings first." };
            }
            const eventUserRef = ref(db, `events/${eventId}/registeredUsers/${userPushId}`);
            await set(eventUserRef, username);
            return { success: true, message: "Registration successful!" };
        }

    } else {
        // This is a free event, register directly
        if (Date.now() > event.endTime) {
             return { success: false, message: "Registration Failed: Deadline passed." };
        }
        const userRegistered = Object.values(event.registeredUsers || {}).includes(username);
        if (userRegistered) {
            return { success: true, message: "You are already registered for this event." };
        }
        const eventUserRef = ref(db, `events/${eventId}/registeredUsers/${userPushId}`);
        await set(eventUserRef, username);
        return { success: true, message: "Registration successful!" };
    }
}

export async function payPendingXp(username: string): Promise<{success: boolean, message: string}> {
    const userPushId = await createUserIfNotExists(username);
    const userRef = ref(db, `users/${userPushId}`);
    
    return runTransaction(userRef, (user: UserData | null) => {
        if (user) {
            const pendingSpend = user.pendingXpSpend || 0;
            if (pendingSpend === 0) {
                // To prevent transaction from running unnecessarily
                return;
            }
            if (user.xp < pendingSpend) {
                // Abort transaction
                return;
            }
            user.xp -= pendingSpend;
            user.pendingXpSpend = 0;
        }
        return user;
    }).then((result) => {
        if (result.committed) {
            const userAfter = result.snapshot.val();
             if (userAfter && userAfter.pendingXpSpend === 0) {
                return { success: true, message: 'Payment successful! Your XP balance has been updated.' };
             }
             // This can happen if the transaction was aborted due to insufficient XP
             return { success: false, message: 'Payment failed. You may not have enough XP.' };
        } else {
             // Transaction aborted or failed for other reasons
            return { success: false, message: 'Payment failed. Please check your XP balance and try again.' };
        }
    }).catch((error) => {
        console.error("Transaction failed: ", error);
        return { success: false, message: 'An error occurred during payment.' };
    });
}


export async function deleteEvent(eventId: string): Promise<void> {
    const eventRef = ref(db, `events/${eventId}`);
    await remove(eventRef);
}

export async function deleteQuiz(quizId: string): Promise<void> {
    const quizRef = ref(db, `quizzes/${quizId}`);
    await remove(quizRef);
}

export async function submitQuizAnswer(
    quizId: string,
    username: string,
    answers: (string | number)[]
): Promise<{success: boolean, message: string}> {
    const quizRef = ref(db, `quizzes/${quizId}`);
    
    try {
        const userPushId = await createUserIfNotExists(username);

        // Fetch the current quiz data first to perform checks
        const quizSnapshot = await get(quizRef);
        if (!quizSnapshot.exists()) {
             return { success: false, message: 'This activity does not exist.' };
        }
        
        const quiz: QuizOrPoll = quizSnapshot.val();

        // Check if activity is live
        const now = Date.now();
        if (now < quiz.startTime || now > quiz.endTime) {
            return { success: false, message: 'This activity is not currently active.' };
        }
        
        // Check if user has already submitted
        const hasSubmitted = quiz.submissions && Object.values(quiz.submissions).some(s => s.username === username);
        if (hasSubmitted) {
            return { success: false, message: 'You have already submitted an answer for this activity.' };
        }

        const awardedXp = quiz.xp;

        // Atomically update quiz submissions and user XP
        const submissionKey = push(ref(db, `quizzes/${quizId}/submissions`)).key;
        if (!submissionKey) throw new Error("Could not generate submission key");

        const updates: Record<string, any> = {};
        updates[`/quizzes/${quizId}/submissions/${submissionKey}`] = { username, answers, submittedAt: now };
        
        const userRef = ref(db, `users/${userPushId}`);
        const userSnapshot = await get(userRef);
        const currentXp = userSnapshot.exists() ? (userSnapshot.val() as UserData).xp : 0;
        updates[`/users/${userPushId}/xp`] = currentXp + awardedXp;

        await update(ref(db), updates);

        return { success: true, message: `Congratulations! You've earned ${awardedXp} XP.` };

    } catch (error) {
        console.error("Error submitting quiz answer:", error);
        return { success: false, message: 'Could not submit your answer.' };
    }
}

    