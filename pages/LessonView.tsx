import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Lesson, Progress, User } from '../types';
import { Language, translations } from '../translations';

// Simulacija PowerPoint slajdova
const generateSlidesFromPPTX = (url: string): string[] => {
  return [
    'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=1200&h=675&fit=crop',
    'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1200&h=675&fit=crop',
    'https://images.unsplash.com/photo-1542744094-5d2e3fd4fd7e?w=1200&h=675&fit=crop',
    'https://images.unsplash.com/photo-1542744095-68b6e24b0d8d?w=1200&h=675&fit=crop',
  ];
};

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
  const [isLoading, setIsLoading] = useState(true);
  
  // PowerPoint viewer state
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slides, setSlides] = useState<string[]>([]);
  const [showPPTViewer, setShowPPTViewer] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadData = async () => {
      if (!courseId || !lessonId) return;
      
      try {
        setIsLoading(true);
        
        // Load course from Supabase
        const courseData = await db.getCourse(courseId);
        if (!courseData) {
          navigate('/dashboard');
          return;
        }
        
        setCourse(courseData);
        
        // Find lesson
        const lessonData = courseData.lessons.find(x => x.id === lessonId);
        if (!lessonData) {
          navigate(`/course/${courseId}`);
          return;
        }
        
        setLesson(lessonData);
        
        // Load progress from Supabase
        const progressData = await db.getProgress(user.id, courseId);
        setProgress(progressData);
        
        // Logic for min learning time
        const startStr = progressData.lessonStartTimes[lessonId];
        const startTime = startStr ? new Date(startStr).getTime() : Date.now();
        
        // If lesson hasn't been started yet, record start time
        if (!startStr) {
          const updatedStartTimes = {
            ...progressData.lessonStartTimes,
            [lessonId]: new Date().toISOString()
          };
          
          const updatedProgress = {
            ...progressData,
            lessonStartTimes: updatedStartTimes
          };
          
          await db.updateProgress(updatedProgress);
        }

        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        const requiredSeconds = (lessonData.minLearningTimeMinutes || 0) * 60;
        setSecondsRemaining(Math.max(0, requiredSeconds - elapsedSeconds));
        
      } catch (error) {
        console.error('Error loading lesson:', error);
        alert(lang === 'en' ? 'Error loading lesson' : 'Greška pri učitavanju lekcije');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [courseId, lessonId, user.id, lang, navigate]);

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

  // Handle fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const openPPTViewer = (url: string) => {
    const generatedSlides = generateSlidesFromPPTX(url);
    setSlides(generatedSlides);
    setCurrentSlide(0);
    setShowPPTViewer(true);
  };

  const closePPTViewer = () => {
    setShowPPTViewer(false);
    setSlides([]);
  };

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;

    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            {lang === 'en' ? 'Loading lesson...' : 'Učitavanje lekcije...'}
          </p>
        </div>
      </div>
    );
  }

  if (!course || !lesson) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-red-100 border-t-red-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">
          {lang === 'en' ? 'Lesson not found' : 'Lekcija nije pronađena'}
        </p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {lang === 'en' ? 'Go to Dashboard' : 'Idi na kontrolnu tablu'}
        </button>
      </div>
    </div>
  );

  const handleComplete = async () => {
    if (secondsRemaining > 0 || showSuccess || isSaving || !progress) return;
    
    try {
      setIsSaving(true);
      
      const updatedIds = progress.completedLessonIds.includes(lesson.id)
        ? progress.completedLessonIds
        : [...progress.completedLessonIds, lesson.id];
      
      const currentTimeSpent = progress.lessonTimeSpent?.[lesson.id] || 0;
      const updatedTimeSpent = {
        ...(progress.lessonTimeSpent || {}),
        [lesson.id]: currentTimeSpent + sessionSeconds
      };
      
      const updatedProgress: Progress = { 
        ...progress, 
        completedLessonIds: updatedIds,
        lessonTimeSpent: updatedTimeSpent
      };
      
      await db.updateProgress(updatedProgress);
      
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/course/${course.id}`);
      }, 2500);
    } catch (error) {
      console.error('Error completing lesson:', error);
      alert(lang === 'en' ? 'Error completing lesson' : 'Greška pri završetku lekcije');
      setIsSaving(false);
    }
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <>
      {/* PowerPoint Viewer Modal */}
      {showPPTViewer && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div 
            ref={viewerRef}
            className="relative bg-white rounded-2xl overflow-hidden w-full max-w-6xl h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
              <div className="flex items-center gap-4">
                <button
                  onClick={closePPTViewer}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title={lang === 'en' ? 'Close' : 'Zatvori'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div>
                  <h3 className="font-semibold">
                    {lang === 'en' ? 'Presentation Viewer' : 'Pregled prezentacije'}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {lang === 'en' ? 'Slide' : 'Slajd'} {currentSlide + 1} {lang === 'en' ? 'of' : 'od'} {slides.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title={isFullscreen 
                    ? (lang === 'en' ? 'Exit Fullscreen' : 'Izađi iz preko celog ekrana') 
                    : (lang === 'en' ? 'Enter Fullscreen' : 'Preko celog ekrana')}
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => window.open(slides[currentSlide], '_blank')}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title={lang === 'en' ? 'Download Slide' : 'Preuzmi slajd'}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Slide Container */}
            <div className="flex-1 flex items-center justify-center bg-gray-100 p-8 relative">
              <button
                onClick={prevSlide}
                disabled={currentSlide === 0}
                className={`absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${currentSlide === 0 ? 'invisible' : 'visible'}`}
                title={lang === 'en' ? 'Previous slide' : 'Prethodni slajd'}
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <div className="max-w-4xl w-full h-full flex items-center justify-center">
                <img
                  src={slides[currentSlide]}
                  alt={`Slide ${currentSlide + 1}`}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
              </div>

              <button
                onClick={nextSlide}
                disabled={currentSlide === slides.length - 1}
                className={`absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${currentSlide === slides.length - 1 ? 'invisible' : 'visible'}`}
                title={lang === 'en' ? 'Next slide' : 'Sledeći slajd'}
              >
                <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Footer - Slide Navigation */}
            <div className="p-4 bg-gray-900 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={prevSlide}
                    disabled={currentSlide === 0}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {lang === 'en' ? 'Previous' : 'Prethodni'}
                  </button>
                  <button
                    onClick={nextSlide}
                    disabled={currentSlide === slides.length - 1}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {lang === 'en' ? 'Next' : 'Sledeći'}
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-sm">{lang === 'en' ? 'Slide:' : 'Slajd:'}</span>
                  <select
                    value={currentSlide}
                    onChange={(e) => setCurrentSlide(parseInt(e.target.value))}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1 text-sm"
                  >
                    {slides.map((_, index) => (
                      <option key={index} value={index}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                  <span className="text-gray-400">/ {slides.length}</span>
                </div>

                <div className="flex gap-2">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-blue-500 scale-125' : 'bg-gray-700 hover:bg-gray-600'}`}
                      title={lang === 'en' ? `Go to slide ${index + 1}` : `Idi na slajd ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="text-center p-8 bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {lang === 'en' ? 'Lesson Completed!' : 'Lekcija završena!'}
            </h2>
            <p className="text-gray-600 mb-6">
              {lang === 'en' ? 'Redirecting to course...' : 'Preusmeravanje na kurs...'}
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full animate-progress" />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button 
            onClick={() => navigate(`/course/${course.id}`)}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {lang === 'en' ? 'Back to Course' : 'Nazad na kurs'}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                    {lang === 'en' ? 'Lesson' : 'Lekcija'} {lesson.order} {lang === 'en' ? 'of' : 'od'} {course.lessons.length}
                  </span>
                  {secondsRemaining > 0 && (
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-xs font-semibold rounded-full animate-pulse">
                      ⏱️ {formatTime(secondsRemaining)} {lang === 'en' ? 'remaining' : 'preostalo'}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
                <p className="text-gray-600 text-sm sm:text-base">{lesson.description}</p>
              </div>
            </div>
          </div>

          {/* Lesson Content */}
          <div className="p-6">
            <div className="space-y-8">
              {lesson.materials.map((material) => (
                <div key={material.id} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      material.type === 'video' ? 'bg-red-100 text-red-600' :
                      material.type === 'pdf' ? 'bg-blue-100 text-blue-600' :
                      material.type === 'pptx' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {material.type === 'video' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      {material.type === 'pdf' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      {material.type === 'pptx' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      )}
                      {material.type === 'text' && (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900 text-lg">{material.title}</h3>
                  </div>

                  {/* Content Based on Type */}
                  {material.type === 'video' && (
                    <div className="aspect-video w-full rounded-xl overflow-hidden bg-gray-900">
                      <iframe
                        className="w-full h-full"
                        src={material.url}
                        title={material.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {material.type === 'pdf' && (
                    <div className="bg-gradient-to-br from-blue-50 to-gray-50 border-2 border-dashed border-blue-200 rounded-xl p-6 sm:p-8 text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-900 font-medium mb-4">
                        {lang === 'en' ? 'Reference Document' : 'Referentni dokument'}
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <a
                          href={material.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                        >
                          {lang === 'en' ? 'Open PDF' : 'Otvori PDF'}
                        </a>
                        <a
                          href={material.url}
                          download
                          className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          {lang === 'en' ? 'Download' : 'Preuzmi'}
                        </a>
                      </div>
                    </div>
                  )}

                  {material.type === 'pptx' && (
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed border-orange-200 rounded-xl p-6 sm:p-8 text-center">
                      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                        <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-gray-900 font-medium mb-4">
                        {lang === 'en' ? 'Presentation:' : 'Prezentacija:'} {material.title}
                      </p>
                      <div className="flex flex-wrap gap-3 justify-center">
                        <button
                          onClick={() => openPPTViewer(material.url)}
                          className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                        >
                          {lang === 'en' ? 'View Presentation' : 'Pogledaj prezentaciju'}
                        </button>
                        <a
                          href={material.url}
                          download
                          className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                        >
                          {lang === 'en' ? 'Download PPTX' : 'Preuzmi PPTX'}
                        </a>
                      </div>
                    </div>
                  )}

                  {material.type === 'text' && (
                    <div className="prose prose-blue max-w-none bg-gray-50 p-6 rounded-xl border border-gray-200">
                      {material.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow border border-gray-200">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    {lang === 'en' ? 'Time Spent' : 'Provedeno vreme'}
                  </p>
                  <p className="font-semibold text-gray-900">{formatTime(sessionSeconds)}</p>
                </div>
              </div>

              <button
                onClick={handleComplete}
                disabled={secondsRemaining > 0 || showSuccess || isSaving}
                className={`px-8 py-4 rounded-lg font-semibold shadow-lg transition-all flex items-center gap-3 ${
                  secondsRemaining > 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : showSuccess || isSaving
                    ? 'bg-green-600 text-white'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-xl active:scale-95'
                }`}
              >
                {isSaving || showSuccess ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {lang === 'en' ? 'Completing...' : 'Završavanje...'}
                  </>
                ) : (
                  <>
                    {lang === 'en' ? 'Mark as Completed' : 'Označi kao završeno'}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        
        .animate-progress {
          animation: progress 2.5s linear forwards;
        }
        
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
};

export default LessonView;