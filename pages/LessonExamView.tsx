import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, User, Exam, Question, Progress } from '../types';
import { Language, translations } from '../translations';

const LessonExamView: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const t = translations[lang];

  const [course, setCourse] = useState<Course | null>(null);
  const [lessonExam, setLessonExam] = useState<Exam | null>(null);
  const [randomizedQuestions, setRandomizedQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const loadExam = async () => {
      if (courseId && lessonId) {
        const c = await db.getCourse(courseId);
        if (c) {
          setCourse(c);
          const lesson = c.lessons.find(l => l.id === lessonId);
          
          if (lesson?.exam) {
            setLessonExam(lesson.exam);
            setTimeLeft(lesson.exam.timeLimitMinutes * 60);

            let qs = [...lesson.exam.questions];
            if (lesson.exam.randomizeQuestions) {
              qs.sort(() => Math.random() - 0.5);
            }

            if (lesson.exam.questionBankDrawCount && lesson.exam.questionBankDrawCount > 0) {
              qs = qs.slice(0, lesson.exam.questionBankDrawCount);
            }

            if (lesson.exam.randomizeAnswers) {
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
    };
    loadExam();
  }, [courseId, lessonId]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitted || !course || !lessonExam || !lessonId) return;

    let correctCount = 0;
    randomizedQuestions.forEach(q => {
      if (answers[q.id] === q.correctOptionIndex) {
        correctCount++;
      }
    });

    const finalScore = Math.round((correctCount / randomizedQuestions.length) * 100);
    const passed = finalScore >= lessonExam.passingScore;
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    // Ažurirajte progress - označite lekciju kao završenu
    const progress = await db.getProgress(user.id, course.id);
    
    // Dodajte lessonId u completedLessonIds ako nije već tamo
    const updatedCompletedLessonIds = progress.completedLessonIds.includes(lessonId)
      ? progress.completedLessonIds
      : [...progress.completedLessonIds, lessonId];

    const updatedProgress: Progress = {
      ...progress,
      completedLessonIds: updatedCompletedLessonIds,
      isCompleted: false // Ovo ostaje false dok se ne završi komplet kurs
    };

    await db.updateProgress(updatedProgress);
    
    // Loguj akciju
    await db.logAction(user.id, 'LESSON_EXAM_SUBMIT', 
      `Lesson: ${lessonId} in Course: ${course.title}, Score: ${finalScore}%, Passed: ${passed}`
    );

    setScore(finalScore);
    setIsSubmitted(true);

  }, [isSubmitted, course, lessonExam, lessonId, randomizedQuestions, answers, user.id, startTime]);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted && lessonExam) {
      const timer = setInterval(() => setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      }), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, isSubmitted, handleSubmit, lessonExam]);

  if (!course || !lessonExam) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No exam found for this lesson
          </h3>
          <p className="text-gray-600">This lesson doesn't have an exam configured.</p>
          <button
            onClick={() => navigate(`/app/course/${courseId}`)}
            className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  // Formatiraj vrijeme
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (isSubmitted) {
    const passed = score >= lessonExam.passingScore;
    const lesson = course.lessons.find(l => l.id === lessonId);
    
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
        <div className={`p-8 rounded-2xl mb-6 ${passed ? 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200' : 'bg-gradient-to-r from-red-50 to-pink-50 border border-red-200'}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${passed ? 'bg-green-600' : 'bg-red-600'}`}>
              {passed ? '✓' : '✗'}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {passed ? t.passed || 'Passed!' : t.failed || 'Not Passed'}
              </h2>
              <p className="text-gray-600">
                Lesson: {lesson?.title}
              </p>
            </div>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900 mb-2">
              Score: <span className={passed ? 'text-green-600' : 'text-red-600'}>{score}%</span>
            </p>
            <p className="text-gray-600 mb-4">
              Passing Score: {lessonExam.passingScore}%
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-8">
          <button
            onClick={() => navigate(`/app/course/${courseId}`)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
          >
            Back to Course
          </button>
          {!passed && (
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg transition-all"
            >
              Retake Exam
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <button 
          onClick={() => navigate(`/app/course/${courseId}`)} 
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors mb-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Course
        </button>
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lesson Exam</h1>
            <p className="text-gray-600">
              {course.title} • {course.lessons.find(l => l.id === lessonId)?.title}
            </p>
          </div>
          
          <div className={`px-4 py-2 rounded-lg font-semibold ${timeLeft < 60 ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
            Time: {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-6">
        {randomizedQuestions.map((q, idx) => (
          <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-6">
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
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:shadow-lg'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Submit Exam
        </button>
        <p className="text-center text-gray-500 text-sm mt-2">
          {Object.keys(answers).length} of {randomizedQuestions.length} questions answered
        </p>
      </div>
    </div>
  );
};

export default LessonExamView;