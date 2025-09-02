export interface LuckyEvent {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  resultTime: number;
  codes: string[];
  selectionMode: 'custom' | 'random';
  winnerSlots?: number;
  registeredUsers?: Record<string, string>; // userId: username
  winners?: string[]; // array of userIds
  assignedCodes?: Record<string, string>; // userId: code
}
