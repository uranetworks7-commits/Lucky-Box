
export interface LuckyEvent {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  resultTime: number;
  codes: string[];
  selectionMode: 'custom' | 'random';
  customWinnerSlots?: Record<string, number>; // code: slot
  registeredUsers?: Record<string, string>; // firebase pushId: username
  winners?: string[]; // array of firebase pushIds
  assignedCodes?: Record<string, string>; // firebase pushId: code
  isHighlighted?: boolean;
}
