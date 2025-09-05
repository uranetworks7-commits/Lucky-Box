
'use server';

import { assignWinnerCode, type AssignWinnerCodeInput } from '@/ai/flows/assign-winner-code';
import { get, ref, remove, runTransaction, update } from 'firebase/database';
import { db } from '@/lib/firebase';
import type { LuckyEvent, QuizOrPoll } from '@/types';
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
        // Get or create the user's unique ID first.
        const userPushId = await createUserIfNotExists(username);

        const result = await runTransaction(quizRef, (quiz: QuizOrPoll | null) => {
            if (quiz) {
                const now = Date.now();
                if (now < quiz.startTime || now > quiz.endTime) {
                    return; // Abort transaction if activity is not live
                }

                if (!quiz.submissions) {
                    quiz.submissions = {};
                }
                
                // Check if user has already submitted using their unique ID
                if (quiz.submissions[userPushId]) {
                    return; // Abort transaction
                }
                
                // Record the new submission with the unique ID
                quiz.submissions[userPushId] = {
                    username,
                    answers,
                    submittedAt: now,
                };

                // Award XP to the user
                const userRef = ref(db, `users/${userPushId}`);
                runTransaction(userRef, (user) => {
                    if (user) {
                        user.xp = (user.xp || 0) + quiz.xp;
                    }
                    // The user is created by createUserIfNotExists, so 'else' case is not strictly necessary here
                    // but good for safety.
                    else {
                        return { username: username, xp: quiz.xp, user_id: userPushId };
                    }
                    return user;
                });
            }
            return quiz;
        });

        if (result.committed) {
             const finalSubmissions = result.snapshot.val()?.submissions;
             // We check for committed status AND if our submission actually exists.
             // If the transaction was aborted, committed is false.
             if (finalSubmissions && finalSubmissions[userPushId]) {
                return { success: true, message: `Congratulations! You've earned ${result.snapshot.val().xp} XP.` };
             } else {
                 return { success: false, message: 'You have already submitted an answer for this activity.' };
             }
        } else {
            // This path is taken if the transaction is aborted (e.g., activity ended, or user already submitted)
            return { success: false, message: 'Activity has ended or you have already submitted.' };
        }

    } catch (error) {
        console.error("Transaction failed: ", error);
        return { success: false, message: 'An error occurred while submitting your answer.' };
    }
}
