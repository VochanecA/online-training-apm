
export enum UserRole {
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  TRAINEE = 'TRAINEE',
  INSPECTOR = 'INSPECTOR'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  instructorAuthStartDate?: string;
  instructorAuthExpiry?: string; 
  instructorScope?: string; // e.g., "Ground Operations", "Fire Safety"
  // Employment & Contact Details
  jobDescription?: string;
  department?: string;
  airport?: string;
  jobTitle?: string;
  staffId?: string; // User ID / Code
  phone?: string;
}

export interface Material {
  id: string;
  type: 'pdf' | 'video' | 'pptx' | 'text';
  title: string;
  url: string;
  content?: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  materials: Material[];
  minLearningTimeMinutes: number; // Prevent skip-through
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
}

export interface ExamAttempt {
  id: string;
  timestamp: string;
  score: number;
  passed: boolean;
  timeSpentSeconds: number;
  answers: Record<string, number>;
  questionsSnapshot?: Question[]; // Snapshot of questions as seen by the user (order/shuffling)
}

export interface Exam {
  id: string;
  courseId: string;
  questions: Question[];
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  questionBankDrawCount?: number; // Draw X questions from pool
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  version: string;
  category: 'Safety' | 'Security' | 'Operations' | 'Customer Service';
  instructorId: string;
  lessons: Lesson[];
  exam?: Exam;
  thumbnail: string;
  isSequential?: boolean;
  validityYears: number; 
  requiresPracticalCheck: boolean;
  refresherCourseId?: string; // Link to recurrent training
}

export type PracticalStatus = 'COMPETENT' | 'NOT_YET_COMPETENT';

export interface Progress {
  userId: string;
  courseId: string;
  completedLessonIds: string[];
  lessonStartTimes: Record<string, string>; // Tracks when user started a lesson
  lessonTimeSpent: Record<string, number>; // Seconds spent per lesson
  attempts: ExamAttempt[];
  examScore?: number; 
  isCompleted: boolean;
  practicalCheckCompleted?: boolean;
  practicalCheckStatus?: PracticalStatus;
  practicalCheckComment?: string;
  practicalCheckBy?: string;
  practicalCheckDate?: string;
  completionDate?: string;
  certificateId?: string;
  expiryDate?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}
