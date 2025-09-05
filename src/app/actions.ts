
'use server';

import { assignWinnerCode, type AssignWinnerCodeInput } from '@/ai/flows/assign-winner-code';
import { get, ref, remove, runTransaction, update, push } from 'firebase/database';
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
        if (quiz.submissions && Object.values(quiz.submissions).some(s => s.username === username)) {
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
