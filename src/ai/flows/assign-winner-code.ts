
'use server';

/**
 * @fileOverview A flow to assign a winner code to a single winner from the registered users.
 *
 * - assignWinnerCode - A function that handles the assignment of a winner code.
 * - AssignWinnerCodeInput - The input type for the assignWinnerCode function.
 * - AssignWinnerCodeOutput - The return type for the assignWinnerCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssignWinnerCodeInputSchema = z.object({
  eventId: z.string().describe('The ID of the event.'),
  registeredUsers: z.array(z.string()).describe('Array of user IDs who registered for the event.'),
  codes: z.array(z.string()).describe('Array of prize codes to assign.'),
  selectionMode: z.enum(['custom', 'random']).optional().describe('The selection mode for the event (custom or random).'),
  customWinnerSlots: z.record(z.string(), z.number()).optional().describe('Mapping of codes to winner slots for custom selection.'),
});
export type AssignWinnerCodeInput = z.infer<typeof AssignWinnerCodeInputSchema>;

const AssignWinnerCodeOutputSchema = z.object({
  winners: z.array(z.string()).describe('Array of user IDs who won the prize.'),
  assignedCodes: z.record(z.string(), z.string()).describe('Mapping of user IDs to assigned prize codes.'),
});
export type AssignWinnerCodeOutput = z.infer<typeof AssignWinnerCodeOutputSchema>;

export async function assignWinnerCode(input: AssignWinnerCodeInput): Promise<AssignWinnerCodeOutput> {
  return assignWinnerCodeFlow(input);
}

// Fisher-Yates (aka Knuth) Shuffle algorithm
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}


const assignWinnerCodeFlow = ai.defineFlow(
  {
    name: 'assignWinnerCodeFlow',
    inputSchema: AssignWinnerCodeInputSchema,
    outputSchema: AssignWinnerCodeOutputSchema,
  },
  async input => {
    const { registeredUsers, codes, selectionMode, customWinnerSlots } = input;
    const assignedCodes: Record<string, string> = {};
    const winners: string[] = [];

    if (registeredUsers.length === 0 || codes.length === 0) {
      return { winners, assignedCodes };
    }

    if (selectionMode === 'custom' && customWinnerSlots) {
      // Custom selection logic based on registration order
      const codeToSlotMap = customWinnerSlots;
      const slotToCodeMap = new Map<number, string>();
      for(const code of codes) {
          const slot = codeToSlotMap[code];
          if(slot) {
              slotToCodeMap.set(slot, code);
          }
      }
      
      registeredUsers.forEach((userId, index) => {
        const registrationOrder = index + 1; // 1-based index
        if (slotToCodeMap.has(registrationOrder)) {
          const code = slotToCodeMap.get(registrationOrder)!;
          assignedCodes[userId] = code;
          winners.push(userId);
        }
      });
      
    } else {
      // Random selection logic using Fisher-Yates shuffle
      const shuffledUsers = shuffle([...registeredUsers]);
      const numberOfWinners = Math.min(shuffledUsers.length, codes.length);
      const randomWinners = shuffledUsers.slice(0, numberOfWinners);

      randomWinners.forEach((winnerId, index) => {
          assignedCodes[winnerId] = codes[index];
          winners.push(winnerId);
      });
    }
    
    return {
      winners,
      assignedCodes,
    };
  }
);
