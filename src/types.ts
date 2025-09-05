

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
  sendNotification?: boolean;
  requiredXp?: number;
}

export type QuestionType = 'poll' | 'mcq' | 'descriptive' | 'image';

export interface QuizOrPoll {
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    xp: number;
    questionType: QuestionType;
    question: string;
    imageUrl?: string;
    options?: string[]; // For MCQ and Poll
    // For simplicity, we won't handle correct answers for now, just participation XP
    // correctAnswer?: number; 
    submissions?: Record<string, { // userPushId: submission
        username: string;
        answer: string | number; // string for descriptive, number for mcq/poll index
        submittedAt: number;
    }>;
}

export interface UserData {
    username: string;
    xp: number;
    // other user data can go here
}
