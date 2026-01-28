
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
  const [randomizedQuestions, setRandomizedQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());
  const [showReview, setShowReview] = useState(false);
  const [historicalAttempt, setHistoricalAttempt] = useState<ExamAttempt | null>(null);

  useEffect(() => {
    if (courseId) {
      const c = db.getCourses().find(x => x.id === courseId);
      if (c && c.exam) {
        setCourse(c);

        if (reviewAttemptId) {
          // Historical Review Mode
          const progress = db.getUserProgress(user.id, c.id);
          const attempt = progress.attempts.find(a => a.id === reviewAttemptId);
          if (attempt && attempt.questionsSnapshot) {
            setHistoricalAttempt(attempt);
            setRandomizedQuestions(attempt.questionsSnapshot);
            setAnswers(attempt.answers);
            setScore(attempt.score);
            setIsSubmitted(true);
            setShowReview(true);
          } else {
            // Fallback or error if snapshot missing
            navigate(`/course/${c.id}`);
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
  }, [courseId, reviewAttemptId, user.id, navigate]);

  const handleSubmit = useCallback(() => {
    if (isSubmitted || !course || !course.exam) return;

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

    const progress = db.getUserProgress(user.id, course.id);
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

    db.updateProgress(updatedProgress);
    db.logAction(user.id, 'EXAM_SUBMIT', `Exam: ${course.title}, Score: ${finalScore}%, Passed: ${passed}, Duration: ${timeSpent}s`);
    
    setScore(finalScore);
    setIsSubmitted(true);
  }, [isSubmitted, course, randomizedQuestions, answers, user.id, startTime]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      }), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, isSubmitted, handleSubmit]);

  if (!course || !course.exam) return <div className="p-20 text-center font-black text-slate-400">Loading exam environment...</div>;

  if (isSubmitted) {
    const passed = score >= course.exam.passingScore;
    return (
      <div className="max-w-3xl mx-auto py-12 animate-in fade-in duration-500">
        <div className={`p-12 rounded-[3.5rem] shadow-2xl ${passed ? 'bg-green-50 border-2 border-green-100' : 'bg-red-50 border-2 border-red-100'} text-center mb-10`}>
          <div className={`w-28 h-28 rounded-full mx-auto flex items-center justify-center mb-8 text-5xl shadow-2xl ${passed ? 'bg-green-600 text-white shadow-green-600/30' : 'bg-red-600 text-white shadow-red-600/30'}`}>
            {passed ? '✓' : '✕'}
          </div>
          <h1 className="text-5xl font-black text-slate-900 mb-4 tracking-tighter">
            {historicalAttempt ? `Attempt Result` : (passed ? t.congratulations : t.almostThere)}
          </h1>
          <p className="text-slate-600 mb-12 text-2xl font-medium">
            {t.result}: <span className={`font-black ${passed ? 'text-green-600' : 'text-red-600'}`}>{score}%</span>
          </p>
          
          <div className="flex flex-col gap-4 max-w-sm mx-auto">
            {!historicalAttempt && (
              passed ? (
                <button onClick={() => navigate(`/course/${course.id}`)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl hover:bg-black transition-all hover:scale-105 active:scale-95">{t.returnToCourse}</button>
              ) : (
                <button onClick={() => window.location.reload()} className="w-full py-5 bg-red-600 text-white rounded-[2rem] font-black shadow-xl hover:bg-red-700 transition-all hover:scale-105 active:scale-95">{t.retakeExam}</button>
              )
            )}
            {historicalAttempt && (
              <button onClick={() => navigate(`/course/${course.id}`)} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black shadow-xl hover:bg-black transition-all active:scale-95">{t.returnToCourse}</button>
            )}
            <button 
              onClick={() => setShowReview(!showReview)} 
              className="w-full py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-[2rem] font-black shadow-sm hover:bg-slate-50 transition-all active:scale-95"
            >
              {showReview ? t.hideReview : t.reviewAnswers}
            </button>
            <button onClick={() => navigate('/dashboard')} className="mt-4 text-slate-400 font-black hover:text-slate-900 uppercase tracking-widest text-xs transition-colors underline underline-offset-8">{t.backToDashboard}</button>
          </div>
        </div>

        {showReview && (
          <div className="space-y-6 animate-in slide-in-from-bottom-8 duration-500 pb-20">
            <h2 className="text-2xl font-black text-slate-900 mb-8 px-6 uppercase tracking-tight">{t.reviewAnswers}</h2>
            {randomizedQuestions.map((q, idx) => {
              const userAns = answers[q.id];
              const isCorrect = userAns === q.correctOptionIndex;
              return (
                <div key={q.id} className={`p-10 rounded-[2.5rem] bg-white border-2 transition-all ${isCorrect ? 'border-green-100 shadow-green-500/5' : 'border-red-100 shadow-red-500/5'}`}>
                  <div className="flex items-start gap-6 mb-8">
                    <span className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 shadow-sm ${isCorrect ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-xl font-black text-slate-900 leading-tight mb-2">{q.text}</h3>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {isCorrect ? t.correct : t.incorrect}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {q.options.map((opt, optIdx) => {
                      const isUserSelection = userAns === optIdx;
                      const isCorrectOption = q.correctOptionIndex === optIdx;
                      
                      let appearance = "bg-slate-50 border-slate-100 text-slate-500";
                      if (isCorrectOption) appearance = "bg-green-50 border-green-200 text-green-700 ring-2 ring-green-600/10";
                      else if (isUserSelection && !isCorrect) appearance = "bg-red-50 border-red-200 text-red-700 ring-2 ring-red-600/10";

                      return (
                        <div key={optIdx} className={`p-6 rounded-2xl border-2 font-bold transition-all flex items-center gap-4 ${appearance}`}>
                          <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border-2 transition-colors ${
                            isCorrectOption ? 'bg-green-600 border-green-600 text-white' : 
                            (isUserSelection && !isCorrect) ? 'bg-red-600 border-red-600 text-white' :
                            'bg-white border-slate-200 text-slate-400'
                          }`}>
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="flex-1">{opt}</span>
                          {isUserSelection && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-white/50 rounded-lg shadow-sm border border-black/5">
                              {t.yourSelection}
                            </span>
                          )}
                          {isCorrectOption && !isUserSelection && (
                            <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-green-600 text-white rounded-lg shadow-lg">
                              {t.correctAnswer}
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
    <div className="max-w-3xl mx-auto pb-24 animate-in fade-in duration-700">
      <div className="sticky top-6 z-50 flex justify-center mb-12">
        <div className={`px-10 py-4 rounded-full font-black text-2xl shadow-2xl border-2 backdrop-blur-3xl transition-all duration-300 ${timeLeft < 60 ? 'bg-red-600 text-white border-red-400 animate-pulse' : 'bg-slate-900/90 text-white border-slate-700'}`}>
          <div className="flex items-center gap-3">
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <header className="mb-16 text-center">
        <div className="inline-block px-4 py-1.5 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-blue-200 shadow-sm">
          {t.finalExam}
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tighter leading-tight">{course.title}</h1>
        <p className="text-slate-400 mt-4 font-black uppercase tracking-[0.3em] text-xs">{t.passingScore}: <span className="text-blue-600">{course.exam.passingScore}%</span></p>
      </header>

      <div className="space-y-12">
        {randomizedQuestions.map((q, idx) => (
          <div key={q.id} className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 hover:border-blue-200 transition-all duration-500 hover:shadow-2xl hover:shadow-slate-200/50">
            <h3 className="text-2xl font-black text-slate-900 mb-10 flex items-start leading-tight">
              <span className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-sm mr-6 shrink-0 font-black shadow-xl shadow-slate-900/20">
                {idx + 1}
              </span>
              <span className="pt-1">{q.text}</span>
            </h3>
            <div className="grid grid-cols-1 gap-4">
              {q.options.map((opt, optIdx) => (
                <button
                  key={optIdx}
                  onClick={() => setAnswers({ ...answers, [q.id]: optIdx })}
                  className={`p-7 rounded-[1.8rem] border-2 text-left transition-all flex items-center group relative overflow-hidden ${
                    answers[q.id] === optIdx 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/20 scale-[1.02]' 
                      : 'bg-slate-50 border-slate-100 text-slate-700 hover:border-blue-200 hover:bg-white'
                  }`}
                >
                  <span className={`w-10 h-10 rounded-xl border-2 mr-5 flex items-center justify-center text-xs font-black transition-all duration-300 ${
                    answers[q.id] === optIdx ? 'bg-white border-white text-blue-600 rotate-[360deg]' : 'bg-white border-slate-200 text-slate-400 group-hover:border-blue-300'
                  }`}>
                    {String.fromCharCode(65 + optIdx)}
                  </span>
                  <span className="font-bold text-lg">{opt}</span>
                  {answers[q.id] === optIdx && (
                    <div className="absolute right-6 opacity-30">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div className="pt-16 flex flex-col items-center">
          <button 
            disabled={Object.keys(answers).length < randomizedQuestions.length}
            onClick={handleSubmit}
            className={`px-24 py-7 rounded-[2.5rem] font-black shadow-2xl transition-all text-2xl h-24 min-w-[320px] ${
              Object.keys(answers).length >= randomizedQuestions.length
                ? 'bg-slate-900 text-white hover:bg-black hover:scale-105 active:scale-95 shadow-slate-900/30' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 shadow-none'
            }`}
          >
            {t.submitExam}
          </button>
          <p className="mt-6 text-slate-400 text-xs font-black uppercase tracking-widest italic">
            {Object.keys(answers).length} / {randomizedQuestions.length} questions answered
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExamView;
