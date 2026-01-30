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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
 const loadCourseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('=== COURSE DETAIL LOADING ===');
      console.log('Course ID from URL:', id);
      console.log('User ID:', user.id);
      
      if (!id) {
        console.error('Course ID is null or undefined');
        setError('Course ID not provided');
        return;
      }

      // DEBUG: Pozovi debug funkciju
      await db.debugCourses();
      
      // Učitaj kurs iz Supabase
      console.log('Loading specific course with ID:', id);
      const foundCourse = await db.getCourse(id);
      
      if (!foundCourse) {
        console.error('Course not found with ID:', id);
        setError(`Course with ID "${id}" not found`);
        return;
      }
      
      console.log('✅ Course loaded successfully:', {
        id: foundCourse.id,
        title: foundCourse.title,
        instructorId: foundCourse.instructorId,
        instructorIdExists: !!foundCourse.instructorId
      });
      
      // PROVERA: Da li instructorId postoji?
      if (!foundCourse.instructorId) {
        console.error('WARNING: Course has no instructorId!', foundCourse);
      }
      
      setCourse(foundCourse);
      
      // Učitaj progress iz Supabase
      console.log('Loading progress for user:', user.id, 'course:', foundCourse.id);
      const progressData = await db.getProgress(user.id, foundCourse.id);
      console.log('Progress loaded:', {
        completedLessons: progressData.completedLessonIds?.length || 0,
        attempts: progressData.attempts?.length || 0
      });
      
      setProgress(progressData);
      
      // ⭐⭐⭐⭐ OVO JE VAŽAN DEO - KORISTITE AUTH USERS ⭐⭐⭐⭐
      const authUsers = await db.getAuthUsers();
      console.log('Total auth users from Supabase:', authUsers.length);
      
      if (foundCourse.instructorId) {
        // Pronađite instruktora među auth korisnicima
        const foundInstructor = authUsers.find(u => u.id === foundCourse.instructorId);
        console.log('Looking for instructor with ID:', foundCourse.instructorId);
        console.log('Instructor found in auth users?', !!foundInstructor);
        
        if (foundInstructor) {
          setInstructor(foundInstructor);
        } else {
          console.warn('Instructor not found in auth users for ID:', foundCourse.instructorId);
          
          // Pokušajte da pronađete u lokalnim korisnicima kao fallback
          const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
          const localInstructor = localUsers.find((u: User) => u.id === foundCourse.instructorId);
          
          if (localInstructor) {
            console.log('Found instructor in local storage as fallback');
            setInstructor(localInstructor);
          } else {
            // Kreiraj placeholder instruktora
            console.log('Creating placeholder instructor');
            setInstructor({
              id: foundCourse.instructorId,
              email: 'unknown@example.com',
              name: 'Unknown Instructor',
              role: UserRole.INSTRUCTOR
            });
          }
        }
      } else {
        console.error('CRITICAL: Course has no instructorId at all!');
        // Stavi placeholder instructor
        setInstructor({
          id: 'missing-instructor',
          email: 'no-instructor@example.com',
          name: 'No Instructor Assigned',
          role: UserRole.INSTRUCTOR
        });
      }
      
    } catch (error) {
      console.error('Error loading course data:', error);
      setError(`Error loading course: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  loadCourseData();
}, [id, user.id]);

  const confirmPracticalCheck = async () => {
    if (!progress || !course || !user) return;
    
    try {
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
      
      // Ažuriraj progress u Supabase
      await db.updateProgress(updatedProgress);
      
      // Loguj akciju
      await db.logAction(user.id, 'PRACTICAL_CHECK', 
        `Evaluated User: ${user.id} in Course: ${course.title} as ${practicalStatus}. Comment: ${practicalComment}`
      );
      
      setProgress(updatedProgress);
      setPracticalComment('');
      setPracticalStatus('COMPETENT');
      
      // Prikaži potvrdu
      alert(t.practicalCheckConfirmed || 'Practical check confirmed');
    } catch (error) {
      console.error('Error confirming practical check:', error);
      alert('Error confirming practical check');
    }
  };

  const handleStartExam = () => {
    if (!course || !progress) return;
    
    const attemptsTaken = progress.attempts.length || 0;
    const maxAttempts = course.exam?.maxAttempts || 3;
    const isLocked = attemptsTaken >= maxAttempts && !progress.isCompleted;
    
    if (isLocked) {
      alert(t.examLocked || 'Exam is locked. Maximum attempts reached.');
      return;
    }
    
    const allLessonsCompleted = course.lessons.length > 0 && 
      course.lessons.every(l => progress.completedLessonIds.includes(l.id));
    
    if (!allLessonsCompleted) {
      alert(t.unlockExam || 'Complete all lessons to unlock the exam.');
      return;
    }
    
    navigate(`/exam/${course.id}`);
  };

  const handleReviewLatest = () => {
    if (!progress || progress.attempts.length === 0 || !course) return;
    
    const latestAttempt = progress.attempts[progress.attempts.length - 1];
    navigate(`/exam/${course.id}?review=${latestAttempt.id}`);
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-slate-400 font-bold uppercase tracking-widest">
            {t.loading || 'Loading course...'}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center text-slate-500 hover:text-slate-900 mb-6 font-medium transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.backToDashboard}
        </button>
        
        <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-100">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl  text-slate-900 mb-2">Course Not Found</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="text-center text-slate-400 font-bold uppercase tracking-widest">
          Course data is not available
        </div>
      </div>
    );
  }

  // Izračunaj statusne podatke
  const allLessonsCompleted = course.lessons.length > 0 && 
    progress?.completedLessonIds?.every(lessonId => 
      course.lessons.some(lesson => lesson.id === lessonId)
    );
  
  const attemptsTaken = progress?.attempts?.length || 0;
  const maxAttempts = course.exam?.maxAttempts || 3;
  const isLocked = attemptsTaken >= maxAttempts && !progress?.isCompleted;
  const progressPercentage = Math.round(
    ((progress?.completedLessonIds?.length || 0) / (course.lessons.length || 1)) * 100
  );

  return (
    <div className="max-w-5xl mx-auto px-0 sm:px-4 pb-20">
      <button onClick={() => navigate('/dashboard')} className="flex items-center text-slate-500 hover:text-slate-900 mb-6 font-medium px-4 sm:px-0 transition-colors">
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        {t.backToDashboard}
      </button>

      <div className="bg-white rounded-none sm:rounded-[3rem] shadow-none sm:shadow-sm border-0 sm:border border-slate-100 overflow-hidden">
        <div className="h-48 sm:h-72 relative">
          <img 
            src={course.thumbnail} 
            alt={course.title} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=400&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-transparent flex items-end p-6 sm:p-10">
            <div>
              <div className="flex gap-2 mb-3">
                <span className="px-3 py-1 bg-blue-600 rounded-full text-[10px] sm:text-xs  text-white shadow-xl">
                  {course.category}
                </span>
                <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-[10px] sm:text-xs  text-white border border-white/20">
                  v{course.version}
                </span>
              </div>
              <h1 className="text-2xl sm:text-4xl  text-white tracking-tighter leading-tight">
                {course.title}
              </h1>
              {course.id && (
                <p className="text-xs text-white/60 mt-2 font-mono">
                  ID: {course.id.substring(0, 8)}...
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 sm:gap-12">
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="mb-8 sm:mb-10">
                <h2 className="text-xl sm:text-2xl  text-slate-900 mb-4">
                  {t.courseOverview || 'Course Overview'}
                </h2>
                <p className="text-slate-600 leading-relaxed text-base sm:text-lg">
                  {course.description || 'No description provided.'}
                </p>
              </div>

              {instructor && (
                <div className="mb-8 sm:mb-10 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                  <h3 className="text-sm  text-slate-400 uppercase tracking-widest mb-4">
                    {t.instructorDetails || 'Instructor Details'}
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center  text-white shadow-lg">
                      {instructor.name.charAt(0)}
                    </div>
                    <div>
                      <p className=" text-slate-900">{instructor.name}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          {t.authScope || 'Authorization Scope'}:{' '}
                          <span className="text-blue-600">
                            {instructor.instructorScope || 'General Aviation'}
                          </span>
                        </p>
                        {instructor.instructorAuthExpiry && (
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                            {t.authValidity || 'Authorization Valid Until'}:{' '}
                            <span className="text-blue-600">
                              {new Date(instructor.instructorAuthExpiry).toLocaleDateString()}
                            </span>
                          </p>
                        )}
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                          Role: <span className="text-blue-600">{instructor.role}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {course.requiresPracticalCheck && (
                <div className={`p-6 sm:p-8 rounded-[2rem] border-2 mb-8 sm:mb-10 transition-all ${
                  progress?.practicalCheckCompleted 
                    ? 'bg-green-50 border-green-100 shadow-inner' 
                    : 'bg-amber-50 border-amber-100 shadow-sm'
                }`}>
                  <h3 className=" text-lg text-slate-900 mb-3">
                    {t.practicalCheck || 'Practical Check'}
                  </h3>
                  
                  {progress?.practicalCheckCompleted ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-600 text-white rounded-lg text-[10px]  uppercase tracking-widest">
                          {t.competent || 'COMPETENT'}
                        </span>
                        <p className="text-xs sm:text-sm text-slate-600 font-bold">
                          Confirmed by {progress.practicalCheckBy} on{' '}
                          {progress.practicalCheckDate 
                            ? new Date(progress.practicalCheckDate).toLocaleDateString()
                            : 'unknown date'
                          }
                        </p>
                      </div>
                      {progress.practicalCheckComment && (
                        <div className="p-4 bg-white/50 rounded-xl border border-green-200 text-xs text-slate-600">
                          "{progress.practicalCheckComment}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-slate-600 font-medium">
                        {t.practicalCheckPending || 'Practical check pending approval.'}
                      </p>
                      
                      {user.role !== UserRole.TRAINEE && user.role !== UserRole.INSPECTOR && (
                        <div className="bg-white/60 p-6 rounded-2xl border border-amber-200 space-y-4">
                          <div className="flex gap-4">
                            <button 
                              onClick={() => setPracticalStatus('COMPETENT')} 
                              className={`flex-1 py-3 rounded-xl border-2  text-[10px] uppercase tracking-widest transition-all ${
                                practicalStatus === 'COMPETENT' 
                                  ? 'bg-green-600 border-green-600 text-white shadow-lg' 
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-green-400'
                              }`}
                            >
                              {t.competent || 'COMPETENT'}
                            </button>
                            <button 
                              onClick={() => setPracticalStatus('NOT_YET_COMPETENT')} 
                              className={`flex-1 py-3 rounded-xl border-2  text-[10px] uppercase tracking-widest transition-all ${
                                practicalStatus === 'NOT_YET_COMPETENT' 
                                  ? 'bg-red-600 border-red-600 text-white shadow-lg' 
                                  : 'bg-white border-slate-200 text-slate-400 hover:border-red-400'
                              }`}
                            >
                              {t.notCompetent || 'NOT YET COMPETENT'}
                            </button>
                          </div>
                          
                          <div>
                            <label className="block text-[10px]  uppercase text-slate-400 mb-2 px-1">
                              {t.mentorComment || 'Mentor Comment'}
                            </label>
                            <textarea 
                              value={practicalComment} 
                              onChange={(e) => setPracticalComment(e.target.value)}
                              placeholder="Describe practical proficiency level..."
                              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
                              rows={2}
                            />
                          </div>

                          <button 
                            onClick={confirmPracticalCheck} 
                            className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs  uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-slate-900/10"
                          >
                            {t.confirmPractical || 'Confirm Practical Check'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <h2 className="text-xl sm:text-2xl  text-slate-900 mb-6">
                {t.lessons || 'Lessons'} ({course.lessons.length})
              </h2>
              {course.lessons.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-2xl">
                  <p className="text-slate-400">No lessons available for this course.</p>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  {course.lessons.map((lesson, idx) => {
                    const isCompleted = progress?.completedLessonIds?.includes(lesson.id);
                    return (
                      <div 
                        key={lesson.id} 
                    // U map funkciji za lekcije u CourseDetail.tsx
onClick={() => navigate(`/app/lesson/${course.id}/${lesson.id}`)}
                        className={`flex items-center p-4 sm:p-6 rounded-2xl border transition-all cursor-pointer group ${
                          isCompleted 
                            ? 'bg-slate-50 border-slate-100' 
                            : 'bg-white border-slate-100 hover:border-blue-300 shadow-sm'
                        }`}
                      >
                        <span className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center  mr-4 sm:mr-5 shrink-0 text-sm transition-colors ${
                          isCompleted 
                            ? 'bg-green-600 text-white shadow-lg shadow-green-600/20' 
                            : 'bg-slate-100 text-slate-900 group-hover:bg-blue-600 group-hover:text-white shadow-sm'
                        }`}>
                          {isCompleted ? '✓' : idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 truncate">{lesson.title}</h4>
                          <div className="flex gap-3 items-center mt-1">
                            <p className="text-[10px] text-slate-400 uppercase  tracking-widest">
                              {lesson.materials.length} {t.learningMaterials || 'learning materials'}
                            </p>
                            {lesson.minLearningTimeMinutes > 0 && (
                              <p className="text-[10px] text-blue-500 uppercase  tracking-widest">
                                ⏱ {lesson.minLearningTimeMinutes}m min
                              </p>
                            )}
                          </div>
                          {lesson.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                        <svg 
                          className="w-4 h-4 text-slate-300 shrink-0 group-hover:text-blue-400 transition-colors" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="order-1 lg:order-2">
              <div className="bg-slate-900 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] text-white shadow-2xl lg:sticky lg:top-8">
                <h3 className=" text-lg sm:text-xl mb-6 tracking-tight uppercase underline decoration-blue-500 decoration-4 underline-offset-8">
                  {t.completionStatus || 'Completion Status'}
                </h3>
                
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between text-[10px]  uppercase tracking-widest mb-2 opacity-60">
                      <span>{t.progress || 'Progress'}</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <div className="h-2.5 sm:h-3 bg-white/10 rounded-full overflow-hidden border border-white/10">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-500" 
                        style={{ width: `${progressPercentage}%` }} 
                      />
                    </div>
                    <p className="text-xs text-white/60 mt-1 text-center">
                      {progress?.completedLessonIds?.length || 0} of {course.lessons.length} lessons completed
                    </p>
                  </div>

                  <div className="bg-white/5 p-4 sm:p-5 rounded-2xl border border-white/10">
                    <p className="text-[10px]  uppercase tracking-widest opacity-40 mb-1">
                      {t.attemptsRemaining || 'Attempts Remaining'}
                    </p>
                    <p className="text-xl sm:text-2xl ">
                      {maxAttempts - attemptsTaken} <span className="text-xs font-medium opacity-40">/ {maxAttempts}</span>
                    </p>
                    {attemptsTaken > 0 && (
                      <p className="text-xs text-white/60 mt-1">
                        {attemptsTaken} attempt{attemptsTaken !== 1 ? 's' : ''} taken
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    {progress?.isCompleted ? (
                      <>
                        <button 
                          onClick={() => navigate(`/certificate/${course.id}`)} 
                          className="w-full py-4 sm:py-5 bg-green-500 text-white rounded-[1.5rem]  shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {t.viewCertificate || 'View Certificate'}
                        </button>
                        <button 
                          onClick={() => navigate(`/training-record/${course.id}`)} 
                          className="w-full py-4 sm:py-5 bg-white/10 text-white rounded-[1.5rem]  shadow-xl hover:bg-white/20 transition-all active:scale-95 text-sm uppercase tracking-widest"
                        >
                          {t.viewTrainingRecord || 'View Training Record'}
                        </button>
                      </>
                    ) : isLocked ? (
                      <div className="p-5 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-xs sm:text-sm font-bold text-center leading-snug">
                        {t.examLocked || 'Exam locked. Maximum attempts reached.'}
                      </div>
                    ) : (
                      <button 
                        disabled={!allLessonsCompleted} 
                        onClick={handleStartExam} 
                        className={`w-full py-4 sm:py-5 rounded-[1.5rem]  shadow-xl transition-all active:scale-95 ${
                          allLessonsCompleted 
                            ? 'bg-blue-600 hover:bg-blue-700' 
                            : 'bg-white/5 text-white/20 cursor-not-allowed'
                        }`}
                      >
                        {t.takeExam || 'Take Exam'}
                      </button>
                    )}
                    
                    {attemptsTaken > 0 && !progress?.isCompleted && (
                      <button 
                        onClick={handleReviewLatest} 
                        className="w-full py-3 bg-white/5 text-slate-400 rounded-[1rem]  text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                      >
                        {t.latestAttemptReview || 'Review Latest Attempt'}
                      </button>
                    )}
                    
                    {!course.exam && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                        <p className="text-xs text-amber-200 text-center">
                          No exam configured for this course
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {!allLessonsCompleted && !progress?.isCompleted && (
                    <p className="text-center text-[9px] sm:text-[10px] font-bold text-white/40 uppercase tracking-widest leading-relaxed px-4">
                      {t.unlockExam || 'Complete all lessons to unlock the exam'}
                    </p>
                  )}
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