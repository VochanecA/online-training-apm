import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { db } from '../db';
import { Course, Progress, User, Exam, Question, ExamAttempt } from '../types';
import { Language, translations } from '../translations';

const ExamView: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const t = translations[lang];
  
  // Check if we are in historical review mode
  const queryParams = new URLSearchParams(location.search);
  const reviewAttemptId = queryParams.get('review');

  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [randomizedQuestions, setRandomizedQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());
  const [showReview, setShowReview] = useState(false);
  const [historicalAttempt, setHistoricalAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCourseData = async () => {
      try {
        setLoading(true);
        if (courseId) {
          const c = await db.getCourse(courseId);
          if (c && c.exam) {
            setCourse(c);
            
            // Load progress
            const progressData = await db.getProgress(user.id, c.id);
            setProgress(progressData);

            if (reviewAttemptId) {
              // Historical Review Mode
              const attempt = progressData.attempts.find(a => a.id === reviewAttemptId);
              if (attempt && attempt.questionsSnapshot) {
                setHistoricalAttempt(attempt);
                setRandomizedQuestions(attempt.questionsSnapshot);
                setAnswers(attempt.answers);
                setScore(attempt.score);
                setIsSubmitted(true);
                setShowReview(true);
              } else {
                // Fallback or error if snapshot missing
                navigate(`/app/course/${c.id}`);
              }
            } else {
              // Live Exam Taking Mode
              setTimeLeft(c.exam.timeLimitMinutes * 60);

              let qs = [...c.exam.questions];
              if (c.exam.randomizeQuestions) {
                qs.sort(() => Math.random() - 0.5);
              }

              if (c.exam.questionBankDrawCount && c.exam.questionBankDrawCount > 0) {
                qs = qs.slice(0, c.exam.questionBankDrawCount);
              }

              if (c.exam.randomizeAnswers) {
                qs = qs.map(q => {
                  const correctText = q.options[q.correctOptionIndex];
                  const shuffledOptions = [...q.options].sort(() => Math.random() - 0.5);
                  return {
                    ...q,
                    options: shuffledOptions,
                    correctOptionIndex: shuffledOptions.indexOf(correctText)
                  };
                });
              }
              setRandomizedQuestions(qs);
            }
          }
        }
      } catch (error) {
        console.error('Error loading exam data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCourseData();
  }, [courseId, reviewAttemptId, user.id, navigate]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitted || !course || !course.exam || !progress) return;

    const exam = course.exam;
    let correctCount = 0;
    randomizedQuestions.forEach(q => {
      if (answers[q.id] === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / randomizedQuestions.length) * 100);
    const passed = finalScore >= exam.passingScore;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    const newAttempt: ExamAttempt = {
      id: `att-${Date.now()}`,
      timestamp: new Date().toISOString(),
      score: finalScore,
      passed,
      timeSpentSeconds: timeSpent,
      answers: { ...answers },
      questionsSnapshot: [...randomizedQuestions] // Crucial for historical review
    };

    const updatedAttempts = [...progress.attempts, newAttempt];
    
    const isNowCompleted = passed && (!course.requiresPracticalCheck || progress.practicalCheckCompleted);

    const updatedProgress: Progress = {
      ...progress,
      attempts: updatedAttempts,
      examScore: passed ? Math.max(progress.examScore || 0, finalScore) : progress.examScore,
      isCompleted: isNowCompleted || progress.isCompleted,
      completionDate: isNowCompleted ? new Date().toISOString() : progress.completionDate,
      certificateId: isNowCompleted ? `CERT-${course.id}-${Date.now().toString().slice(-6)}` : progress.certificateId,
      expiryDate: isNowCompleted ? new Date(new Date().setFullYear(new Date().getFullYear() + (course.validityYears || 2))).toISOString() : progress.expiryDate
    };

    await db.updateProgress(updatedProgress);
    await db.logAction(user.id, 'EXAM_SUBMIT', `Exam: ${course.title}, Score: ${finalScore}%, Passed: ${passed}, Duration: ${timeSpent}s`);
    
    setProgress(updatedProgress);
    setScore(finalScore);
    setIsSubmitted(true);
  }, [isSubmitted, course, randomizedQuestions, answers, progress, user.id, startTime]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted && course?.exam) {
      const timer = setInterval(() => setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      }), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, isSubmitted, handleSubmit, course]);

  if (loading) {
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

  if (!course || !course.exam) return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Exam not available
        </h3>
        <p className="text-gray-600 mb-4">This course doesn't have an exam configured.</p>
        <button
          onClick={() => navigate(`/app/course/${courseId}`)}
          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          Back to Course
        </button>
      </div>
    </div>
  );

  if (isSubmitted) {
    const passed = score >= course.exam.passingScore;
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        <div className={`p-8 rounded-2xl mb-6 ${passed ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${passed ? 'bg-green-600' : 'bg-red-600'}`}>
              {passed ? '✓' : '✗'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {historicalAttempt ? 'Attempt Result' : (passed ? t.congratulations || 'Congratulations!' : t.almostThere || 'Almost There!')}
              </h2>
              <p className="text-gray-600">
                {t.result || 'Result'}: <span className={`font-bold ${passed ? 'text-green-600' : 'text-red-600'}`}>{score}%</span>
              </p>
            </div>
          </div>
          
          <div className="space-y-4 max-w-md mx-auto">
            {!historicalAttempt && (
              passed ? (
                <button 
                  onClick={() => navigate(`/app/course/${course.id}`)} 
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  {t.returnToCourse || 'Return to Course'}
                </button>
              ) : (
                <button 
                  onClick={() => window.location.reload()} 
                  className="w-full py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
                >
                  {t.retakeExam || 'Retake Exam'}
                </button>
              )
            )}
            {historicalAttempt && (
              <button 
                onClick={() => navigate(`/app/course/${course.id}`)} 
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
              >
                {t.returnToCourse || 'Return to Course'}
              </button>
            )}
            
            <button 
              onClick={() => setShowReview(!showReview)} 
              className="w-full py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              {showReview ? (t.hideReview || 'Hide Review') : (t.reviewAnswers || 'Review Answers')}
            </button>
            
            <button 
              onClick={() => navigate('/app')} 
              className="w-full py-2 text-gray-600 hover:text-gray-900 font-medium"
            >
              {t.backToDashboard || 'Back to Dashboard'}
            </button>
          </div>
        </div>

        {showReview && (
          <div className="space-y-6 mt-8">
            <h3 className="text-lg font-bold text-gray-900">{t.reviewAnswers || 'Review Answers'}</h3>
            {randomizedQuestions.map((q, idx) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correctOptionIndex;
              return (
                <div key={q.id} className={`p-6 rounded-xl border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="flex items-start gap-4 mb-4">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-1">{q.text}</h4>
                      <p className={`text-xs font-medium ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {isCorrect ? t.correct || 'Correct' : t.incorrect || 'Incorrect'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {q.options.map((opt, optIdx) => {
                      const isUserSelection = userAns === optIdx;
                      const isCorrectOption = q.correctOptionIndex === optIdx;
                      
                      let appearance = "bg-white border-gray-200 text-gray-700";
                      if (isCorrectOption) appearance = "bg-green-50 border-green-200 text-green-700";
                      else if (isUserSelection && !isCorrect) appearance = "bg-red-50 border-red-200 text-red-700";

                      return (
                        <div key={optIdx} className={`p-4 rounded-lg border flex items-center gap-3 ${appearance}`}>
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            isCorrectOption ? 'bg-green-600 text-white' : 
                            (isUserSelection && !isCorrect) ? 'bg-red-600 text-white' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isUserSelection && (
                            <span className="text-xs font-medium bg-white/70 px-2 py-1 rounded">
                              {t.yourSelection || 'Your selection'}
                            </span>
                          )}
                          {isCorrectOption && !isUserSelection && (
                            <span className="text-xs font-medium bg-green-600 text-white px-2 py-1 rounded">
                              {t.correctAnswer || 'Correct answer'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => navigate(`/app/course/${course.id}`)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t.backToCourse || 'Back to Course'}
        </button>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t.finalExam || 'Final Exam'}</h1>
            <p className="text-gray-600">{course.title}</p>
          </div>
          
          <div className={`px-4 py-2 rounded-lg font-semibold ${timeLeft < 60 ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
          <p className="text-sm text-gray-700">
            {t.passingScore || 'Passing Score'}: <span className="font-bold text-blue-600">{course.exam.passingScore}%</span>
          </p>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {randomizedQuestions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-start">
              <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center text-sm mr-3">
                {idx + 1}
              </span>
              <span>{q.text}</span>
            </h3>
            
            <div className="space-y-3">
              {q.options.map((opt, optIdx) => (
                <button
                  key={optIdx}
                  onClick={() => setAnswers({ ...answers, [q.id]: optIdx })}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    answers[q.id] === optIdx
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center">
                    <span className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs mr-3 ${
                      answers[q.id] === optIdx
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    <span>{opt}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <div className="mt-8 pt-8 border-t border-gray-200">
        <button
          onClick={handleSubmit}
          disabled={Object.keys(answers).length < randomizedQuestions.length}
          className={`w-full py-4 rounded-xl font-semibold text-lg ${
            Object.keys(answers).length >= randomizedQuestions.length
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg transition-all'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {t.submitExam || 'Submit Exam'}
        </button>
        <p className="text-center text-gray-500 text-sm mt-2">
          {Object.keys(answers).length} / {randomizedQuestions.length} {t.questionsAnswered || 'questions answered'}
        </p>
      </div>
    </div>
  );
};

export default ExamView;