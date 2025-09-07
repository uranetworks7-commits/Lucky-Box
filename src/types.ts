
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

export interface Question {
  questionType: QuestionType;
  question: string;
  imageUrl?: string;
  options?: string[]; // For MCQ and Poll
  correctAnswer?: number | null; // For MCQ - index of correct answer
}

export interface Submission {
  username: string;
  answers: (string | number)[];
  submittedAt: number;
}

export interface QuizOrPoll {
    id: string;
    title: string;
    startTime: number;
    endTime: number;
    xp: number;
    questions: Question[];
    submissions?: Record<string, Submission>; // userPushId: submission
}

export interface UserData {
    user_id: string;
    username: string;
    xp: number;
    pendingXpSpend?: number;
    // other user data can go here
}
