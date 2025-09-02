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
  // Deprecated fields, no longer used but kept for schema compatibility if needed.
  selectionMode: z.enum(['custom', 'random']).optional().describe('The selection mode for the event (custom or random).'),
  winnerSlots: z.number().optional().describe('The number of winner slots for custom selection.'),
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
    const { registeredUsers, codes } = input;

    if (registeredUsers.length === 0 || codes.length === 0) {
      return {
        winners: [],
        assignedCodes: {},
      };
    }

    // Always select exactly one winner randomly.
    const winnerIndex = Math.floor(Math.random() * registeredUsers.length);
    const winnerId = registeredUsers[winnerIndex];
    
    // Assign a random code to the winner.
    const codeIndex = Math.floor(Math.random() * codes.length);
    const assignedCode = codes[codeIndex];
    
    const winners: string[] = [winnerId];
    const assignedCodes: Record<string, string> = {
        [winnerId]: assignedCode
    };
    
    return {
      winners,
      assignedCodes,
    };
  }
);
