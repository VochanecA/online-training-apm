
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Progress, User, UserRole, PracticalStatus } from '../types';
import { Language, translations } from '../translations';

const CourseDetail: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const t = translations[lang];
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [instructor, setInstructor] = useState<User | null>(null);
  const [practicalComment, setPracticalComment] = useState('');
  const [practicalStatus, setPracticalStatus] = useState<PracticalStatus>('COMPETENT');

  useEffect(() => {
    if (id) {
      const c = db.getCourses().find(x => x.id === id);
      if (c) {
        setCourse(c);
        setProgress(db.getUserProgress(user.id, c.id));
        const inst = db.getUsers().find(u => u.id === c.instructorId);
        if (inst) setInstructor(inst);
      }
    }
  }, [id, user.id]);

  if (!course) return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">Loading course...</div>;

  const allLessonsCompleted = course.lessons.length > 0 && 
    course.lessons.every(l => progress?.completedLessonIds.includes(l.id));

  const attemptsTaken = progress?.attempts.length || 0;
  const maxAttempts = course.exam?.maxAttempts || 3;
  const isLocked = attemptsTaken >= maxAttempts && !progress?.isCompleted;

  const handleStartExam = () => {
    if (isLocked) return;
    navigate(`/exam/${course.id}`);
  };

  const handleReviewLatest = () => {
    if (!progress || progress.attempts.length === 0) return;
    const latestAttempt = progress.attempts[progress.attempts.length - 1];
    navigate(`/exam/${course.id}?review=${latestAttempt.id}`);
  };

  const confirmPracticalCheck = () => {
    if (!progress || !course) return;
    const isNowCompetent = practicalStatus === 'COMPETENT';
    
    const updatedProgress: Progress = {
      ...progress,
      practicalCheckCompleted: isNowCompetent,
      practicalCheckStatus: practicalStatus,
      practicalCheckComment: practicalComment,
      practicalCheckBy: user.name,
      practicalCheckDate: new Date().toISOString()
    };
    
    const examPassed = progress.attempts.some(a => a.passed);
    if (examPassed && isNowCompetent) {
      updatedProgress.isCompleted = true;
      updatedProgress.completionDate = new Date().toISOString();
      updatedProgress.certificateId = `CERT-${course.id}-${Date.now().toString().slice(-6)}`;
      updatedProgress.expiryDate = new Date(new Date().setFullYear(new Date().getFullYear() + (course.validityYears || 2))).toISOString();
    }
    
    db.updateProgress(updatedProgress);
    db.logAction(user.id, 'PRACTICAL_CHECK', `Evaluated User: ${user.id} in Course: ${course.title} as ${practicalStatus}. Comment: ${practicalComment}`);
    setProgress(updatedProgress);
  };

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-4 pb-20">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-slate-500 hover:text-slate-900 mb-6 font-medium px-4 sm:px-0 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        {t.backToDashboard}
      </button>

      <div className="bg-white rounded-none sm:rounded-[3rem] shadow-none sm:shadow-sm border-0 sm:border border-slate-100 overflow-hidden">
        <div className="h-48 sm:h-72 relative">
          <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent flex items-end p-6 sm:p-10">
            <div>
              <div className="flex gap-2 mb-3">
                <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] sm:text-xs font-black text-white shadow-xl">{course.category}</span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-[10px] sm:text-xs font-black text-white border border-white/20">v{course.version}</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tighter leading-tight">{course.title}</h1>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 sm:gap-12">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="mb-8 sm:mb-10">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-4">{t.courseOverview}</h2>
                <p className="text-slate-600 leading-relaxed text-base sm:text-lg">{course.description}</p>
              </div>

              {instructor && (
                <div className="mb-8 sm:mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">{t.instructorDetails}</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center font-black text-white shadow-lg">
                      {instructor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-black text-slate-900">{instructor.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{t.authScope}: <span className="text-blue-600">{instructor.instructorScope || 'General Aviation'}</span></p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{t.authValidity}: <span className="text-blue-600">{instructor.instructorAuthExpiry ? new Date(instructor.instructorAuthExpiry).toLocaleDateString() : 'Lifetime'}</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {course.requiresPracticalCheck && (
                <div className={`p-6 sm:p-8 rounded-[2rem] border-2 mb-8 sm:mb-10 transition-all ${progress?.practicalCheckCompleted ? 'bg-green-50 border-green-100 shadow-inner' : 'bg-amber-50 border-amber-100 shadow-sm'}`}>
                  <h3 className="font-black text-lg text-slate-900 mb-3">{t.practicalCheck}</h3>
                  
                  {progress?.practicalCheckCompleted ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">{t.competent}</span>
                        <p className="text-xs sm:text-sm text-slate-600 font-bold">
                          Confirmed by {progress.practicalCheckBy} on {new Date(progress.practicalCheckDate!).toLocaleDateString()}
                        </p>
                      </div>
                      {progress.practicalCheckComment && (
                        <div className="p-4 bg-white/50 rounded-xl border border-green-200 text-xs text-slate-600 italic">
                          "{progress.practicalCheckComment}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-600 font-medium">{t.practicalCheckPending}</p>
                      
                      {user.role !== UserRole.TRAINEE && user.role !== UserRole.INSPECTOR && (
                        <div className="bg-white/60 p-6 rounded-2xl border border-amber-200 space-y-4">
                          <div className="flex gap-4">
                             <button onClick={() => setPracticalStatus('COMPETENT')} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${practicalStatus === 'COMPETENT' ? 'bg-green-600 border-green-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-green-400'}`}>
                               {t.competent}
                             </button>
                             <button onClick={() => setPracticalStatus('NOT_YET_COMPETENT')} className={`flex-1 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${practicalStatus === 'NOT_YET_COMPETENT' ? 'bg-red-600 border-red-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-red-400'}`}>
                               {t.notCompetent}
                             </button>
                          </div>
                          
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 px-1">{t.mentorComment}</label>
                            <textarea 
                              value={practicalComment} 
                              onChange={(e) => setPracticalComment(e.target.value)}
                              placeholder="Describe practical proficiency level..."
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
                              rows={2}
                            />
                          </div>

                          <button onClick={confirmPracticalCheck} className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-slate-900/10">
                            {t.confirmPractical}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-6">{t.lessons}</h2>
              <div className="space-y-3 sm:space-y-4">
                {course.lessons.map((lesson, idx) => {
                  const isCompleted = progress?.completedLessonIds.includes(lesson.id);
                  return (
                    <div key={lesson.id} onClick={() => navigate(`/lesson/${course.id}/${lesson.id}`)} className={`flex items-center p-4 sm:p-6 rounded-2xl border transition-all cursor-pointer group ${isCompleted ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-100 hover:border-blue-300 shadow-sm'}`}>
                      <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black mr-4 sm:mr-5 shrink-0 text-sm transition-colors ${isCompleted ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' : 'bg-slate-100 text-slate-900 group-hover:bg-blue-600 group-hover:text-white shadow-sm'}`}>
                        {isCompleted ? '✓' : idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">{lesson.title}</h4>
                        <div className="flex gap-3 items-center mt-1">
                          <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{lesson.materials.length} {t.learningMaterials}</p>
                          {lesson.minLearningTimeMinutes > 0 && (
                            <p className="text-[10px] text-blue-500 uppercase font-black tracking-widest">⏱ {lesson.minLearningTimeMinutes}m min</p>
                          )}
                        </div>
                      </div>
                      <svg className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] text-white shadow-2xl lg:sticky lg:top-8">
                <h3 className="font-black text-lg sm:text-xl mb-6 tracking-tight uppercase italic underline decoration-blue-500 decoration-4 underline-offset-8">{t.completionStatus}</h3>
                
                <div className="space-y-6">
                   <div>
                     <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">
                       <span>{t.progress}</span>
                       <span>{Math.round((progress?.completedLessonIds.length || 0) / (course.lessons.length || 1) * 100)}%</span>
                     </div>
                     <div className="h-2.5 sm:h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
                       <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${(progress?.completedLessonIds.length || 0) / (course.lessons.length || 1) * 100}%` }} />
                     </div>
                   </div>

                   <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10">
                     <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">{t.attemptsRemaining}</p>
                     <p className="text-xl sm:text-2xl font-black">{maxAttempts - attemptsTaken} <span className="text-xs font-medium opacity-40">/ {maxAttempts}</span></p>
                   </div>

                   <div className="space-y-3">
                     {progress?.isCompleted ? (
                       <>
                          <button onClick={() => navigate(`/certificate/${course.id}`)} className="w-full py-4 sm:py-5 bg-green-500 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {t.viewCertificate}
                          </button>
                          <button onClick={() => navigate(`/training-record/${course.id}`)} className="w-full py-4 sm:py-5 bg-white/10 text-white rounded-[1.5rem] font-black shadow-xl hover:bg-white/20 transition-all active:scale-95 text-sm uppercase tracking-widest">
                            {t.viewTrainingRecord}
                          </button>
                       </>
                     ) : isLocked ? (
                       <div className="p-5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-xs sm:text-sm font-bold text-center leading-snug">{t.examLocked}</div>
                     ) : (
                       <button disabled={!allLessonsCompleted} onClick={handleStartExam} className={`w-full py-4 sm:py-5 rounded-[1.5rem] font-black shadow-xl transition-all active:scale-95 ${allLessonsCompleted ? 'bg-blue-600 hover:bg-blue-700' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}>
                          {t.takeExam}
                       </button>
                     )}
                     
                     {attemptsTaken > 0 && (
                       <button onClick={handleReviewLatest} className="w-full py-3 bg-white/5 text-slate-400 rounded-[1rem] font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">
                         {t.latestAttemptReview}
                       </button>
                     )}
                   </div>
                   
                   {!allLessonsCompleted && <p className="text-center text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed px-4">{t.unlockExam}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
