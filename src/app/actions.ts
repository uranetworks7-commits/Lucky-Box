
'use server';

import { assignWinnerCode, type AssignWinnerCodeInput } from '@/ai/flows/assign-winner-code';
import { get, ref, remove, runTransaction, update } from 'firebase/database';
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
        let awardedXp = 0;

        const result = await runTransaction(quizRef, (quiz: QuizOrPoll | null) => {
            if (!quiz) return; // Abort if quiz doesn't exist

            const now = Date.now();
            if (now < quiz.startTime || now > quiz.endTime) {
                return; // Abort transaction if activity is not live
            }

            if (!quiz.submissions) {
                quiz.submissions = {};
            }
            
            // Abort if user has already submitted by checking the pushId
            if (Object.values(quiz.submissions).some(s => s.username === username)) {
                return; // Abort, user already submitted
            }
            
            // Record the new submission with a unique key
            const submissionKey = push(ref(db, `quizzes/${quizId}/submissions`)).key;
            if(!submissionKey) return; // Could not generate key

            quiz.submissions[submissionKey] = {
                username,
                answers,
                submittedAt: now,
            };

            awardedXp = quiz.xp;
            return quiz;
        });

        // After the transaction, check if it was successful and then update the user's XP.
        if (result.committed && awardedXp > 0) {
            const userRef = ref(db, `users/${userPushId}`);
            await runTransaction(userRef, (user: UserData | null) => {
                if (user) {
                    user.xp = (user.xp || 0) + awardedXp;
                }
                return user;
            });
            return { success: true, message: `Congratulations! You've earned ${awardedXp} XP.` };
        } 
        
        // Handle cases where the transaction was aborted (e.g., already submitted)
        if (!result.committed) {
             const snapshot = await get(quizRef);
             const quiz = snapshot.val();
             const now = Date.now();
             if (now < quiz.startTime || now > quiz.endTime) {
                return { success: false, message: 'This activity is not currently active.' };
             }
             if (quiz.submissions && Object.values(quiz.submissions).some((s:any) => s.username === username)) {
                 return { success: false, message: 'You have already submitted an answer for this activity.' };
             }
        }

        // Fallback for any other scenario
        return { success: false, message: 'Could not submit your answer.' };

    } catch (error) {
        console.error("Error submitting quiz answer:", error);
        return { success: false, message: 'An unknown error occurred while submitting your answer.' };
    }
}
