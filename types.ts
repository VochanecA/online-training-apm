// types.ts - Kompletan sa ispravljenim tipovima za Supabase
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
  // Timestamp polja za Supabase
  createdAt?: string;
  updatedAt?: string;
}




export interface Material {
  id: string;
  type: 'pdf' | 'video' | 'pptx' | 'text';
  title: string;
  url: string;
  content?: string;
  fileName?: string; 
  createdAt?: string;
  updatedAt?: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  materials: Material[];
  minLearningTimeMinutes: number;
  exam?: Exam; // ✅ DODAJTE OVO - test za lekciju
  createdAt?: string;
  updatedAt?: string;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  // Timestamp polja za Supabase
  createdAt?: string;
}

export interface ExamAttempt {
  id: string;
  timestamp: string;
  score: number;
  passed: boolean;
  timeSpentSeconds: number;
  answers: Record<string, number>;
  questionsSnapshot?: Question[]; // Snapshot of questions as seen by the user (order/shuffling)
  // Supabase relacije - snake_case za polja iz baze
  userId?: string;
  courseId?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
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
  // Timestamp polja za Supabase
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details: string;
  // Timestamp polja za Supabase (alias za timestamp)
  createdAt?: string;
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
  // Timestamp polja za Supabase
  createdAt?: string;
  updatedAt?: string;
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
  // Timestamp i id polja za Supabase
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

// KLJUČNO: Supabase tipovi - OVO TREBA DA ODRĄŽAVA STRUKTURU BAZE (snake_case)
export interface SupabaseCourse {
  id: string;
  title: string;
  description: string;
  version: string;
  category: string;
  // OVO JE VAŽNO: polja iz baze su snake_case
  instructor_id: string;
  thumbnail: string;
  is_sequential: boolean;
  validity_years: number;
  requires_practical_check: boolean;
  refresher_course_id: string | null;
  created_at?: string;
  updated_at?: string;
  // Relacije
  lessons?: SupabaseLesson[];
  exam?: SupabaseExam[];
}

export interface SupabaseLesson {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order: number;
  min_learning_time_minutes: number;
  created_at?: string;
  updated_at?: string;
  materials?: Material[];
}

export interface SupabaseExam {
  id: string;
  course_id: string;
  passing_score: number;
  time_limit_minutes: number;
  max_attempts: number;
  randomize_questions: boolean;
  randomize_answers: boolean;
  question_bank_draw_count: number;
  created_at?: string;
  updated_at?: string;
  questions?: Question[];
}

// Helper type za kreiranje novih kursova u Supabase
export interface SupabaseCourseInsert {
  title: string;
  description?: string;
  version?: string;
  category?: string;
  instructor_id: string;
  thumbnail?: string;
  is_sequential?: boolean;
  validity_years?: number;
  requires_practical_check?: boolean;
  refresher_course_id?: string | null;
}

// Helper type za kreiranje novih lekcija u Supabase
export interface SupabaseLessonInsert {
  course_id: string;
  title: string;
  description?: string;
  order: number;
  min_learning_time_minutes?: number;
}

// Helper type za kreiranje novih ispita u Supabase
export interface SupabaseExamInsert {
  course_id: string;
  passing_score: number;
  time_limit_minutes: number;
  max_attempts: number;
  randomize_questions?: boolean;
  randomize_answers?: boolean;
  question_bank_draw_count?: number;
}

// Helper type za kreiranje novih pitanja u Supabase
export interface SupabaseQuestionInsert {
  exam_id: string;
  text: string;
  options: string[];
  correct_option_index: number;
  order?: number;
}

// Helper type za kreiranje novih materijala u Supabase
export interface SupabaseMaterialInsert {
  lesson_id: string;
  type: 'pdf' | 'video' | 'pptx' | 'text';
  title: string;
  url?: string;
  content?: string;
}

// Helper type za progress u Supabase
export interface SupabaseProgressInsert {
  user_id: string;
  course_id: string;
  completed_lesson_ids?: string[];
  lesson_start_times?: Record<string, string>;
  lesson_time_spent?: Record<string, number>;
  is_completed?: boolean;
  exam_score?: number;
  practical_check_completed?: boolean;
  practical_check_status?: PracticalStatus;
  practical_check_comment?: string;
  practical_check_by?: string;
  practical_check_date?: string;
  completion_date?: string;
  certificate_id?: string;
  expiry_date?: string;
}

// Helper type za exam attempts u Supabase
export interface SupabaseExamAttemptInsert {
  user_id: string;
  course_id: string;
  score: number;
  passed: boolean;
  time_spent_seconds: number;
  answers?: Record<string, number>;
  questions_snapshot?: Question[];
  started_at?: string;
  completed_at?: string;
}

export interface QuestionSet {
  id: string;
  courseId: string;
  name: string;
  description: string;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

// Dodato za required courses u types.ts
export interface UserCourseAssignment {
  id: string;
  userId: string;
  courseId: string;
  isRequired: boolean;
  dueDate?: string;
  assignedBy?: string;
  assignedAt: string;
  updatedAt: string;
  // Relacije (za join)
  course?: Course;
  assignedByUser?: User;
}