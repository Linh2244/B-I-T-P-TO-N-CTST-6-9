export enum GradeLevel {
  Grade6 = 'Lớp 6',
  Grade7 = 'Lớp 7',
  Grade8 = 'Lớp 8',
  Grade9 = 'Lớp 9',
}

export interface Question {
  id: number;
  text: string;
  correctAnswer: string;
  userAnswer?: string;
}

export interface Quiz {
  title: string;
  grade: GradeLevel;
  questions: Question[];
  createdAt: number;
}

export type AppMode = 'HOME' | 'AI_CREATE' | 'MANUAL_CREATE' | 'FILE_UPLOAD' | 'TAKING_QUIZ' | 'RESULTS';

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  score: number; // 0-10 scale
  quizData: Quiz;
}