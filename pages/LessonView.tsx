import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Lesson, Progress, User, Material } from '../types';
import { Language, translations } from '../translations';
import PDFViewer from '../components/PDFViewer';


// ============================================
// VIDEO VIEWER COMPONENT
// ============================================
const VideoViewer: React.FC<{ 
  url: string; 
  title: string;
  onClose: () => void;
  lang: Language;
  allowDownload: boolean;
  onActiveTimeChange: (isActive: boolean) => void;
}> = ({ url, title, onClose, lang, allowDownload, onActiveTimeChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);

  useEffect(() => {
    onActiveTimeChange(true);
    lastActivityRef.current = Date.now();
    isActiveRef.current = true;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (!isActiveRef.current) {
        isActiveRef.current = true;
        onActiveTimeChange(true);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);

    activityTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (isActiveRef.current && (now - lastActivityRef.current) > 30000) {
        isActiveRef.current = false;
        onActiveTimeChange(false);
      }
    }, 5000);

    return () => {
      onActiveTimeChange(false);
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [onActiveTimeChange]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      lastActivityRef.current = Date.now();
    };
    
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => {
      setIsPlaying(true);
      onActiveTimeChange(true);
      isActiveRef.current = true;
    };
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [onActiveTimeChange]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
    lastActivityRef.current = Date.now();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    lastActivityRef.current = Date.now();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
    }
    lastActivityRef.current = Date.now();
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => lastActivityRef.current = Date.now()}
    >
      <div className="relative bg-gray-900 rounded-2xl overflow-hidden w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-all hover:scale-105 active:scale-95"
              title={lang === 'en' ? 'Close' : 'Zatvori'}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white truncate">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                  {lang === 'en' ? 'Video' : 'Video'}
                </span>
                {!isActiveRef.current && !isPlaying && (
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    {lang === 'en' ? 'Paused' : 'Pauzirano'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {allowDownload && (
              <a
                href={url}
                download
                className="p-2 hover:bg-gray-800 rounded-lg transition-all hover:scale-105 active:scale-95"
                title={lang === 'en' ? 'Download' : 'Preuzmi'}
                onClick={() => lastActivityRef.current = Date.now()}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Video Container */}
        <div className="flex-1 relative bg-black">
          <video
            ref={videoRef}
            src={url}
            className="w-full h-full object-contain"
            onClick={togglePlay}
            controls={false}
          />
          
          {/* Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6">
            <div className="space-y-4 max-w-4xl mx-auto">
              {/* Progress Bar */}
              <div className="w-full">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
                  }}
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Play/Pause */}
                  <button
                    onClick={togglePlay}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-all hover:scale-105 active:scale-95"
                    type="button"
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    )}
                  </button>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={handleVolumeChange}
                      className="w-24 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                    />
                  </div>
                </div>

                {/* Fullscreen */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.requestFullscreen();
                      lastActivityRef.current = Date.now();
                    }
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-105 active:scale-95"
                  title={lang === 'en' ? 'Fullscreen' : 'Preko celog ekrana'}
                  type="button"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// POWERPOINT VIEWER COMPONENT
// ============================================
const PowerPointViewer: React.FC<{ 
  url: string; 
  title: string;
  onClose: () => void;
  lang: Language;
  allowDownload: boolean;
  onActiveTimeChange: (isActive: boolean) => void;
}> = ({ url, title, onClose, lang, allowDownload, onActiveTimeChange }) => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [totalSlides, setTotalSlides] = useState(15);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);

  useEffect(() => {
    onActiveTimeChange(true);
    lastActivityRef.current = Date.now();
    isActiveRef.current = true;

    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (!isActiveRef.current) {
        isActiveRef.current = true;
        onActiveTimeChange(true);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);

    activityTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (isActiveRef.current && (now - lastActivityRef.current) > 30000) {
        isActiveRef.current = false;
        onActiveTimeChange(false);
      }
    }, 5000);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      lastActivityRef.current = Date.now();
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      onActiveTimeChange(false);
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [onActiveTimeChange]);

  const nextSlide = () => {
    if (currentSlide < totalSlides) {
      setCurrentSlide(prev => prev + 1);
      lastActivityRef.current = Date.now();
    }
  };

  const prevSlide = () => {
    if (currentSlide > 1) {
      setCurrentSlide(prev => prev - 1);
      lastActivityRef.current = Date.now();
    }
  };

  const toggleFullscreen = () => {
    if (!viewerRef.current) return;

    if (!document.fullscreenElement) {
      viewerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
    lastActivityRef.current = Date.now();
  };

  const handleSlideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slide = parseInt(e.target.value);
    if (slide >= 1 && slide <= totalSlides) {
      setCurrentSlide(slide);
      lastActivityRef.current = Date.now();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => lastActivityRef.current = Date.now()}
    >
      <div 
        ref={viewerRef}
        className="relative bg-white rounded-2xl overflow-hidden w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-all hover:scale-105 active:scale-95"
              title={lang === 'en' ? 'Close' : 'Zatvori'}
              type="button"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="min-w-0">
              <h3 className="font-semibold text-white truncate">{title}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full">
                  {lang === 'en' ? 'Presentation' : 'Prezentacija'}
                </span>
                <span className="text-xs text-gray-400">
                  {lang === 'en' ? 'Slide' : 'Slajd'} {currentSlide} / {totalSlides}
                </span>
                {!isActiveRef.current && (
                  <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    {lang === 'en' ? 'Paused' : 'Pauzirano'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-800 rounded-lg transition-all hover:scale-105 active:scale-95"
              title={isFullscreen 
                ? (lang === 'en' ? 'Exit Fullscreen' : 'Izađi iz preko celog ekrana') 
                : (lang === 'en' ? 'Enter Fullscreen' : 'Preko celog ekrana')}
              type="button"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
                </svg>
              )}
            </button>
            {allowDownload && (
              <a
                href={url}
                download
                className="p-2 hover:bg-gray-800 rounded-lg transition-all hover:scale-105 active:scale-95"
                title={lang === 'en' ? 'Download' : 'Preuzmi'}
                onClick={() => lastActivityRef.current = Date.now()}
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 relative flex items-center justify-center p-8">
          {/* Navigation Buttons */}
          <button
            onClick={prevSlide}
            disabled={currentSlide === 1}
            className="absolute left-4 p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 z-10"
            title={lang === 'en' ? 'Previous slide' : 'Prethodni slajd'}
            type="button"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Slide Content */}
          <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="text-center">
              {/* Slide Icon */}
              <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              
              {/* Slide Info */}
              <h4 className="text-2xl font-bold text-gray-900 mb-3">
                {lang === 'en' ? 'PowerPoint Presentation' : 'PowerPoint prezentacija'}
              </h4>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full mb-6">
                <span className="text-sm font-medium text-gray-700">
                  {lang === 'en' ? 'Slide' : 'Slajd'} {currentSlide}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600">
                  {lang === 'en' ? 'of' : 'od'} {totalSlides}
                </span>
              </div>
              
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {lang === 'en' 
                  ? 'This is a preview of the PowerPoint presentation. In a real application, actual slides would be displayed here.'
                  : 'Ovo je pregled PowerPoint prezentacije. U realnoj aplikaciji, ovde bi bili prikazani stvarni slajdovi.'}
              </p>
              
              {/* Slide Navigation Dots */}
              <div className="flex justify-center gap-2 mt-8">
                {[...Array(Math.min(8, totalSlides))].map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentSlide(index + 1);
                      lastActivityRef.current = Date.now();
                    }}
                    className={`w-3 h-3 rounded-full transition-all ${
                      index + 1 === currentSlide 
                        ? 'bg-orange-600 scale-125' 
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    title={lang === 'en' ? `Go to slide ${index + 1}` : `Idi na slajd ${index + 1}`}
                    type="button"
                  />
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={nextSlide}
            disabled={currentSlide === totalSlides}
            className="absolute right-4 p-3 rounded-full bg-white shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 z-10"
            title={lang === 'en' ? 'Next slide' : 'Sledeći slajd'}
            type="button"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Footer Controls */}
        <div className="px-6 py-4 bg-gray-900 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={prevSlide}
                disabled={currentSlide === 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                type="button"
              >
                {lang === 'en' ? 'Previous' : 'Prethodni'}
              </button>
              <button
                onClick={nextSlide}
                disabled={currentSlide === totalSlides}
                className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                type="button"
              >
                {lang === 'en' ? 'Next' : 'Sledeći'}
              </button>
            </div>
            
            {/* Slide Counter */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{lang === 'en' ? 'Go to slide:' : 'Idi na slajd:'}</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={totalSlides}
                  value={currentSlide}
                  onChange={handleSlideChange}
                  className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <span className="text-gray-400">/ {totalSlides}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// TYPES
// ============================================
interface FileInfo {
  url: string;
  name: string;
  type: string;
  size: number;
}

// ============================================
// MAIN LESSON VIEW COMPONENT
// ============================================
const LessonView: React.FC<{ user: User; lang: Language }> = ({ user, lang }) => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const t = translations[lang];
  
  // State Management
  const [course, setCourse] = useState<Course | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [activeLearningSeconds, setActiveLearningSeconds] = useState(0);
  const [totalTimeSpent, setTotalTimeSpent] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [fileInfos, setFileInfos] = useState<Record<string, FileInfo>>({});
  
  const [activeViewer, setActiveViewer] = useState<'pdf' | 'video' | 'pptx' | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  
  const activeLearningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveProgressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLearningActive, setIsLearningActive] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================
  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (!courseId || !lessonId) {
        console.error('Missing courseId or lessonId');
        navigate('/dashboard');
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Load course data
        const courseData = await db.getCourse(courseId);
        if (!courseData) {
          alert(lang === 'en' ? 'Course not found' : 'Kurs nije pronađen');
          navigate('/dashboard');
          return;
        }
        
        setCourse(courseData);
        
        // Find lesson
        const lessonData = courseData.lessons.find(x => x.id === lessonId);
        if (!lessonData) {
          alert(lang === 'en' ? 'Lesson not found' : 'Lekcija nije pronađena');
          navigate(`/course/${courseId}`);
          return;
        }
        
        setLesson(lessonData);
        
        // Process file information
        const fileInfoMap: Record<string, FileInfo> = {};
        for (const material of lessonData.materials) {
          try {
            if (material.url && material.url.startsWith('http')) {
              const urlParts = material.url.split('/');
              const fileName = urlParts[urlParts.length - 1];
              const decodedFileName = decodeURIComponent(fileName);
              
              let displayName = decodedFileName;
              const underscoreIndex = decodedFileName.indexOf('_');
              if (underscoreIndex !== -1) {
                displayName = decodedFileName.substring(underscoreIndex + 1);
              }
              
              let fileType = 'application/octet-stream';
              if (material.type === 'pdf') fileType = 'application/pdf';
              else if (material.type === 'video') fileType = 'video/mp4';
              else if (material.type === 'pptx') fileType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
              else if (material.type === 'text') fileType = 'text/plain';
              
              fileInfoMap[material.id] = {
                url: material.url,
                name: material.title || displayName || 'Untitled',
                type: fileType,
                size: 0
              };
            }
          } catch (error) {
            console.warn(`Error processing file info for material ${material.id}:`, error);
          }
        }
        
        setFileInfos(fileInfoMap);
        
        // Load progress
        try {
          const progressData = await db.getProgress(user.id, courseId);
          setProgress(progressData);
          
          const previousTimeSpent = progressData.lessonTimeSpent?.[lessonId] || 0;
          setTotalTimeSpent(previousTimeSpent);
          setActiveLearningSeconds(0);
          
          const isLessonCompleted = progressData.completedLessonIds?.includes(lessonId);
          
          if (!isLessonCompleted) {
            const startStr = progressData.lessonStartTimes?.[lessonId];
            
            if (!startStr) {
              const updatedStartTimes = {
                ...(progressData.lessonStartTimes || {}),
                [lessonId]: new Date().toISOString()
              };
              
              const updatedProgress = {
                ...progressData,
                lessonStartTimes: updatedStartTimes
              };
              
              await db.updateProgress(updatedProgress);
              setProgress(updatedProgress);
            }

            const requiredSeconds = (lessonData.minLearningTimeMinutes || 0) * 60;
            const remaining = Math.max(0, requiredSeconds - previousTimeSpent);
            setSecondsRemaining(remaining);
            
            if (isLessonCompleted) {
              setSecondsRemaining(0);
            }
          } else {
            setSecondsRemaining(0);
          }
        } catch (progressError) {
          console.error('Error loading progress:', progressError);
        }
        
      } catch (error) {
        console.error('Error loading lesson:', error);
        alert(lang === 'en' ? 'Error loading lesson' : 'Greška pri učitavanju lekcije');
        navigate('/dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    void loadData();
  }, [courseId, lessonId, user.id, lang, navigate]);

  useEffect(() => {
    if (!lessonId || !progress) return;

    if (activeLearningTimerRef.current) {
      clearInterval(activeLearningTimerRef.current);
    }
    if (saveProgressTimerRef.current) {
      clearInterval(saveProgressTimerRef.current);
    }

    if (isLearningActive) {
      activeLearningTimerRef.current = setInterval(() => {
        setActiveLearningSeconds(prev => {
          const newTime = prev + 1;
          
          if (secondsRemaining > 0) {
            setSecondsRemaining(prevRemaining => Math.max(0, prevRemaining - 1));
          }
          
          if (newTime % 30 === 0) {
            saveProgressToSupabase(newTime);
          }
          
          return newTime;
        });
      }, 1000);
    }

    saveProgressTimerRef.current = setInterval(() => {
      if (isLearningActive && activeLearningSeconds > 0) {
        saveProgressToSupabase(activeLearningSeconds);
      }
    }, 30000);

    return () => {
      if (activeLearningTimerRef.current) {
        clearInterval(activeLearningTimerRef.current);
      }
      if (saveProgressTimerRef.current) {
        clearInterval(saveProgressTimerRef.current);
      }
      
      if (isLearningActive && activeLearningSeconds > 0 && progress && lessonId) {
        saveProgressToSupabase(activeLearningSeconds, true);
      }
    };
  }, [isLearningActive, progress, lessonId, secondsRemaining]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleActiveTimeChange = (isActive: boolean) => {
    setIsLearningActive(isActive);
    
    if (!isActive && activeLearningSeconds > 0) {
      saveProgressToSupabase(activeLearningSeconds);
    }
  };

  const saveProgressToSupabase = async (currentActiveSeconds: number, isFinalSave = false) => {
    if (!progress || !lessonId) return;
    
    try {
      const previousTimeSpent = progress.lessonTimeSpent?.[lessonId] || 0;
      const newTimeSpent = previousTimeSpent + currentActiveSeconds;
      
      const updatedTimeSpent = {
        ...(progress.lessonTimeSpent || {}),
        [lessonId]: newTimeSpent
      };
      
      const updatedProgress: Progress = { 
        ...progress, 
        lessonTimeSpent: updatedTimeSpent
      };
      
      await db.updateProgress(updatedProgress);
      setProgress(updatedProgress);
      setTotalTimeSpent(newTimeSpent);
      
      if (isFinalSave) {
        setActiveLearningSeconds(0);
      }
      
    } catch (error) {
      console.error('Error saving active learning progress to Supabase:', error);
    }
  };

  const openViewer = (material: Material, type: 'pdf' | 'video' | 'pptx'): void => {
    setActiveMaterial(material);
    setActiveViewer(type);
    setIsLearningActive(true);
  };

  const closeViewer = (): void => {
    setActiveViewer(null);
    setActiveMaterial(null);
    setIsLearningActive(false);
  };

  const handleComplete = async (): Promise<void> => {
    if (secondsRemaining > 0 || showSuccess || isSaving || !progress) {
      if (secondsRemaining > 0) {
        alert(lang === 'en' 
          ? `Please spend ${formatTime(secondsRemaining)} more active minutes on this lesson before completing it.` 
          : `Molimo provedite još ${formatTime(secondsRemaining)} aktivnih minuta na ovoj lekciji pre nego što je završite.`);
      }
      return;
    }
    
    try {
      setIsSaving(true);
      
      const updatedIds = progress.completedLessonIds?.includes(lessonId!)
        ? progress.completedLessonIds
        : [...(progress.completedLessonIds || []), lessonId!];
      
      const currentTimeSpent = progress.lessonTimeSpent?.[lessonId!] || 0;
      const updatedTimeSpent = {
        ...(progress.lessonTimeSpent || {}),
        [lessonId!]: currentTimeSpent + activeLearningSeconds
      };
      
      const updatedProgress: Progress = { 
        ...progress, 
        completedLessonIds: updatedIds,
        lessonTimeSpent: updatedTimeSpent
      };
      
      await db.updateProgress(updatedProgress);
      
      setShowSuccess(true);
      setTimeout(() => {
        navigate(`/course/${course!.id}`);
      }, 2500);
    } catch (error) {
      console.error('Error completing lesson:', error);
      alert(lang === 'en' ? 'Error completing lesson' : 'Greška pri završetku lekcije');
      setIsSaving(false);
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const formatTime = (totalSec: number): string => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const getMaterialColor = (type: string) => {
    switch (type) {
      case 'video': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', gradient: 'from-red-50 to-pink-50' };
      case 'pdf': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', gradient: 'from-blue-50 to-indigo-50' };
      case 'pptx': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-600', gradient: 'from-orange-50 to-amber-50' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-600', gradient: 'from-gray-50 to-gray-100' };
    }
  };

  const isDownloadAllowed = () => {
    return secondsRemaining === 0;
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {lang === 'en' ? 'Loading lesson content...' : 'Učitavanje sadržaja lekcije...'}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {lang === 'en' ? 'Please wait a moment' : 'Molimo sačekajte trenutak'}
          </p>
        </div>
      </div>
    );
  }

  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-200">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {lang === 'en' ? 'Lesson Not Found' : 'Lekcija nije pronađena'}
          </h3>
          <p className="text-gray-600 mb-6">
            {lang === 'en' ? 'The requested lesson could not be loaded.' : 'Tražena lekcija ne može biti učitana.'}
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105 active:scale-95"
            type="button"
          >
            {lang === 'en' ? 'Return to Dashboard' : 'Vrati se na kontrolnu tablu'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ============================================
          VIEWER OVERLAYS
      ============================================ */}
      
      {/* PDF Viewer */}
      {activeViewer === 'pdf' && activeMaterial && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 to-blue-800 border-b border-blue-700">
              <div className="flex items-center gap-4">
                <button
                  onClick={closeViewer}
                  className="p-2 hover:bg-blue-800 rounded-lg transition-all hover:scale-105 active:scale-95"
                  title={lang === 'en' ? 'Close' : 'Zatvori'}
                  type="button"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <div>
                  <h3 className="font-semibold text-white">{activeMaterial.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                      PDF
                    </span>
                    {!isLearningActive && (
                      <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                        {lang === 'en' ? 'Paused' : 'Pauzirano'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-lg ${isLearningActive ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-400'}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isLearningActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
                    <span className="text-sm font-medium">
                      {formatTime(totalTimeSpent + activeLearningSeconds)}
                    </span>
                  </div>
                </div>
                
                {isDownloadAllowed() && (
                  <a
                    href={activeMaterial.url}
                    download={activeMaterial.fileName || activeMaterial.title}
                    className="p-2 hover:bg-blue-800 rounded-lg transition-all hover:scale-105 active:scale-95"
                    title={lang === 'en' ? 'Download' : 'Preuzmi'}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                )}
              </div>
            </div>

            <div className="flex-1 bg-gray-900">
              <PDFViewer 
                url={activeMaterial.url} 
                title={activeMaterial.title}
                onActivityChange={handleActiveTimeChange}
              />
            </div>
          </div>
        </div>
      )}

      {/* Video Viewer */}
      {activeViewer === 'video' && activeMaterial && (
        <VideoViewer
          url={activeMaterial.url}
          title={activeMaterial.title}
          onClose={closeViewer}
          lang={lang}
          allowDownload={isDownloadAllowed()}
          onActiveTimeChange={handleActiveTimeChange}
        />
      )}

      {/* PowerPoint Viewer */}
      {activeViewer === 'pptx' && activeMaterial && (
        <PowerPointViewer
          url={activeMaterial.url}
          title={activeMaterial.title}
          onClose={closeViewer}
          lang={lang}
          allowDownload={isDownloadAllowed()}
          onActiveTimeChange={handleActiveTimeChange}
        />
      )}

      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-40 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="text-center p-8 bg-white rounded-2xl shadow-2xl max-w-sm w-full animate-scale-in">
            <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
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
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full animate-progress" />
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          MAIN CONTENT
      ============================================ */}
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          {/* Navigation */}
          <div className="mb-6">
            <button 
              onClick={() => navigate(`/app/course/${course.id}`)}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium text-sm transition-all hover:scale-105 active:scale-95 group"
              type="button"
            >
              <svg className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {lang === 'en' ? 'Back to Course' : 'Nazad na kurs'}
            </button>
          </div>

          {/* Lesson Header */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden mb-8">
            <div className="p-8 border-b border-gray-200">
              <div className="flex flex-col lg:flex-row justify-between gap-6">
                <div className="flex-1">
                  {/* Lesson Status Badges */}
                  <div className="flex flex-wrap gap-3 mb-4">
                    <span className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 text-sm font-semibold rounded-full border border-blue-200">
                      {lang === 'en' ? 'Lesson' : 'Lekcija'} {lesson.order} {lang === 'en' ? 'of' : 'od'} {course.lessons.length}
                    </span>
                    {secondsRemaining > 0 ? (
                      <span className="px-3 py-1.5 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-sm font-semibold rounded-full border border-amber-200 animate-pulse">
                        ⏱️ {formatTime(secondsRemaining)} {lang === 'en' ? 'remaining' : 'preostalo'}
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-50 text-green-700 text-sm font-semibold rounded-full border border-green-200">
                        ✅ {lang === 'en' ? 'Time requirement met' : 'Uslov vremena ispunjen'}
                      </span>
                    )}
                    <span className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 text-sm font-semibold rounded-full border border-purple-200">
                      ⏱️ {formatTime(totalTimeSpent)} {lang === 'en' ? 'total' : 'ukupno'}
                    </span>
                    {isLearningActive && (
                      <span className="px-3 py-1.5 bg-gradient-to-r from-green-100 to-green-50 text-green-700 text-sm font-semibold rounded-full border border-green-200 animate-pulse">
                        🔴 {lang === 'en' ? 'Active' : 'Aktivno'}
                      </span>
                    )}
                  </div>
                  
                  {/* Lesson Title & Description */}
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">{lesson.title}</h1>
                  <p className="text-gray-600 text-lg mb-6">{lesson.description}</p>
                  
                  {/* Learning Requirements */}
                  <div className="bg-blue-50 rounded-xl p-5 border border-blue-200">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">
                          {lang === 'en' ? 'Learning Requirements' : 'Zahtevi za učenje'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {lang === 'en' ? 'Minimum active learning time:' : 'Minimalno aktivno vrijeme učenja:'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-blue-700">
                          {lesson.minLearningTimeMinutes || 0} {lang === 'en' ? 'minutes' : 'minuta'}
                        </span>
                        <span className="text-sm text-gray-500">
                          ({lesson.minLearningTimeMinutes * 60} {lang === 'en' ? 'seconds' : 'sekundi'})
                        </span>
                      </div>
                      <p className="text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">
                        {lang === 'en' 
                          ? 'Time counts only when interacting with materials' 
                          : 'Vrijeme se računa samo prilikom interakcije sa materijalima'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Materials Section */}
            <div className="p-8">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {lang === 'en' ? 'Learning Materials' : 'Materijali za učenje'}
                    </h2>
                    <p className="text-gray-600">
                      {lang === 'en' ? 'Access all lesson resources below' : 'Pristupite svim resursima lekcije ispod'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Materials List */}
              <div className="space-y-8">
                {lesson.materials.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {lang === 'en' ? 'No Materials Available' : 'Nema dostupnih materijala'}
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      {lang === 'en' 
                        ? 'This lesson doesn\'t have any learning materials yet.' 
                        : 'Ova lekcija još uvijek nema materijale za učenje.'}
                    </p>
                  </div>
                ) : (
                  lesson.materials.map((material) => {
                    const fileInfo = fileInfos[material.id];
                    const colors = getMaterialColor(material.type);
                    
                    return (
                      <div key={material.id} className="space-y-6">
                        {/* Material Header */}
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center flex-shrink-0 ${colors.border}`}>
                            {material.type === 'video' && (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                            {material.type === 'pdf' && (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            )}
                            {material.type === 'pptx' && (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            )}
                            {material.type === 'text' && (
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">{material.title}</h3>
                                {fileInfo && (
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                    <span className="inline-flex items-center gap-1">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      </svg>
                                      {fileInfo.type.split('/')[1]?.toUpperCase() || 'FILE'}
                                    </span>
                                    {fileInfo.size > 0 && (
                                      <span>• {formatFileSize(fileInfo.size)}</span>
                                    )}
                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                      Supabase Storage
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-wrap gap-2">
                                <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${colors.bg} ${colors.text}`}>
                                  {material.type === 'video' ? (lang === 'en' ? 'Video' : 'Video') :
                                   material.type === 'pdf' ? 'PDF' :
                                   material.type === 'pptx' ? (lang === 'en' ? 'Presentation' : 'Prezentacija') :
                                   (lang === 'en' ? 'Document' : 'Dokument')}
                                </span>
                              </div>
                            </div>
                            
                            {/* Active Learning Indicator */}
                            <div className="mt-3 flex items-center gap-2 text-sm">
                              <span className="text-blue-600 font-medium">
                                ⏱️ {lang === 'en' ? 'Active time counted when opened' : 'Aktivno vrijeme se računa pri otvaranju'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Material Content */}
                        <div className={`bg-gradient-to-br ${colors.gradient} rounded-2xl border-2 border-dashed ${colors.border} p-8`}>
                          <div className="max-w-md mx-auto text-center">
                            {/* Icon */}
                            <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                              {material.type === 'video' && (
                                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                </svg>
                              )}
                              {material.type === 'pdf' && (
                                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              )}
                              {material.type === 'pptx' && (
                                <svg className="w-10 h-10 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              )}
                            </div>
                            
                            {/* Title */}
                            <h4 className="text-xl font-bold text-gray-900 mb-3">
                              {material.type === 'video' ? (lang === 'en' ? 'Video Lesson' : 'Video lekcija') :
                               material.type === 'pdf' ? (lang === 'en' ? 'Reference Document' : 'Referentni dokument') :
                               material.type === 'pptx' ? (lang === 'en' ? 'Presentation Slides' : 'Slajdovi prezentacije') :
                               material.title}
                            </h4>
                            
                            {/* Description */}
                            <p className="text-gray-600 mb-8">
                              {material.type === 'video' 
                                ? (lang === 'en' ? 'Watch the instructional video to learn key concepts.' : 'Pogledajte video za učenje kliučnih koncepata.')
                                : material.type === 'pdf'
                                ? (lang === 'en' ? 'Review detailed documentation and reference materials.' : 'Pregledajte detaljnu dokumentaciju i referentne materijale.')
                                : material.type === 'pptx'
                                ? (lang === 'en' ? 'Browse through the presentation slides for visual learning.' : 'Pregledajte slajdove prezentacije za vizuelno učenje.')
                                : ''}
                            </p>
                            
                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 justify-center">
                              {material.url ? (
                                <>
                                  <button
                                    onClick={() => openViewer(material, material.type as 'pdf' | 'video' | 'pptx')}
                                    className={`px-8 py-3.5 bg-gradient-to-r ${
                                      material.type === 'video' ? 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800' :
                                      material.type === 'pdf' ? 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
                                      'from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800'
                                    } text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3`}
                                    type="button"
                                  >
                                    {material.type === 'video' ? (
                                      <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        </svg>
                                        {lang === 'en' ? 'Play Video' : 'Pusti video'}
                                      </>
                                    ) : material.type === 'pdf' ? (
                                      <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {lang === 'en' ? 'View PDF' : 'Pogledaj PDF'}
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                        {lang === 'en' ? 'View Presentation' : 'Pogledaj prezentaciju'}
                                      </>
                                    )}
                                  </button>
                                  
                                  {isDownloadAllowed() ? (
                                    <a
                                      href={material.url}
                                      download={material.fileName || material.title}
                                      className="px-8 py-3.5 bg-white text-gray-700 rounded-xl font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                      {lang === 'en' ? 'Download' : 'Preuzmi'}
                                    </a>
                                  ) : (
                                    <button
                                      disabled
                                      className="px-8 py-3.5 bg-gray-100 text-gray-400 rounded-xl font-semibold cursor-not-allowed flex items-center gap-3"
                                      title={lang === 'en' ? 'Complete the lesson active time requirement to download' : 'Završite uslov aktivnog vremena lekcije da biste preuzeli'}
                                      type="button"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                      </svg>
                                      {lang === 'en' ? 'Download' : 'Preuzmi'}
                                    </button>
                                  )}
                                </>
                              ) : (
                                <p className="text-gray-500">
                                  {lang === 'en' ? 'Material not available' : 'Materijal nije dostupan'}
                                </p>
                              )}
                            </div>
                            
                            {/* Download Restriction Notice */}
                            {!isDownloadAllowed() && (
                              <p className="mt-6 text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-lg border border-amber-200">
                                {lang === 'en' 
                                  ? 'Download will be available after completing the active learning time requirement' 
                                  : 'Preuzimanje će biti dostupno nakon ispunjenja uslova aktivnog vremena učenja'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Text Content (for text materials) */}
                        {material.type === 'text' && material.content && (
                          <div className="bg-white rounded-xl border border-gray-200 p-6">
                            <div className="prose prose-blue max-w-none">
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">{material.title}</h4>
                              <div className="text-gray-700 whitespace-pre-wrap">
                                {material.content}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Knowledge Test Section */}
              {lesson.exam && (
                <div className="mt-12 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 p-8">
                  <div className="flex items-center gap-6 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {lang === 'en' ? 'Knowledge Assessment' : 'Procena znanja'}
                      </h3>
                      <p className="text-gray-600">
                        {lang === 'en' 
                          ? 'Test your understanding of this lesson with a comprehensive exam.'
                          : 'Testirajte svoje razumevanje ove lekcije sa sveobuhvatnim testom.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => navigate(`/app/lesson-exam/${courseId}/${lessonId}`)}
                      className="px-8 py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3"
                      type="button"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      {lang === 'en' ? 'Start Assessment' : 'Započni test'}
                    </button>
                    
                    <button
                      onClick={() => {
                        alert(lang === 'en' 
                          ? 'This assessment evaluates your comprehension of the lesson material. A passing score is required to proceed.'
                          : 'Ovaj test procenjuje vaše razumevanje materijala lekcije. Potreban je prolazni rezultat za nastavak.');
                      }}
                      className="px-8 py-3.5 bg-white text-gray-700 rounded-xl font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all hover:scale-105 active:scale-95"
                      type="button"
                    >
                      {lang === 'en' ? 'Assessment Details' : 'Detalji testa'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Completion Section */}
            <div className="p-8 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
              <div className="flex flex-col lg:flex-row justify-between items-center gap-8">
                {/* Time Tracking */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow border border-gray-200 mb-2">
                      {isLearningActive ? (
                        <div className="relative">
                          <div className="w-6 h-6 bg-red-500 rounded-full animate-pulse" />
                          <div className="absolute inset-0 bg-red-500 rounded-full animate-ping" />
                        </div>
                      ) : (
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs font-medium text-gray-500">
                      {lang === 'en' ? 'Current Session' : 'Trenutna sesija'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{formatTime(activeLearningSeconds)}</p>
                  </div>
                  
                  <div className="h-12 w-px bg-gray-300 hidden lg:block" />
                  
                  <div className="text-center">
                    <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow border border-gray-200 mb-2">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-gray-500">
                      {lang === 'en' ? 'Total Time' : 'Ukupno vrijeme'}
                    </p>
                    <p className="text-lg font-bold text-gray-900">{formatTime(totalTimeSpent)}</p>
                  </div>
                </div>

                {/* Completion Requirements */}
                <div className="text-center max-w-md">
                  {secondsRemaining > 0 ? (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-amber-800">
                          {lang === 'en' ? 'Active Time Required' : 'Potrebno aktivno vrijeme'}
                        </h4>
                      </div>
                      <p className="text-amber-700 font-medium text-lg mb-1">
                        {formatTime(secondsRemaining)} {lang === 'en' ? 'remaining' : 'preostalo'}
                      </p>
                      <p className="text-sm text-amber-600">
                        {lang === 'en' 
                          ? 'Interact with materials to complete requirement' 
                          : 'Interagujte sa materijalima da ispunite uslov'}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h4 className="font-semibold text-green-800">
                          {lang === 'en' ? 'Ready to Complete' : 'Spremno za završetak'}
                        </h4>
                      </div>
                      <p className="text-green-700 font-medium">
                        {lang === 'en' ? 'All requirements satisfied!' : 'Svi uslovi su ispunjeni!'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Complete Button */}
                <button
                  onClick={handleComplete}
                  disabled={secondsRemaining > 0 || showSuccess || isSaving}
                  className={`px-10 py-4 rounded-xl font-bold shadow-lg transition-all flex items-center gap-3 ${
                    secondsRemaining > 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : showSuccess || isSaving
                      ? 'bg-gradient-to-r from-green-600 to-emerald-700 text-white'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-xl hover:scale-105 active:scale-95'
                  }`}
                  type="button"
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
                      {lang === 'en' ? 'Complete Lesson' : 'Završi lekciju'}
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================
          ANIMATION STYLES
      ============================================ */}
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
        
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        input[type="range"]::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </>
  );
};

export default LessonView;