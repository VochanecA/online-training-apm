
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

  useEffect(() => {
    setCourses(db.getCourses());
    setAllProgress(db.getProgress());
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

  return (
    <div className="animate-in fade-in duration-700">
      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.welcomeBack}, {user.name}</h1>
          <p className="text-slate-500 mt-2">{t.overview}</p>
        </div>
        {user.role === UserRole.INSPECTOR && (
          <div className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl font-black text-[10px] uppercase tracking-widest border border-purple-200">
            Read-Only Inspector Access
          </div>
        )}
      </header>

      {/* Expiry Warnings */}
      {expiryWarnings.length > 0 && user.role === UserRole.TRAINEE && (
        <div className="mb-10 space-y-4">
          {expiryWarnings.map((warn, i) => (
            <div key={i} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${warn.days < 0 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${warn.days < 0 ? 'bg-red-600' : 'bg-amber-600'} text-white shadow-lg`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                </div>
                <div>
                  <h4 className="font-black text-slate-900 uppercase tracking-tighter">{t.expiryWarning}: {warn.courseTitle}</h4>
                  <p className={`text-xs font-bold ${warn.days < 0 ? 'text-red-600' : 'text-amber-700'}`}>
                    {warn.days < 0 ? t.expired : t.expiresIn.replace('{days}', warn.days.toString())}
                  </p>
                </div>
              </div>
              {warn.refresherId ? (
                <button onClick={() => navigate(`/course/${warn.refresherId}`)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">Start Refresher</button>
              ) : (
                <button onClick={() => navigate(`/course/${warn.courseId}`)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all">Review Course</button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-200 transition-colors">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t.activeCourses}</p>
          <h3 className="text-4xl font-black text-slate-900 mt-2">{courses.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-green-200 transition-colors">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t.certificatesEarned}</p>
          <h3 className="text-4xl font-black text-green-600 mt-2">
            {userProgress.filter(p => p.isCompleted).length}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-200 transition-colors">
          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t.avgExamScore}</p>
          <h3 className="text-4xl font-black text-blue-600 mt-2">
            {Math.round(userProgress.filter(p => p.examScore).reduce((acc, p) => acc + (p.examScore || 0), 0) / (userProgress.filter(p => p.examScore).length || 1))}%
          </h3>
        </div>
      </div>

      <section>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{t.courseRoadmap}</h2>
          <div className="relative w-full md:w-96 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input 
              type="text" 
              placeholder={t.searchCourses}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-slate-900 font-bold"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                aria-label={t.clearSearch}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        </div>

        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 transition-all duration-500">
            {filteredCourses.map(course => {
              const progress = getCompletionPercentage(course);
              const p = userProgress.find(up => up.courseId === course.id);
              const isExpired = p?.expiryDate && new Date(p.expiryDate) < new Date();

              return (
                <div 
                  key={course.id}
                  onClick={() => navigate(`/course/${course.id}`)}
                  className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 border border-slate-100 cursor-pointer relative animate-in fade-in slide-in-from-bottom-4 duration-500"
                >
                  {isExpired && (
                    <div className="absolute top-4 right-4 z-20 px-4 py-1.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-xl shadow-xl shadow-red-600/20 rotate-12">
                      {t.expired}
                    </div>
                  )}
                  <div className="h-52 overflow-hidden relative">
                    <img 
                      src={course.thumbnail} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute top-4 left-4 flex gap-2">
                      <span className="px-3 py-1 bg-white/95 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-xl border border-white">
                        {course.category}
                      </span>
                      <span className="px-3 py-1 bg-slate-900/90 backdrop-blur rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-xl">
                        v{course.version}
                      </span>
                    </div>
                  </div>
                  <div className="p-8">
                    <h3 className="text-xl font-black text-slate-900 leading-tight group-hover:text-blue-600 transition-colors tracking-tight">
                      {course.title}
                    </h3>
                    <p className="text-slate-500 text-sm mt-3 line-clamp-2 font-medium leading-relaxed">
                      {course.description}
                    </p>
                    
                    <div className="mt-8">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.progress}</span>
                        <span className="text-xs font-black text-blue-600">{progress}%</span>
                      </div>
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-50">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-24 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">{t.noCoursesFound}</p>
            <button onClick={() => setSearchTerm('')} className="mt-4 text-blue-600 font-black text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-4">{t.clearSearch}</button>
          </div>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
