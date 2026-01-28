import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { Course, User, Progress, UserRole } from '../types';
import { useNavigate } from 'react-router-dom';
import { Language, translations } from '../translations';

const Dashboard: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [courses, setCourses] = useState<Course[]>([]);
  const [allProgress, setAllProgress] = useState<Progress[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API loading
    const timer = setTimeout(() => {
      setCourses(db.getCourses());
      setAllProgress(db.getProgress());
      setIsLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);

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
            refresherId: course?.refresherCourseId,
            status: diffDays < 0 ? 'expired' : diffDays <= 30 ? 'critical' : 'warning'
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
      c.category.toLowerCase().includes(lowerSearch) ||
      c.description.toLowerCase().includes(lowerSearch)
    );
  }, [courses, searchTerm]);

  const getCompletionPercentage = (course: Course) => {
    const p = userProgress.find(up => up.courseId === course.id);
    if (!p) return 0;
    if (p.isCompleted) return 100;
    if (course.lessons.length === 0) return 0;
    return Math.round((p.completedLessonIds.length / course.lessons.length) * 100);
  };

  const stats = useMemo(() => ({
    activeCourses: courses.length,
    certificatesEarned: userProgress.filter(p => p.isCompleted).length,
    avgExamScore: Math.round(
      userProgress.filter(p => p.examScore)
        .reduce((acc, p) => acc + (p.examScore || 0), 0) / 
      (userProgress.filter(p => p.examScore).length || 1)
    ),
    completionRate: Math.round(
      (userProgress.filter(p => p.isCompleted).length / courses.length) * 100 || 0
    )
  }), [courses, userProgress]);

  const getCategoryIcon = (category: string) => {
    switch(category.toLowerCase()) {
      case 'safety': return '🛡️';
      case 'technical': return '🔧';
      case 'regulatory': return '📜';
      case 'security': return '🔒';
      case 'medical': return '⚕️';
      case 'operations': return '✈️';
      default: return '📚';
    }
  };

  const getCategoryColor = (category: string) => {
    switch(category.toLowerCase()) {
      case 'safety': return 'bg-gradient-to-r from-red-500 to-orange-500';
      case 'technical': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'regulatory': return 'bg-gradient-to-r from-purple-500 to-pink-500';
      case 'security': return 'bg-gradient-to-r from-green-500 to-emerald-500';
      case 'medical': return 'bg-gradient-to-r from-indigo-500 to-blue-500';
      case 'operations': return 'bg-gradient-to-r from-amber-500 to-yellow-500';
      default: return 'bg-gradient-to-r from-gray-600 to-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-20 h-20 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50/95 to-gray-100 p-4 md:p-6 lg:p-8">
      {/* Header Section */}
      <header className="mb-8 md:mb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                {t.welcomeBack}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">
              Welcome back, <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{user.name}</span>
            </h1>
            <p className="text-gray-600 text-lg font-medium max-w-2xl">
              {t.overview} • {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'sr-ME', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          {user.role === UserRole.INSPECTOR && (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl backdrop-blur-sm">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-sm font-semibold text-purple-700">
                {lang === 'en' ? 'Read-Only Inspector Access' : 'Inspektorski pristup (samo čitanje)'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Expiry Warnings Section */}
      {expiryWarnings.length > 0 && user.role === UserRole.TRAINEE && (
        <div className="mb-8 md:mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t.expiryWarning} ({expiryWarnings.length})
            </h2>
            <span className="text-sm text-gray-500 font-medium">
              {lang === 'en' ? 'Action Required' : 'Potrebna akcija'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {expiryWarnings.map((warn, i) => (
              <div 
                key={i}
                className={`group relative overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] ${
                  warn.status === 'expired' 
                    ? 'bg-gradient-to-r from-red-50/80 to-orange-50/80 border-red-200' 
                    : warn.status === 'critical'
                    ? 'bg-gradient-to-r from-orange-50/80 to-amber-50/80 border-orange-200'
                    : 'bg-gradient-to-r from-amber-50/80 to-yellow-50/80 border-amber-200'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${
                          warn.status === 'expired' 
                            ? 'bg-red-100 text-red-600' 
                            : warn.status === 'critical'
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg">{warn.courseTitle}</h3>
                          <p className={`text-sm font-semibold ${
                            warn.status === 'expired' 
                              ? 'text-red-600' 
                              : warn.status === 'critical'
                              ? 'text-orange-600'
                              : 'text-amber-600'
                          }`}>
                            {warn.days < 0 
                              ? t.expired
                              : warn.days === 0
                              ? t.expiresToday
                              : t.expiresIn.replace('{days}', warn.days.toString())
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => navigate(warn.refresherId ? `/course/${warn.refresherId}` : `/course/${warn.courseId}`)}
                      className="px-4 py-2.5 bg-gradient-to-r from-gray-900 to-gray-800 hover:from-gray-800 hover:to-gray-700 text-white rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-lg active:scale-95 whitespace-nowrap"
                    >
                      {warn.refresherId 
                        ? (lang === 'en' ? 'Start Refresher' : 'Započni osvježavanje')
                        : (lang === 'en' ? 'Review Course' : 'Pregledaj kurs')
                      }
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="mb-8 md:mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{lang === 'en' ? 'Training Overview' : 'Pregled obuke'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {[
            { 
              label: t.activeCourses, 
              value: stats.activeCourses, 
              color: 'from-blue-500 to-cyan-500',
              icon: '📚'
            },
            { 
              label: t.certificatesEarned, 
              value: stats.certificatesEarned, 
              color: 'from-green-500 to-emerald-500',
              icon: '🏆'
            },
            { 
              label: t.avgExamScore, 
              value: `${stats.avgExamScore}%`, 
              color: 'from-purple-500 to-pink-500',
              icon: '📊'
            },
            { 
              label: lang === 'en' ? 'Completion Rate' : 'Stopa završetka', 
              value: `${stats.completionRate}%`, 
              color: 'from-orange-500 to-amber-500',
              icon: '📈'
            }
          ].map((stat, index) => (
            <div 
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-6 hover:border-gray-300 transition-all duration-300 hover:shadow-xl"
            >
              <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${stat.color}"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{stat.icon}</span>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${stat.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
                </div>
                <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{stat.value}</div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Course Roadmap Section */}
      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.courseRoadmap}</h2>
            <p className="text-gray-600">{lang === 'en' ? 'Browse and enroll in available training courses' : 'Pregledajte i upišite se na dostupne tečajeve obuke'}</p>
          </div>
          
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input 
              type="text" 
              placeholder={t.searchCourses}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 font-medium placeholder-gray-500"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                aria-label={t.clearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map(course => {
              const progress = getCompletionPercentage(course);
              const p = userProgress.find(up => up.courseId === course.id);
              const isExpired = p?.expiryDate && new Date(p.expiryDate) < new Date();
              const isCompleted = progress === 100;

              return (
                <div 
                  key={course.id}
                  onClick={() => navigate(`/course/${course.id}`)}
                  className="group relative overflow-hidden rounded-2xl bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300 hover:shadow-xl cursor-pointer hover:-translate-y-1"
                >
                  {/* Status Badge */}
                  {isExpired && (
                    <div className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg shadow-lg">
                      {t.expired}
                    </div>
                  )}
                  {isCompleted && !isExpired && (
                    <div className="absolute top-4 right-4 z-10 px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-lg shadow-lg">
                      {lang === 'en' ? 'Completed' : 'Završeno'}
                    </div>
                  )}

                  {/* Course Image with Thumbnail */}
                  <div className="h-56 overflow-hidden relative">
                    {course.thumbnail ? (
                      <img 
                        src={course.thumbnail} 
                        alt={course.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                    ) : (
                      <div className={`w-full h-full ${getCategoryColor(course.category)} flex items-center justify-center`}>
                        <span className="text-4xl text-white/80">{getCategoryIcon(course.category)}</span>
                      </div>
                    )}
                    
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    {/* Category Tags */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-3 py-1.5 bg-white/90 backdrop-blur rounded-lg text-xs font-semibold text-gray-700 shadow-sm">
                        {course.category}
                      </span>
                      <span className="px-3 py-1.5 bg-gray-900/90 backdrop-blur rounded-lg text-xs font-semibold text-white shadow-sm">
                        v{course.version}
                      </span>
                    </div>
                    
                    {/* Duration Badge */}
                    <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur px-3 py-1.5 rounded-lg shadow-sm">
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {course.estimatedHours}h
                      </div>
                    </div>
                  </div>

                  {/* Course Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-6 line-clamp-2">
                      {course.description}
                    </p>
                    
                    {/* Progress Bar */}
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                          {lang === 'en' ? 'Progress' : 'Napredak'}
                        </span>
                        <span className="text-sm font-bold text-blue-600">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            progress === 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                            'bg-gradient-to-r from-blue-500 to-cyan-500'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Course Metadata */}
                    <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>{course.lessons.length} {lang === 'en' ? 'lessons' : 'lekcija'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{course.examQuestions} {lang === 'en' ? 'questions' : 'pitanja'}</span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/course/${course.id}`);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white text-sm font-semibold rounded-lg transition-all duration-300 hover:shadow-lg active:scale-95"
                      >
                        {lang === 'en' ? 'View Course' : 'Pogledaj kurs'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border-2 border-dashed border-gray-300">
            <div className="w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
              <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{t.noCoursesFound}</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {lang === 'en' 
                ? 'No courses match your search. Try a different term or browse all courses.'
                : 'Nijedan kurs ne odgovara vašoj pretrazi. Pokušajte s drugim pojmom ili pregledajte sve kurseve.'
              }
            </p>
            <button 
              onClick={() => setSearchTerm('')}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl font-semibold text-sm transition-all duration-300 hover:shadow-lg active:scale-95"
            >
              {t.clearSearch}
            </button>
          </div>
        )}
      </section>

      {/* Footer Section */}
      <footer className="mt-12 pt-8 border-t border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-gray-500 text-sm">
            <span className="font-semibold text-gray-700">CloudTraining Platform</span>
            <span className="mx-2">•</span>
            <span>{lang === 'en' ? 'Last updated' : 'Zadnje ažurirano'} {new Date().toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>{lang === 'en' ? 'System Online' : 'Sistem aktivan'}</span>
            </div>
            <div className="text-xs text-gray-400">
              v2.1.4 • {lang === 'en' ? 'Production' : 'Produkcija'}
            </div>
          </div>
        </div>
      </footer>

      {/* Add CSS animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: fadeIn 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;