import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { Course, User, Progress, UserRole, UserCourseAssignment } from '../types';
import { useNavigate } from 'react-router-dom';
import { Language, translations } from '../translations';

const Dashboard: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [courses, setCourses] = useState<Course[]>([]);
  const [allProgress, setAllProgress] = useState<Progress[]>([]);
  const [userAssignments, setUserAssignments] = useState<UserCourseAssignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load courses from Supabase
        const coursesData = await db.getCourses();
        setCourses(coursesData);

        // This is a bit inefficient but works for now
        const userProgressPromises = coursesData.map(async (course) => {
          return await db.getProgress(user.id, course.id);
        });
        
        const userProgressResults = await Promise.all(userProgressPromises);
        setAllProgress(userProgressResults.filter(p => p !== null) as Progress[]);

        // Load user course assignments
        const assignments = await db.getUserCourseAssignments(user.id);
        setUserAssignments(assignments);
        console.log('User assignments loaded:', assignments.length);
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        alert(lang === 'en' ? 'Error loading dashboard data' : 'Greška pri učitavanju podataka za kontrolnu tablu');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [user.id, lang]);

  // Check if course is assigned to user
  const isCourseAssigned = (courseId: string): boolean => {
    return userAssignments.some(assignment => assignment.courseId === courseId);
  };

  // Get assignment info for a specific course
  const getCourseAssignment = (courseId: string): UserCourseAssignment | undefined => {
    return userAssignments.find(assignment => assignment.courseId === courseId);
  };

  const userProgress = useMemo(() => 
    allProgress.filter(p => p.userId === user.id), 
  [allProgress, user.id]);

  const expiryWarnings = useMemo(() => {
    const now = new Date();
    const warnings = [];
    for (const p of userProgress) {
      if (p.expiryDate) {
        const expiry = new Date(p.expiryDate);
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 3600 * 24));
        if (diffDays <= 90) {
          const course = courses.find(c => c.id === p.courseId);
          warnings.push({ 
            courseTitle: course?.title || 'Unknown', 
            days: diffDays, 
            courseId: p.courseId,
            refresherId: course?.refresherCourseId
          });
        }
      }
    }
    return warnings.sort((a, b) => a.days - b.days);
  }, [userProgress, courses]);

  const filteredCourses = useMemo(() => {
    if (!searchTerm) return courses;
    const lowerSearch = searchTerm.toLowerCase();
    return courses.filter(c => 
      c.title.toLowerCase().includes(lowerSearch) || 
      c.category.toLowerCase().includes(lowerSearch)
    );
  }, [courses, searchTerm]);

  const getCompletionPercentage = (course: Course) => {
    const p = userProgress.find(up => up.courseId === course.id);
    if (!p) return 0;
    if (p.isCompleted) return 100;
    if (course.lessons.length === 0) return 0;
    return Math.round((p.completedLessonIds.length / course.lessons.length) * 100);
  };

  // Statistics - add assigned courses count
  const stats = useMemo(() => {
    const completed = userProgress.filter(p => p.isCompleted).length;
    
    // Calculate average exam score from exam attempts
    let totalScore = 0;
    let attemptCount = 0;
    
    userProgress.forEach(p => {
      p.attempts.forEach(attempt => {
        if (attempt.score !== undefined) {
          totalScore += attempt.score;
          attemptCount++;
        }
      });
    });
    
    const avgScore = attemptCount > 0 ? Math.round(totalScore / attemptCount) : 0;
    
    const active = userProgress.filter(p => {
      if (p.isCompleted) return false;
      const course = courses.find(c => c.id === p.courseId);
      if (!course) return false;
      return getCompletionPercentage(course) > 0;
    }).length;

    // Count assigned courses
    const assignedCourses = userAssignments.length;
    
    // Count required assigned courses
    const requiredAssignedCourses = userAssignments.filter(a => a.isRequired).length;

    return { 
      completed, 
      avgScore, 
      active, 
      assignedCourses,
      requiredAssignedCourses 
    };
  }, [userProgress, courses, userAssignments]);

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-blue-600/20 rounded-full animate-ping"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8 md:mb-12">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t.welcomeBack}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">{user.name}</span>
              </h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base">{t.overview}</p>
          </div>
          
          {user.role === UserRole.INSPECTOR && (
            <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 rounded-lg font-semibold text-xs uppercase tracking-wider border border-purple-200 inline-flex items-center gap-2 self-start">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              {lang === 'en' ? 'Inspector Access' : 'Inspektorski pristup'}
            </div>
          )}
        </div>
      </div>

      {/* Highlighted Assigned Courses */}
      {userAssignments.length > 0 && (
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {lang === 'en' ? 'Assigned Courses' : 'Dodeljeni kursevi'}
            </h3>
            <span className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-bold rounded-full">
              {userAssignments.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userAssignments.slice(0, 3).map((assignment) => {
              const course = courses.find(c => c.id === assignment.courseId);
              if (!course) return null;
              
              const progress = getCompletionPercentage(course);
              const isRequired = assignment.isRequired;
              const hasDueDate = assignment.dueDate && new Date(assignment.dueDate) > new Date();
              const daysUntilDue = assignment.dueDate 
                ? Math.ceil((new Date(assignment.dueDate).getTime() - new Date().getTime()) / (1000 * 3600 * 24))
                : null;

              return (
                <div 
                  key={assignment.id}
                  onClick={() => navigate(`/app/course/${course.id}`)}
                  className={`p-4 rounded-xl border transition-all hover:shadow-lg cursor-pointer ${
                    isRequired
                      ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'
                      : 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          isRequired
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                        }`}>
                          {lang === 'en' ? 'ASSIGNED' : 'DODIJELJENO'}
                        </span>
                        {isRequired && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                            {lang === 'en' ? 'REQUIRED' : 'OBAVEZNO'}
                          </span>
                        )}
                        {hasDueDate && daysUntilDue !== null && daysUntilDue > 0 && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                            {lang === 'en' ? `Due in ${daysUntilDue} days` : `Za ${daysUntilDue} dana`}
                          </span>
                        )}
                      </div>
                      <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{course.title}</h4>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              progress === 100 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-indigo-700 whitespace-nowrap">{progress}%</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        {lang === 'en' 
                          ? `Assigned by admin ${assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : ''}`
                          : `Dodijeljeno od strane admina ${assignment.assignedAt ? new Date(assignment.assignedAt).toLocaleDateString() : ''}`}
                      </p>
                      {assignment.dueDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          📅 {lang === 'en' 
                            ? `Due: ${new Date(assignment.dueDate).toLocaleDateString()}`
                            : `Rok: ${new Date(assignment.dueDate).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/app/course/${course.id}`);
                      }}
                      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all hover:scale-105 ${
                        isRequired
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                      }`}
                    >
                      {progress > 0 
                        ? (lang === 'en' ? 'Continue' : 'Nastavi') 
                        : (lang === 'en' ? 'Start Now' : 'Započni odmah')}
                    </button>
                  </div>
                </div>
              );
            })}
            
            {userAssignments.length > 3 && (
              <div 
                onClick={() => setSearchTerm('')}
                className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center group"
              >
                <div className="text-center">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-300 to-purple-400 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    <span className="text-white font-bold text-lg">+{userAssignments.length - 3}</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700">
                    {lang === 'en' ? 'View all assigned courses' : 'Prikaži sve dodeljene kurseve'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expiry Warnings */}
      {expiryWarnings.length > 0 && user.role === UserRole.TRAINEE && (
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-6 h-6 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              {lang === 'en' ? 'Expiry Alerts' : 'Upozorenja o isteku'}
            </h3>
            <span className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full">
              {expiryWarnings.length}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expiryWarnings.map((warn, i) => (
              <div 
                key={i} 
                className={`p-4 rounded-xl border transition-all hover:shadow-lg ${
                  warn.days < 0 
                    ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200' 
                    : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-1">{warn.courseTitle}</h4>
                    <p className={`text-xs font-medium ${
                      warn.days < 0 ? 'text-red-600' : 'text-amber-700'
                    }`}>
                      {warn.days < 0 
                        ? (lang === 'en' ? 'Expired' : 'Isteklo') 
                        : (lang === 'en' 
                          ? `Expires in ${warn.days} days` 
                          : `Ističe za ${warn.days} dana`)}
                    </p>
                  </div>
                  <button 
                  onClick={() => navigate(`/app/course/${warn.refresherId || warn.courseId}`)}
                    className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all hover:scale-105 ${
                      warn.days < 0 
                        ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white' 
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
                    }`}
                  >
                    {warn.refresherId 
                      ? (lang === 'en' ? 'Refresh' : 'Osveži') 
                      : (lang === 'en' ? 'Review' : 'Pregledaj')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 mb-8 md:mb-12">
        <div className="bg-gradient-to-br from-white to-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{courses.length}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.activeCourses || 'Active Courses'}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-green-600 mb-1">{stats.completed}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.certificatesEarned || 'Certificates Earned'}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">{stats.avgScore}%</h3>
          <p className="text-sm text-gray-600 font-medium">{t.avgExamScore || 'Avg Exam Score'}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-indigo-600 mb-1">{stats.assignedCourses}</h3>
          <p className="text-sm text-gray-600 font-medium">
            {lang === 'en' ? 'Assigned Courses' : 'Dodijeljeni kursevi'}
          </p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-purple-600 mb-1">{stats.active}</h3>
          <p className="text-sm text-gray-600 font-medium">
            {lang === 'en' ? 'Active Progress' : 'Aktivni napredak'}
          </p>
        </div>
      </div>

      {/* Course Roadmap */}
      <section className="bg-gradient-to-b from-white to-gray-50/50 rounded-3xl p-5 md:p-8 border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              {t.courseRoadmap || 'Course Roadmap'}
            </h2>
            <p className="text-gray-600 text-sm">
              {lang === 'en' ? 'Track and continue your learning journey' : 'Pratite i nastavite svoje učenje'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-72 lg:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder={t.searchCourses || 'Search courses...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white border border-gray-300 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 text-sm"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Filter za dodeljene kurseve */}
            <button 
              onClick={() => {
                // Implement filter for assigned courses
                const assignedCourses = filteredCourses.filter(c => isCourseAssigned(c.id));
                if (assignedCourses.length > 0) {
                  alert(lang === 'en' 
                    ? `You have ${assignedCourses.length} assigned courses` 
                    : `Imate ${assignedCourses.length} dodeljenih kurseva`);
                } else {
                  alert(lang === 'en' 
                    ? 'No assigned courses found' 
                    : 'Nema dodeljenih kurseva');
                }
              }}
              className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 text-indigo-700 rounded-xl font-semibold text-sm hover:shadow-md transition-all whitespace-nowrap flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {lang === 'en' ? 'Assigned Only' : 'Samo dodeljeni'}
            </button>
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {filteredCourses.map(course => {
              const progress = getCompletionPercentage(course);
              const p = userProgress.find(up => up.courseId === course.id);
              const isExpired = p?.expiryDate && new Date(p.expiryDate) < new Date();
              const isAssigned = isCourseAssigned(course.id);
              const assignment = getCourseAssignment(course.id);
              const isRequired = assignment?.isRequired;
              const hasDueDate = assignment?.dueDate && new Date(assignment.dueDate) > new Date();

              return (
                <div 
                  key={course.id}
               onClick={() => navigate(`/app/course/${course.id}`)}
                  className={`group bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 ${
                    isAssigned 
                      ? 'border-indigo-300 ring-2 ring-indigo-100' 
                      : 'border-gray-200'
                  }`}
                >
                  <div className="relative h-40 md:h-48 overflow-hidden">
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900/40 via-transparent to-transparent"></div>
                    
                    {/* Course badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-gray-800">
                        {course.category}
                      </span>
                      <span className="px-2 py-1 bg-gray-900/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-white">
                        v{course.version}
                      </span>
                    </div>
                    
                    {/* Assigned Badge */}
                    {isAssigned && (
                      <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                        <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-lg shadow-lg">
                          {lang === 'en' ? 'ASSIGNED' : 'Dodijeljeno'}
                        </span>
                        {isRequired && (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded-full">
                            {lang === 'en' ? 'REQUIRED' : 'OBAVEZNO'}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {isExpired && !isAssigned && (
                      <div className="absolute top-3 right-3 px-2 py-1 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs font-bold rounded-lg">
                        {lang === 'en' ? 'EXPIRED' : 'ISTEKLO'}
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 md:p-6">
                    <h3 className="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                    
                    {/* Assignment info */}
                    {isAssigned && assignment && (
                      <div className="mb-3 p-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="text-xs text-indigo-700 font-medium">
                              {lang === 'en' ? 'Assigned by Admin' : 'Dodijeljeno od strane admina'}
                            </span>
                          </div>
                          {assignment.dueDate && (
                            <span className="text-xs text-gray-600">
                              📅 {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          {lang === 'en' ? 'Progress' : 'Napredak'}
                        </span>
                        <span className={`text-xs font-semibold ${
                          isAssigned ? 'text-indigo-600' : 'text-blue-600'
                        }`}>
                          {progress}%
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            progress === 100 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                              : isAssigned
                                ? 'bg-gradient-to-r from-indigo-500 to-purple-500'
                                : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          isAssigned 
                            ? 'bg-gradient-to-br from-indigo-100 to-purple-100' 
                            : 'bg-gradient-to-br from-blue-100 to-cyan-100'
                        }`}>
                          <svg className={`w-4 h-4 ${
                            isAssigned ? 'text-indigo-600' : 'text-blue-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span className="text-sm text-gray-600">
                          {course.lessons.length} {lang === 'en' ? 'lessons' : 'lekcija'}
                        </span>
                        {hasDueDate && (
                          <span className="text-xs text-indigo-600 font-semibold px-2 py-1 bg-indigo-50 rounded">
                            📅
                          </span>
                        )}
                      </div>
                      <button className={`px-4 py-2 text-sm font-semibold text-white rounded-lg hover:shadow-lg transition-all group-hover:scale-105 ${
                        isAssigned
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600'
                          : 'bg-gradient-to-r from-blue-600 to-cyan-600'
                      }`}>
                        {progress > 0 
                          ? (lang === 'en' ? 'Continue' : 'Nastavi') 
                          : (lang === 'en' ? 'Start' : 'Započni')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 md:py-16">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {lang === 'en' ? 'No courses found' : 'Nije pronađen nijedan kurs'}
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              {lang === 'en' ? 'Try adjusting your search criteria' : 'Pokušajte da prilagodite kriterijume pretrage'}
            </p>
            <button 
              onClick={() => setSearchTerm('')}
              className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              {lang === 'en' ? 'Clear search' : 'Očisti pretragu'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;