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

        await db.debugCourses();
        
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
        
        if (!foundCourse.instructorId) {
          console.error('WARNING: Course has no instructorId!', foundCourse);
        }
        
        setCourse(foundCourse);
        
        console.log('Loading progress for user:', user.id, 'course:', foundCourse.id);
        const progressData = await db.getProgress(user.id, foundCourse.id);
        console.log('Progress loaded:', {
          completedLessons: progressData.completedLessonIds?.length || 0,
          attempts: progressData.attempts?.length || 0
        });
        
        setProgress(progressData);
        
        const authUsers = await db.getAuthUsers();
        console.log('Total auth users from Supabase:', authUsers.length);
        
        if (foundCourse.instructorId) {
          const foundInstructor = authUsers.find(u => u.id === foundCourse.instructorId);
          console.log('Looking for instructor with ID:', foundCourse.instructorId);
          console.log('Instructor found in auth users?', !!foundInstructor);
          
          if (foundInstructor) {
            setInstructor(foundInstructor);
          } else {
            console.warn('Instructor not found in auth users for ID:', foundCourse.instructorId);
            
            const localUsers = JSON.parse(localStorage.getItem('skyway_users') || '[]');
            const localInstructor = localUsers.find((u: User) => u.id === foundCourse.instructorId);
            
            if (localInstructor) {
              console.log('Found instructor in local storage as fallback');
              setInstructor(localInstructor);
            } else {
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
      
      await db.updateProgress(updatedProgress);
      
      await db.logAction(user.id, 'PRACTICAL_CHECK', 
        `Evaluated User: ${user.id} in Course: ${course.title} as ${practicalStatus}. Comment: ${practicalComment}`
      );
      
      setProgress(updatedProgress);
      setPracticalComment('');
      setPracticalStatus('COMPETENT');
      
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
      <div className="min-h-[80vh] flex items-center justify-center animate-fade-in">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-blue-600/20 rounded-full animate-ping"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-600 font-medium">
            {t.loading || 'Loading course details...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors mb-8"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t.backToDashboard || 'Back to Dashboard'}
        </button>
        
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-8 md:p-12 text-center border border-gray-200">
          <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Course Not Found</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Return to Dashboard
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Course data is not available
          </h3>
          <p className="text-gray-600">The requested course information could not be loaded.</p>
        </div>
      </div>
    );
  }

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPETENT': return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200';
      case 'NOT_YET_COMPETENT': return 'bg-gradient-to-r from-red-100 to-pink-100 text-red-800 border-red-200';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pb-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <button 
              onClick={() => navigate('/dashboard')} 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t.backToDashboard || 'Back to Dashboard'}
            </button>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {course.title}
              </h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base">
              {course.category} • v{course.version}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2 self-start lg:self-auto">
            <span className="px-4 py-2 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-lg font-medium border border-blue-200">
              {course.category}
            </span>
            <span className="px-4 py-2 bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 rounded-lg font-medium border border-gray-200">
              v{course.version}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Course Thumbnail & Stats */}
        <div className="lg:col-span-2">
          <div className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6">
            <img 
              src={course.thumbnail} 
              alt={course.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = 'https://images.unsplash.com/photo-1542296332-2e4473faf563?auto=format&fit=crop&w=800&q=80';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 via-transparent to-transparent"></div>
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <p className="text-sm font-medium mb-2 opacity-90">Course Overview</p>
              <p className="text-lg leading-relaxed max-w-3xl">
                {course.description || 'No description provided.'}
              </p>
            </div>
          </div>

          {/* Instructor Card */}
          {instructor && (
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Instructor Details</h3>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {instructor.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 text-lg mb-1">{instructor.name}</h4>
                  <p className="text-gray-600 text-sm mb-3">{instructor.email}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-3 py-1 bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 rounded-lg text-xs font-semibold border border-purple-200">
                      {instructor.role}
                    </span>
                    {instructor.instructorScope && (
                      <span className="px-3 py-1 bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-200">
                        Scope: {instructor.instructorScope}
                      </span>
                    )}
                  </div>
                  
                  {instructor.instructorAuthExpiry && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Authorization valid until: {new Date(instructor.instructorAuthExpiry).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Practical Check Section */}
          {course.requiresPracticalCheck && (
            <div className={`bg-gradient-to-br rounded-2xl border p-6 mb-6 ${
              progress?.practicalCheckCompleted 
                ? 'from-green-50 to-emerald-50 border-green-200' 
                : 'from-amber-50 to-orange-50 border-amber-200'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  progress?.practicalCheckCompleted 
                    ? 'bg-gradient-to-br from-green-100 to-emerald-100' 
                    : 'bg-gradient-to-br from-amber-100 to-orange-100'
                }`}>
                  <svg className={`w-5 h-5 ${
                    progress?.practicalCheckCompleted ? 'text-green-600' : 'text-amber-600'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Practical Check</h3>
              </div>
              
              {progress?.practicalCheckCompleted ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg font-semibold ${getStatusColor(progress.practicalCheckStatus || '')}`}>
                      {progress.practicalCheckStatus || 'COMPETENT'}
                    </span>
                    <p className="text-sm text-gray-600">
                      Confirmed by <span className="font-semibold">{progress.practicalCheckBy}</span> on {' '}
                      {progress.practicalCheckDate 
                        ? new Date(progress.practicalCheckDate).toLocaleDateString()
                        : 'unknown date'}
                    </p>
                  </div>
                  {progress.practicalCheckComment && (
                    <div className="p-4 bg-white/60 rounded-xl border border-gray-200">
                      <p className="text-gray-700 italic">"{progress.practicalCheckComment}"</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-gray-700">
                    {t.practicalCheckPending || 'Practical check pending approval.'}
                  </p>
                  
                  {user.role !== UserRole.TRAINEE && user.role !== UserRole.INSPECTOR && (
                    <div className="bg-white/80 p-6 rounded-2xl border border-gray-200 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <button 
                          onClick={() => setPracticalStatus('COMPETENT')} 
                          className={`p-4 rounded-xl border-2 transition-all ${
                            practicalStatus === 'COMPETENT' 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-600 text-white shadow-lg' 
                              : 'bg-white border-gray-200 text-gray-400 hover:border-green-400'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-semibold">COMPETENT</span>
                          </div>
                        </button>
                        <button 
                          onClick={() => setPracticalStatus('NOT_YET_COMPETENT')} 
                          className={`p-4 rounded-xl border-2 transition-all ${
                            practicalStatus === 'NOT_YET_COMPETENT' 
                              ? 'bg-gradient-to-r from-red-500 to-pink-500 border-red-600 text-white shadow-lg' 
                              : 'bg-white border-gray-200 text-gray-400 hover:border-red-400'
                          }`}
                        >
                          <div className="flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span className="font-semibold">NOT YET COMPETENT</span>
                          </div>
                        </button>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t.mentorComment || 'Mentor Comment'}
                        </label>
                        <textarea 
                          value={practicalComment} 
                          onChange={(e) => setPracticalComment(e.target.value)}
                          placeholder="Provide feedback on practical proficiency..."
                          className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          rows={3}
                        />
                      </div>

                      <button 
                        onClick={confirmPracticalCheck} 
                        className="w-full py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                      >
                        {t.confirmPractical || 'Confirm Practical Check'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Progress & Actions */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-6 sticky top-6">
            <h3 className="text-xl font-bold mb-6 tracking-tight">Completion Status</h3>
            
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-300">Progress</span>
                  <span className="font-semibold">{progressPercentage}%</span>
                </div>
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-500" 
                    style={{ width: `${progressPercentage}%` }} 
                  />
                </div>
                <p className="text-sm text-gray-400 text-center">
                  {progress?.completedLessonIds?.length || 0} of {course.lessons.length} lessons
                </p>
              </div>

              {/* Attempts */}
              <div className="bg-white/10 p-5 rounded-xl border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Attempts Remaining</span>
                  <span className="text-xl font-bold">
                    {maxAttempts - attemptsTaken} <span className="text-sm font-normal text-gray-400">/ {maxAttempts}</span>
                  </span>
                </div>
                {attemptsTaken > 0 && (
                  <p className="text-xs text-gray-400">
                    {attemptsTaken} attempt{attemptsTaken !== 1 ? 's' : ''} taken
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-4">
                {progress?.isCompleted ? (
                  <>
                    <button 
                      onClick={() => navigate(`/certificate/${course.id}`)} 
                      className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-3"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t.viewCertificate || 'View Certificate'}
                    </button>
                    <button 
                      onClick={() => navigate(`/training-record/${course.id}`)} 
                      className="w-full py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all"
                    >
                      {t.viewTrainingRecord || 'View Training Record'}
                    </button>
                  </>
                ) : isLocked ? (
                  <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                    <p className="text-red-200 text-sm font-semibold text-center">
                      {t.examLocked || 'Exam locked. Maximum attempts reached.'}
                    </p>
                  </div>
                ) : (
                  <button 
                    disabled={!allLessonsCompleted} 
                    onClick={handleStartExam} 
                    className={`w-full py-4 rounded-xl font-semibold shadow-lg transition-all ${
                      allLessonsCompleted 
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:shadow-xl text-white' 
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                  >
                    {t.takeExam || 'Take Exam'}
                  </button>
                )}
                
                {attemptsTaken > 0 && !progress?.isCompleted && (
                  <button 
                    onClick={handleReviewLatest} 
                    className="w-full py-3 bg-white/5 text-gray-300 rounded-xl text-sm hover:bg-white/10 transition-all"
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
                <p className="text-center text-xs text-gray-400">
                  {t.unlockExam || 'Complete all lessons to unlock the exam'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lessons Section */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Lessons</h2>
            <p className="text-gray-600 text-sm">{course.lessons.length} modules to complete</p>
          </div>
        </div>
        
        {course.lessons.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-2xl">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lessons Available</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              This course doesn't have any lessons yet. Please check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {course.lessons.map((lesson, idx) => {
              const isCompleted = progress?.completedLessonIds?.includes(lesson.id);
              return (
                <div 
                  key={lesson.id}
                  onClick={() => navigate(`/app/lesson/${course.id}/${lesson.id}`)}
                  className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                      isCompleted 
                        ? 'bg-gradient-to-br from-green-100 to-emerald-100' 
                        : 'bg-gradient-to-br from-blue-100 to-cyan-100 group-hover:from-blue-200 group-hover:to-cyan-200'
                    }`}>
                      <span className={`font-bold ${
                        isCompleted ? 'text-green-600' : 'text-blue-600 group-hover:text-blue-700'
                      }`}>
                        {isCompleted ? '✓' : idx + 1}
                      </span>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                          {lesson.title}
                        </h4>
                        {isCompleted && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Completed
                          </span>
                        )}
                      </div>
                      
                      {lesson.description && (
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {lesson.description}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span>{lesson.materials.length} materials</span>
                        </div>
                        
                        {lesson.minLearningTimeMinutes > 0 && (
                          <div className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{lesson.minLearningTimeMinutes}m</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0" 
                      fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseDetail;