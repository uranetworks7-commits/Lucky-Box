'use server';

/**
 * @fileOverview A flow to assign winner codes to registered users based on the event configuration.
 *
 * - assignWinnerCode - A function that handles the assignment of winner codes.
 * - AssignWinnerCodeInput - The input type for the assignWinnerCode function.
 * - AssignWinnerCodeOutput - The return type for the assignWinnerCode function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AssignWinnerCodeInputSchema = z.object({
  eventId: z.string().describe('The ID of the event.'),
  registeredUsers: z.array(z.string()).describe('Array of user IDs who registered for the event.'),
  selectionMode: z.enum(['custom', 'random']).describe('The selection mode for the event (custom or random).'),
  winnerSlots: z.number().optional().describe('The number of winner slots for custom selection.'),
  codes: z.array(z.string()).describe('Array of prize codes to assign.'),
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

const assignWinnerCodeFlow = ai.defineFlow(
  {
    name: 'assignWinnerCodeFlow',
    inputSchema: AssignWinnerCodeInputSchema,
    outputSchema: AssignWinnerCodeOutputSchema,
  },
  async input => {
    const {eventId, registeredUsers, selectionMode, winnerSlots, codes} = input;

    const winners: string[] = [];
    const assignedCodes: Record<string, string> = {};

    if (selectionMode === 'custom') {
      if (winnerSlots && winnerSlots <= registeredUsers.length) {
        for (let i = 0; i < winnerSlots; i++) {
          winners.push(registeredUsers[i]);
          assignedCodes[registeredUsers[i]] = codes[i % codes.length];
        }
      }
    } else if (selectionMode === 'random') {
      // Randomly select winners from registered users.
      const shuffledUsers = [...registeredUsers].sort(() => Math.random() - 0.5);
      const numWinners = winnerSlots && winnerSlots < registeredUsers.length ? winnerSlots : registeredUsers.length; //If no winnerSlots provided or it's larger than registeredUsers, assign all.
      for (let i = 0; i < numWinners; i++) {
        winners.push(shuffledUsers[i]);
        assignedCodes[shuffledUsers[i]] = codes[i % codes.length];
      }
    }

    return {
      winners,
      assignedCodes,
    };
  }
);
