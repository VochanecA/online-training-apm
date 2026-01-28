
import { Course, Progress, User, UserRole, Lesson, Material, AuditLog, ExamAttempt } from './types';

const STORAGE_KEYS = {
  COURSES: 'AeroCert_courses',
  USERS: 'AeroCert_users',
  PROGRESS: 'AeroCert_progress',
  CURRENT_USER: 'AeroCert_current_user',
  AUDIT_LOGS: 'AeroCert_audit_logs'
};

const INITIAL_COURSES: Course[] = [
  {
    id: 'c1',
    title: 'Airport Security Fundamentals',
    description: 'Essential security protocols for all ground staff, including threat detection and reporting.',
    version: '1.0.0',
    category: 'Security',
    instructorId: 'u2',
    thumbnail: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80',
    isSequential: true,
    validityYears: 2,
    requiresPracticalCheck: true,
    lessons: [
      {
        id: 'l1',
        courseId: 'c1',
        title: 'Introduction to Airside Security',
        description: 'Understanding the restricted zones and badge requirements.',
        order: 1,
        minLearningTimeMinutes: 2,
        materials: [
          { id: 'm1', type: 'video', title: 'Security Perimeter Overview', url: 'https://www.youtube.com/embed/QWZ9byhN8Jk' },
          { id: 'm2', type: 'pdf', title: 'Security Manual V1', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' }
        ]
      },
      {
        id: 'l2',
        courseId: 'c1',
        title: 'Baggage Handling Security',
        description: 'Procedures for screening and securing checked luggage.',
        order: 2,
        minLearningTimeMinutes: 1,
        materials: [
          { id: 'm3', type: 'text', title: 'Screening Protocols', url: '', content: 'Baggage must be scanned for X-ray anomalies...' },
          { id: 'm4', type: 'pptx', title: 'Emergency Procedures Overview', url: 'https://example.com/emergency-procedures.pptx' }
        ]
      }
    ],
    exam: {
      id: 'e1',
      courseId: 'c1',
      passingScore: 80,
      timeLimitMinutes: 15,
      maxAttempts: 3,
      randomizeQuestions: true,
      randomizeAnswers: true,
      questionBankDrawCount: 2,
      questions: [
        { id: 'q1', text: 'What color is a restricted area badge?', options: ['Blue', 'Red', 'Yellow', 'Green'], correctOptionIndex: 1 },
        { id: 'q2', text: 'Who is responsible for security?', options: ['Only Security Staff', 'Only Pilots', 'Everyone', 'Only Management'], correctOptionIndex: 2 },
        { id: 'q3', text: 'What should you do if you find unattended baggage?', options: ['Take it home', 'Ignore it', 'Secure it and report to security', 'Wait for the owner'], correctOptionIndex: 2 }
      ]
    }
  }
];

export const db = {
  getCourses: (): Course[] => {
    const data = localStorage.getItem(STORAGE_KEYS.COURSES);
    return data ? JSON.parse(data) : INITIAL_COURSES;
  },
  saveCourses: (courses: Course[]) => {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },
  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    return data ? JSON.parse(data) : [];
  },
  saveUsers: (users: User[]) => {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  updateUser: (user: User) => {
    const users = db.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    if (index > -1) {
      users[index] = user;
    } else {
      users.push(user);
    }
    db.saveUsers(users);
  },
  getProgress: (): Progress[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PROGRESS);
    return data ? JSON.parse(data) : [];
  },
  saveProgress: (progress: Progress[]) => {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progress));
  },
  getUserProgress: (userId: string, courseId: string): Progress => {
    const progressList = db.getProgress();
    const existing = progressList.find(p => p.userId === userId && p.courseId === courseId);
    if (existing) {
      // Ensure new tracking fields exist for existing records
      if (!existing.lessonTimeSpent) existing.lessonTimeSpent = {};
      if (!existing.lessonStartTimes) existing.lessonStartTimes = {};
      return existing;
    }
    
    const newProgress: Progress = {
      userId,
      courseId,
      completedLessonIds: [],
      lessonStartTimes: {},
      lessonTimeSpent: {},
      attempts: [],
      isCompleted: false
    };
    return newProgress;
  },
  updateProgress: (progress: Progress) => {
    const list = db.getProgress();
    const index = list.findIndex(p => p.userId === progress.userId && p.courseId === progress.courseId);
    if (index > -1) {
      list[index] = progress;
    } else {
      list.push(progress);
    }
    db.saveProgress(list);
  },
  logAction: (userId: string, action: string, details: string) => {
    const logsData = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const logs: AuditLog[] = logsData ? JSON.parse(logsData) : [];
    logs.push({
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId,
      action,
      details
    });
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(-1000))); 
  },
  getAuditLogs: (): AuditLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : [];
  },
  exportToCSV: (data: any[], filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => {
      return Object.values(obj).map(val => {
        const s = String(val).replace(/"/g, '""');
        return `"${s}"`;
      }).join(',');
    }).join('\n');
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
