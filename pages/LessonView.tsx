
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Lesson, Progress, User } from '../types';
import { Language, translations } from '../translations';

const LessonView: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const { courseId, lessonId } = useParams<{ courseId: string, lessonId: string }>();
  const navigate = useNavigate();
  const t = translations[lang];
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (courseId && lessonId) {
      const c = db.getCourses().find(x => x.id === courseId);
      if (c) {
        setCourse(c);
        const l = c.lessons.find(x => x.id === lessonId);
        if (l) {
          setLesson(l);
          const p = db.getUserProgress(user.id, c.id);
          setProgress(p);

          // Logic for min learning time
          const startStr = p.lessonStartTimes[l.id];
          const startTime = startStr ? new Date(startStr).getTime() : Date.now();
          
          if (!startStr) {
            p.lessonStartTimes[l.id] = new Date().toISOString();
            db.updateProgress(p);
          }

          const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
          const requiredSeconds = (l.minLearningTimeMinutes || 0) * 60;
          setSecondsRemaining(Math.max(0, requiredSeconds - elapsedSeconds));
        }
      }
    }
  }, [courseId, lessonId, user.id]);

  // General session timer for time-spent tracking
  useEffect(() => {
    const sessionTimer = setInterval(() => setSessionSeconds(prev => prev + 1), 1000);
    return () => clearInterval(sessionTimer);
  }, []);

  // Sync min-time remaining timer
  useEffect(() => {
    if (secondsRemaining > 0) {
      const timer = setInterval(() => setSecondsRemaining(prev => Math.max(0, prev - 1)), 1000);
      return () => clearInterval(timer);
    }
  }, [secondsRemaining]);

  if (!course || !lesson) return <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest">Initializing lesson environment...</div>;

  const handleComplete = () => {
    if (secondsRemaining > 0 || showSuccess || isSaving) return;
    
    setIsSaving(true);
    if (progress) {
      const updatedIds = progress.completedLessonIds.includes(lesson.id)
        ? progress.completedLessonIds
        : [...progress.completedLessonIds, lesson.id];
      
      // Update total time spent
      const currentTimeSpent = progress.lessonTimeSpent?.[lesson.id] || 0;
      const updatedTimeSpent = {
        ...(progress.lessonTimeSpent || {}),
        [lesson.id]: currentTimeSpent + sessionSeconds
      };
      
      const updatedProgress = { 
        ...progress, 
        completedLessonIds: updatedIds,
        lessonTimeSpent: updatedTimeSpent
      };
      
      db.updateProgress(updatedProgress);
      
      // Show success feedback
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/course/${course.id}`);
      }, 2500);
    }
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-5xl mx-auto pb-20 relative animate-in fade-in duration-700">
      {/* Enhanced Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="text-center p-12 bg-white rounded-[4rem] shadow-2xl max-w-sm w-full animate-bounce-in">
            <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-500/40 relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
              <svg className="w-12 h-12 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter">{t.lessonCompletedSuccess}</h2>
            <p className="text-slate-500 font-bold text-lg leading-tight">{t.wellDone}</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(`/course/${course.id}`)}
          className="flex items-center text-slate-500 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all hover:-translate-x-1"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          {t.returnToCourse}
        </button>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-white px-5 py-2 rounded-full border border-slate-200 shadow-sm">
          {t.lesson} {lesson.order} <span className="mx-1 opacity-30">/</span> {course.lessons.length}
        </span>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
        <div className="p-10 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">{lesson.title}</h1>
            <p className="text-slate-500 mt-2 font-medium text-lg italic">{lesson.description}</p>
          </div>
          {secondsRemaining > 0 && (
            <div className="px-6 py-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 font-black text-xs shadow-inner flex items-center gap-4 animate-pulse">
              <span className="w-2.5 h-2.5 bg-amber-600 rounded-full shadow-[0_0_10px_rgba(217,119,6,0.5)]"></span>
              {t.timeLeftOnLesson.replace('{time}', formatTime(secondsRemaining))}
            </div>
          )}
        </div>

        <div className="p-10">
          <div className="space-y-16">
            {lesson.materials.map((m) => (
              <div key={m.id} className="space-y-6 group">
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${m.type === 'video' ? 'bg-red-50 text-red-600 border-red-100' : m.type === 'pdf' ? 'bg-blue-50 text-blue-600 border-blue-100' : m.type === 'pptx' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>{m.type}</span>
                  <h3 className="font-black uppercase tracking-tight text-slate-900 text-lg group-hover:text-blue-600 transition-colors">{m.title}</h3>
                </div>
                
                {m.type === 'video' && (
                  <div className="aspect-video w-full rounded-[2.5rem] overflow-hidden bg-slate-950 shadow-2xl border-4 border-slate-900 relative">
                     <div className="absolute inset-0 bg-blue-600/5 pointer-events-none"></div>
                    <iframe 
                      className="w-full h-full relative z-10"
                      src={m.url}
                      title={m.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                )}

                {m.type === 'pdf' && (
                  <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center group hover:border-blue-400 transition-all hover:bg-blue-50/30">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-slate-100 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                      <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-slate-900 font-black text-xl mb-6 tracking-tight">Reference Document: {m.title}</p>
                    <a 
                      href={m.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all inline-block shadow-2xl shadow-slate-900/20 active:scale-95"
                    >
                      Open PDF
                    </a>
                  </div>
                )}

                {m.type === 'pptx' && (
                  <div className="bg-orange-50 border-2 border-dashed border-orange-200 rounded-[2.5rem] p-16 text-center group hover:border-orange-400 transition-all hover:bg-orange-100/30">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl border border-orange-100 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                      <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-orange-900 font-black text-xl mb-6 tracking-tight">Presentation: {m.title}</p>
                    <a 
                      href={m.url} 
                      className="px-10 py-4 bg-orange-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-orange-700 transition-all inline-block shadow-2xl shadow-orange-600/20 active:scale-95"
                    >
                      Download PPTX
                    </a>
                  </div>
                )}

                {m.type === 'text' && (
                  <div className="prose prose-slate max-w-none bg-slate-50 p-12 rounded-[2.5rem] border border-slate-100 font-medium leading-relaxed shadow-inner text-lg">
                    {m.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-10 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-6 justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm border border-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             </div>
             <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Session Active</p>
                <p className="text-sm font-black text-slate-900 leading-none">{formatTime(sessionSeconds)}</p>
             </div>
          </div>
          <button 
            onClick={handleComplete}
            disabled={secondsRemaining > 0 || showSuccess || isSaving}
            className={`px-12 py-5 rounded-2xl font-black shadow-2xl transition-all flex items-center uppercase tracking-widest text-xs h-16 ${
              secondsRemaining > 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none' : 
              (showSuccess || isSaving) ? 'bg-green-600 text-white scale-95 shadow-green-600/20' : 
              'bg-blue-600 hover:bg-blue-700 text-white hover:scale-105 active:scale-95 shadow-blue-600/40'
            }`}
          >
            {isSaving || showSuccess ? (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                {t.lessonCompletedSuccess}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {t.markCompleted}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .animate-bounce-in {
          animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LessonView;
