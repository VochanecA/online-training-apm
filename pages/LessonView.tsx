import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Lesson, Progress, User, Material } from '../types';
import { Language, translations } from '../translations';

// PDF Viewer komponenta
// PDF Viewer komponenta - ISPRAVLJENA
const PDFViewer: React.FC<{ 
  url: string; 
  title: string;
  onClose: () => void;
  lang: Language;
  allowDownload: boolean;
  onActiveTimeChange: (isActive: boolean) => void;
}> = ({ url, title, onClose, lang, allowDownload, onActiveTimeChange }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const embedRef = useRef<HTMLEmbedElement>(null);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const isActiveRef = useRef<boolean>(true);

  useEffect(() => {
    setIsLoading(true);
    setCurrentPage(1);
    setScale(1.0);
    onActiveTimeChange(true);
    lastActivityRef.current = Date.now();
    isActiveRef.current = true;

    // Aktivnosti koje resetuju timer neaktivnosti
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (!isActiveRef.current) {
        isActiveRef.current = true;
        onActiveTimeChange(true);
      }
    };

    // Dodaj event listenere
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);

    // Timer za proveru neaktivnosti
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
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [url, onActiveTimeChange]);

  // Ne koristimo handleLoad za embed - umesto toga koristimo timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setNumPages(10); // Pretpostavka
    }, 1500); // Dajemo vremena PDF-u da se učita

    return () => clearTimeout(timer);
  }, []);

  const nextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage(prev => prev + 1);
      lastActivityRef.current = Date.now();
      // Za embed ne možemo kontrolisati stranice direktno
      // Ovo je samo za prikaz korisniku
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      lastActivityRef.current = Date.now();
    }
  };

  const zoomIn = () => {
    setScale(prev => {
      const newScale = Math.min(prev + 0.25, 3);
      // Za embed, možemo samo promeniti CSS transform
      if (embedRef.current) {
        embedRef.current.style.transform = `scale(${newScale})`;
        embedRef.current.style.transformOrigin = 'center center';
      }
      return newScale;
    });
    lastActivityRef.current = Date.now();
  };

  const zoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.25, 0.5);
      if (embedRef.current) {
        embedRef.current.style.transform = `scale(${newScale})`;
        embedRef.current.style.transformOrigin = 'center center';
      }
      return newScale;
    });
    lastActivityRef.current = Date.now();
  };

  const handleScaleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newScale = parseFloat(e.target.value);
    setScale(newScale);
    if (embedRef.current) {
      embedRef.current.style.transform = `scale(${newScale})`;
      embedRef.current.style.transformOrigin = 'center center';
    }
    lastActivityRef.current = Date.now();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => lastActivityRef.current = Date.now()}
    >
      <div className="relative bg-white rounded-2xl overflow-hidden w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title={lang === 'en' ? 'Close' : 'Zatvori'}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-gray-400">
                {lang === 'en' ? 'PDF Viewer' : 'PDF pregled'} • {lang === 'en' ? 'Page' : 'Strana'} {currentPage} {numPages && `/${numPages}`}
                {!isActiveRef.current && (
                  <span className="ml-2 text-amber-400">
                    ⏸️ {lang === 'en' ? 'Paused' : 'Pauzirano'}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-lg">
              <button
                onClick={zoomOut}
                className="p-1 hover:bg-gray-700 rounded"
                title={lang === 'en' ? 'Zoom Out' : 'Umanji'}
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                </svg>
              </button>
              <span className="text-sm">{(scale * 100).toFixed(0)}%</span>
              <button
                onClick={zoomIn}
                className="p-1 hover:bg-gray-700 rounded"
                title={lang === 'en' ? 'Zoom In' : 'Povećaj'}
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {allowDownload && (
              <a
                href={url}
                download
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
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

        {/* PDF Content */}
        <div className="flex-1 bg-gray-100 relative overflow-auto">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-700 font-medium">
                  {lang === 'en' ? 'Loading PDF...' : 'Učitavanje PDF-a...'}
                </p>
                <p className="text-gray-500 text-sm mt-2">
                  {lang === 'en' ? 'This may take a moment' : 'Ovo može potrajati nekoliko trenutaka'}
                </p>
              </div>
            </div>
          )}
          
          {/* Koristimo embed umesto iframe za bolju PDF podršku */}
          <embed
            ref={embedRef}
            src={url}
            title={title}
            type="application/pdf"
            className="w-full h-full"
            onError={() => {
              setIsLoading(false);
              console.error('Error loading PDF');
            }}
            onLoad={() => setIsLoading(false)}
          />
        </div>

        {/* Footer - Navigation */}
        <div className="p-4 bg-gray-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={prevPage}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                type="button"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {lang === 'en' ? 'Previous' : 'Prethodna'}
              </button>
              <button
                onClick={nextPage}
                disabled={!!numPages && currentPage >= numPages}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                type="button"
              >
                {lang === 'en' ? 'Next' : 'Sledeća'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">{lang === 'en' ? 'Page:' : 'Strana:'}</span>
                <div className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm">
                  {currentPage}
                </div>
                <span className="text-gray-400">/ {numPages || '?'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={scale.toFixed(2)}
                onChange={handleScaleChange}
                className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
              >
                <option value="0.5">50%</option>
                <option value="0.75">75%</option>
                <option value="1.0">100%</option>
                <option value="1.25">125%</option>
                <option value="1.5">150%</option>
                <option value="2.0">200%</option>
              </select>
            </div>
          </div>
          
          {/* Napomena za korisnika */}
          <div className="text-center text-gray-400 text-xs mt-2">
            {lang === 'en' 
              ? 'Note: Page navigation may not work in all browsers. Use the PDF viewer controls.'
              : 'Napomena: Navigacija stranicama možda neće raditi u svim pregledačima. Koristite kontrole PDF pregledača.'}
          </div>
        </div>
      </div>
    </div>
  );
};

// Video Viewer komponenta
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
    onActiveTimeChange(true); // Započni praćenje vremena kada se video otvori
    lastActivityRef.current = Date.now();
    isActiveRef.current = true;

    // Aktivnosti koje resetuju timer neaktivnosti
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      if (!isActiveRef.current) {
        isActiveRef.current = true;
        onActiveTimeChange(true);
      }
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);

    // Timer za proveru neaktivnosti
    activityTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (isActiveRef.current && (now - lastActivityRef.current) > 30000) {
        isActiveRef.current = false;
        onActiveTimeChange(false);
      }
    }, 5000);

    return () => {
      onActiveTimeChange(false); // Zaustavi praćenje vremena
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
      lastActivityRef.current = Date.now(); // Video se reprodukuje = aktivnost
    };
    
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => setIsPlaying(false);
    const handlePlay = () => {
      setIsPlaying(true);
      onActiveTimeChange(true); // Video se reprodukuje = aktivno
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
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => lastActivityRef.current = Date.now()}
    >
      <div className="relative bg-black rounded-2xl overflow-hidden w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900/90 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title={lang === 'en' ? 'Close' : 'Zatvori'}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="font-semibold">{title}</h3>
            {!isActiveRef.current && !isPlaying && (
              <span className="text-amber-400 text-sm">
                ⏸️ {lang === 'en' ? 'Paused' : 'Pauzirano'}
              </span>
            )}
          </div>
          {allowDownload && (
            <a
              href={url}
              download
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title={lang === 'en' ? 'Download' : 'Preuzmi'}
              onClick={() => lastActivityRef.current = Date.now()}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          )}
        </div>

        {/* Video Content */}
        <div className="flex-1 relative">
          <video
            ref={videoRef}
            src={url}
            className="w-full h-full object-contain"
            onClick={togglePlay}
            controls={false}
          />
          
          {/* Custom Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            <div className="space-y-3">
              {/* Progress Bar */}
              <div className="w-full">
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%, #4b5563 100%)`
                  }}
                />
                <div className="flex justify-between text-sm text-gray-300 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="p-2 hover:bg-gray-800 rounded-full transition-colors"
                    type="button"
                  >
                    {isPlaying ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                    )}
                  </button>

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
                      className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.requestFullscreen();
                      lastActivityRef.current = Date.now();
                    }
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  title={lang === 'en' ? 'Fullscreen' : 'Preko celog ekrana'}
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

// PowerPoint Viewer komponenta
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
    onActiveTimeChange(true); // Započni praćenje vremena
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
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={() => lastActivityRef.current = Date.now()}
    >
      <div 
        ref={viewerRef}
        className="relative bg-white rounded-2xl overflow-hidden w-full max-w-6xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              title={lang === 'en' ? 'Close' : 'Zatvori'}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-gray-400">
                {lang === 'en' ? 'Presentation Viewer' : 'Pregled prezentacije'} • {lang === 'en' ? 'Slide' : 'Slajd'} {currentSlide} {lang === 'en' ? 'of' : 'od'} {totalSlides}
                {!isActiveRef.current && (
                  <span className="ml-2 text-amber-400">
                    ⏸️ {lang === 'en' ? 'Paused' : 'Pauzirano'}
                  </span>
                )}
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
              type="button"
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
            {allowDownload && (
              <a
                href={url}
                download
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
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

        {/* Slide Content */}
        <div className="flex-1 bg-gray-100 relative flex items-center justify-center">
          <button
            onClick={prevSlide}
            disabled={currentSlide === 1}
            className="absolute left-4 p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
            title={lang === 'en' ? 'Previous slide' : 'Prethodni slajd'}
            type="button"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="w-full h-full">
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-32 h-32 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-16 h-16 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-gray-700 font-medium mb-2">
                  {lang === 'en' ? 'PowerPoint Presentation' : 'PowerPoint prezentacija'}
                </p>
                <p className="text-gray-500 text-sm mb-4">
                  {lang === 'en' ? 'Slide' : 'Slajd'} {currentSlide} {lang === 'en' ? 'of' : 'od'} {totalSlides}
                </p>
                <p className="text-gray-400 text-sm max-w-md">
                  {lang === 'en' 
                    ? 'In a real application, this would display the actual PowerPoint slides.'
                    : 'U realnoj aplikaciji, ovdje bi se prikazivali stvarni PowerPoint slajdovi.'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={nextSlide}
            disabled={currentSlide === totalSlides}
            className="absolute right-4 p-3 rounded-full bg-white/90 backdrop-blur-sm shadow-lg hover:bg-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed z-10"
            title={lang === 'en' ? 'Next slide' : 'Sledeći slajd'}
            type="button"
          >
            <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Footer - Controls */}
        <div className="p-4 bg-gray-900 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={prevSlide}
                disabled={currentSlide === 1}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                {lang === 'en' ? 'Previous' : 'Prethodni'}
              </button>
              <button
                onClick={nextSlide}
                disabled={currentSlide === totalSlides}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                type="button"
              >
                {lang === 'en' ? 'Next' : 'Sledeći'}
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm">{lang === 'en' ? 'Slide:' : 'Slajd:'}</span>
                <input
                  type="number"
                  min="1"
                  max={totalSlides}
                  value={currentSlide}
                  onChange={handleSlideChange}
                  className="w-20 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-sm"
                />
                <span className="text-gray-400">/ {totalSlides}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {[...Array(Math.min(10, totalSlides))].map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setCurrentSlide(index + 1);
                    lastActivityRef.current = Date.now();
                  }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index + 1 === currentSlide ? 'bg-blue-500 scale-125' : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title={lang === 'en' ? `Go to slide ${index + 1}` : `Idi na slajd ${index + 1}`}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface FileInfo {
  url: string;
  name: string;
  type: string;
  size: number;
}

const LessonView: React.FC<{ user: User; lang: Language }> = ({ user, lang }) => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const t = translations[lang];
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
  
  // State for viewers
  const [activeViewer, setActiveViewer] = useState<'pdf' | 'video' | 'pptx' | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<Material | null>(null);
  
  // Timer references
  const activeLearningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveProgressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isLearningActive, setIsLearningActive] = useState(false);

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      if (!courseId || !lessonId) {
        console.error('Missing courseId or lessonId');
        navigate('/dashboard');
        return;
      }
      
      try {
        setIsLoading(true);
        
        console.log('Loading course:', courseId);
        
        // Load course from Supabase
        const courseData = await db.getCourse(courseId);
        if (!courseData) {
          console.error('Course not found:', courseId);
          alert(lang === 'en' ? 'Course not found' : 'Kurs nije pronađen');
          navigate('/dashboard');
          return;
        }
        
        console.log('Course loaded:', courseData.title);
        setCourse(courseData);
        
        // Find lesson
        const lessonData = courseData.lessons.find(x => x.id === lessonId);
        if (!lessonData) {
          console.error('Lesson not found:', lessonId);
          alert(lang === 'en' ? 'Lesson not found' : 'Lekcija nije pronađena');
          navigate(`/course/${courseId}`);
          return;
        }
        
        console.log('Lesson found:', lessonData.title);
        setLesson(lessonData);
        
        // Load file information for all materials with URLs
        const fileInfoMap: Record<string, FileInfo> = {};
        
        for (const material of lessonData.materials) {
          try {
            if (material.url && material.url.startsWith('http')) {
              // Get base filename from URL
              const urlParts = material.url.split('/');
              const fileName = urlParts[urlParts.length - 1];
              const decodedFileName = decodeURIComponent(fileName);
              
              // Clean up the filename - remove timestamp prefix
              let displayName = decodedFileName;
              const underscoreIndex = decodedFileName.indexOf('_');
              if (underscoreIndex !== -1) {
                displayName = decodedFileName.substring(underscoreIndex + 1);
              }
              
              // Get file type from material type
              let fileType = 'application/octet-stream';
              if (material.type === 'pdf') {
                fileType = 'application/pdf';
              } else if (material.type === 'video') {
                fileType = 'video/mp4';
              } else if (material.type === 'pptx') {
                fileType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
              } else if (material.type === 'text') {
                fileType = 'text/plain';
              }
              
              fileInfoMap[material.id] = {
                url: material.url,
                name: material.title || displayName || 'Untitled',
                type: fileType,
                size: 0
              };
            }
          } catch (error) {
            console.warn(`Error processing file info for material ${material.id}:`, error);
            // Continue with other materials even if one fails
          }
        }
        
        setFileInfos(fileInfoMap);
        
        // Load progress from Supabase
        try {
          const progressData = await db.getProgress(user.id, courseId);
          console.log('Progress data loaded:', progressData);
          
          setProgress(progressData);
          
          // Load previous active learning time on this lesson
          const previousTimeSpent = progressData.lessonTimeSpent?.[lessonId] || 0;
          console.log('Previous active learning time on lesson:', previousTimeSpent, 'seconds');
          
          setTotalTimeSpent(previousTimeSpent);
          setActiveLearningSeconds(0); // Reset active learning timer
          
          // Check if lesson is already completed
          const isLessonCompleted = progressData.completedLessonIds?.includes(lessonId);
          
          // Logic for min learning time - only if lesson is not completed
          if (!isLessonCompleted) {
            const startStr = progressData.lessonStartTimes?.[lessonId];
            const startTime = startStr ? new Date(startStr).getTime() : Date.now();
            
            // If lesson hasn't been started yet, record start time
            if (!startStr) {
              console.log('Recording new start time for lesson');
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
            } else {
              console.log('Existing start time found:', startStr);
            }

            // Calculate remaining time based on ACTIVE learning time
            const requiredSeconds = (lessonData.minLearningTimeMinutes || 0) * 60;
            const remaining = Math.max(0, requiredSeconds - previousTimeSpent);
            
            console.log('Active time calculation:', {
              previousTimeSpent,
              requiredSeconds,
              remaining,
              minLearningTimeMinutes: lessonData.minLearningTimeMinutes
            });
            
            setSecondsRemaining(remaining);
            
            // If the lesson was already completed, don't require more time
            if (isLessonCompleted) {
              setSecondsRemaining(0);
            }
          } else {
            console.log('Lesson already completed, no time requirement');
            setSecondsRemaining(0);
          }
        } catch (progressError) {
          console.error('Error loading progress:', progressError);
          // Continue without progress data
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

  // Handle active learning timer
  useEffect(() => {
    if (!lessonId || !progress) return;

    // Clear existing timers
    if (activeLearningTimerRef.current) {
      clearInterval(activeLearningTimerRef.current);
    }
    if (saveProgressTimerRef.current) {
      clearInterval(saveProgressTimerRef.current);
    }

    // Start active learning timer only when isLearningActive is true
    if (isLearningActive) {
      activeLearningTimerRef.current = setInterval(() => {
        setActiveLearningSeconds(prev => {
          const newTime = prev + 1;
          
          // Update remaining time
          if (secondsRemaining > 0) {
            setSecondsRemaining(prevRemaining => Math.max(0, prevRemaining - 1));
          }
          
          // Auto-save every 30 seconds
          if (newTime % 30 === 0) {
            saveProgressToSupabase(newTime);
          }
          
          return newTime;
        });
      }, 1000);
    }

    // Also save progress periodically as backup
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
      
      // Save progress when component unmounts if there was active learning
      if (isLearningActive && activeLearningSeconds > 0 && progress && lessonId) {
        saveProgressToSupabase(activeLearningSeconds, true);
      }
    };
  }, [isLearningActive, progress, lessonId, secondsRemaining]);

  // Handle active time changes from viewers
  const handleActiveTimeChange = (isActive: boolean) => {
    console.log('Learning activity changed:', isActive ? 'ACTIVE' : 'INACTIVE');
    setIsLearningActive(isActive);
    
    if (!isActive && activeLearningSeconds > 0) {
      // Save progress when learning becomes inactive
      saveProgressToSupabase(activeLearningSeconds);
    }
  };

  // Function to save progress to Supabase
  const saveProgressToSupabase = async (currentActiveSeconds: number, isFinalSave = false) => {
    if (!progress || !lessonId) return;
    
    try {
      // Calculate total active time spent (previous + current session)
      const previousTimeSpent = progress.lessonTimeSpent?.[lessonId] || 0;
      const newTimeSpent = previousTimeSpent + currentActiveSeconds;
      
      console.log('Saving active learning progress to Supabase:', {
        lessonId,
        previousTimeSpent,
        currentActiveSeconds,
        newTimeSpent,
        isFinalSave
      });
      
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
      
      console.log('Active learning progress saved successfully to Supabase');
      
      // If this is the final save, reset active learning timer
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
    // Timer će početi kada se otvori viewer (handleActiveTimeChange će se pozvati)
  };

  const closeViewer = (): void => {
    setActiveViewer(null);
    setActiveMaterial(null);
    setIsLearningActive(false); // Zaustavi praćenje vremena kada se viewer zatvori
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

  const getFileIcon = (type: string): React.ReactNode => {
    if (type.includes('pdf')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    
    if (type.includes('video')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    
    if (type.includes('presentation') || type.includes('powerpoint')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  // Helper to check if download should be allowed
  const isDownloadAllowed = () => {
    return secondsRemaining === 0;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {lang === 'en' ? 'Loading lesson...' : 'Učitavanje lekcije...'}
          </p>
        </div>
      </div>
    );
  }

  if (!course || !lesson) {
    console.error('Course or lesson is null:', { course, lesson });
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-100 border-t-red-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {lang === 'en' ? 'Lesson not found' : 'Lekcija nije pronađena'}
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            type="button"
          >
            {lang === 'en' ? 'Go to Dashboard' : 'Idi na kontrolnu tablu'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* PDF Viewer */}
      {activeViewer === 'pdf' && activeMaterial && (
        <PDFViewer
          url={activeMaterial.url}
          title={activeMaterial.title}
          onClose={closeViewer}
          lang={lang}
          allowDownload={isDownloadAllowed()}
          onActiveTimeChange={handleActiveTimeChange}
        />
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
            type="button"
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
                  {secondsRemaining > 0 ? (
                    <span className="px-3 py-1 bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 text-xs font-semibold rounded-full animate-pulse">
                      ⏱️ {formatTime(secondsRemaining)} {lang === 'en' ? 'active time remaining' : 'aktivnog vremena preostalo'}
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-50 text-green-700 text-xs font-semibold rounded-full">
                      ✅ {lang === 'en' ? 'Active time requirement met' : 'Uslov aktivnog vremena ispunjen'}
                    </span>
                  )}
                  <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-purple-50 text-purple-700 text-xs font-semibold rounded-full">
                    ⏱️ {formatTime(totalTimeSpent)} {lang === 'en' ? 'total active time' : 'ukupno aktivno vreme'}
                  </span>
                  {isLearningActive && (
                    <span className="px-3 py-1 bg-gradient-to-r from-green-100 to-green-50 text-green-700 text-xs font-semibold rounded-full animate-pulse">
                      🔴 {lang === 'en' ? 'Learning in progress' : 'Učenje u toku'}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{lesson.title}</h1>
                <p className="text-gray-600 text-sm sm:text-base">{lesson.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {lang === 'en' ? 'Minimum ACTIVE learning time:' : 'Minimalno AKTIVNO vreme učenja:'} {lesson.minLearningTimeMinutes || 0} {lang === 'en' ? 'minutes' : 'minuta'}
                  <br />
                  <span className="text-amber-600">
                    {lang === 'en' 
                      ? 'Time is counted only when you interact with learning materials' 
                      : 'Vreme se računa samo kada interagujete sa materijalima za učenje'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Lesson Content */}
          <div className="p-6">
            <div className="space-y-8">
              {lesson.materials.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {lang === 'en' ? 'No materials available for this lesson.' : 'Nema dostupnih materijala za ovu lekciju.'}
                  </p>
                </div>
              ) : (
                lesson.materials.map((material) => {
                  const fileInfo = fileInfos[material.id];
                  
                  return (
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
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-lg">{material.title}</h3>
                          {fileInfo && (
                            <p className="text-sm text-gray-500 mt-1">
                              {fileInfo.name} • {fileInfo.type.split('/')[1]?.toUpperCase() || 'FILE'}
                              {fileInfo.size > 0 && ` • ${formatFileSize(fileInfo.size)}`}
                            </p>
                          )}
                          <p className="text-sm text-blue-600 mt-1">
                            {lang === 'en' 
                              ? '⏱️ Active learning time will be counted when opened' 
                              : '⏱️ Aktivno vreme učenja će se računati kada se otvori'}
                          </p>
                        </div>
                      </div>

                      {/* Content Based on Type */}
                      {material.type === 'video' && (
                        <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-dashed border-red-200 rounded-xl p-6 sm:p-8">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            </svg>
                          </div>
                          <p className="text-gray-900 font-medium text-center mb-4">
                            {lang === 'en' ? 'Video Lesson' : 'Video lekcija'}
                          </p>
                          <div className="flex flex-wrap gap-3 justify-center">
                            {material.url ? (
                              <>
                                <button
                                  onClick={() => openViewer(material, 'video')}
                                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                                  type="button"
                                >
                                  {lang === 'en' ? 'Play Video' : 'Pusti video'}
                                </button>
                                {isDownloadAllowed() ? (
                                  <a
                                    href={material.url}
                                    download={material.fileName || material.title}
                                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    {lang === 'en' ? 'Download' : 'Preuzmi'}
                                  </a>
                                ) : (
                                  <button
                                    disabled
                                    className="px-6 py-3 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                                    title={lang === 'en' ? 'Complete the lesson active time requirement to download' : 'Završite uslov aktivnog vremena lekcije da biste preuzeli'}
                                    type="button"
                                  >
                                    {lang === 'en' ? 'Download' : 'Preuzmi'}
                                  </button>
                                )}
                              </>
                            ) : (
                              <p className="text-gray-500">{lang === 'en' ? 'Video not available' : 'Video nije dostupan'}</p>
                            )}
                          </div>
                          {!isDownloadAllowed() && (
                            <p className="text-sm text-amber-600 text-center mt-3">
                              {lang === 'en' 
                                ? 'Download will be available after completing the active learning time requirement' 
                                : 'Preuzimanje će biti dostupno nakon ispunjenja uslova aktivnog vremena učenja'}
                            </p>
                          )}
                        </div>
                      )}

                      {material.type === 'pdf' && (
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-dashed border-blue-200 rounded-xl p-6 sm:p-8">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-gray-900 font-medium text-center mb-4">
                            {lang === 'en' ? 'Reference Document' : 'Referentni dokument'}
                          </p>
                          <div className="flex flex-wrap gap-3 justify-center">
                            {material.url ? (
                              <>
                                <button
                                  onClick={() => openViewer(material, 'pdf')}
                                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                                  type="button"
                                >
                                  {lang === 'en' ? 'View PDF' : 'Pogledaj PDF'}
                                </button>
                                {isDownloadAllowed() ? (
                                  <a
                                    href={material.url}
                                    download={material.fileName || material.title}
                                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    {lang === 'en' ? 'Download PDF' : 'Preuzmi PDF'}
                                  </a>
                                ) : (
                                  <button
                                    disabled
                                    className="px-6 py-3 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                                    title={lang === 'en' ? 'Complete the lesson active time requirement to download' : 'Završite uslov aktivnog vremena lekcije da biste preuzeli'}
                                    type="button"
                                  >
                                    {lang === 'en' ? 'Download PDF' : 'Preuzmi PDF'}
                                  </button>
                                )}
                              </>
                            ) : (
                              <p className="text-gray-500">{lang === 'en' ? 'PDF not available' : 'PDF nije dostupan'}</p>
                            )}
                          </div>
                          {!isDownloadAllowed() && (
                            <p className="text-sm text-amber-600 text-center mt-3">
                              {lang === 'en' 
                                ? 'Download will be available after completing the active learning time requirement' 
                                : 'Preuzimanje će biti dostupno nakon ispunjenja uslova aktivnog vremena učenja'}
                            </p>
                          )}
                        </div>
                      )}

                      {material.type === 'pptx' && (
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-dashed border-orange-200 rounded-xl p-6 sm:p-8">
                          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md">
                            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <p className="text-gray-900 font-medium text-center mb-4">
                            {lang === 'en' ? 'Presentation:' : 'Prezentacija:'} {material.title}
                          </p>
                          <div className="flex flex-wrap gap-3 justify-center">
                            {material.url ? (
                              <>
                                <button
                                  onClick={() => openViewer(material, 'pptx')}
                                  className="px-6 py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg font-medium hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                                  type="button"
                                >
                                  {lang === 'en' ? 'View Presentation' : 'Pogledaj prezentaciju'}
                                </button>
                                {isDownloadAllowed() ? (
                                  <a
                                    href={material.url}
                                    download={material.fileName || material.title}
                                    className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                                  >
                                    {lang === 'en' ? 'Download PPTX' : 'Preuzmi PPTX'}
                                  </a>
                                ) : (
                                  <button
                                    disabled
                                    className="px-6 py-3 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                                    title={lang === 'en' ? 'Complete the lesson active time requirement to download' : 'Završite uslov aktivnog vremena lekcije da biste preuzeli'}
                                    type="button"
                                  >
                                    {lang === 'en' ? 'Download PPTX' : 'Preuzmi PPTX'}
                                  </button>
                                )}
                              </>
                            ) : (
                              <p className="text-gray-500">{lang === 'en' ? 'Presentation not available' : 'Prezentacija nije dostupna'}</p>
                            )}
                          </div>
                          {!isDownloadAllowed() && (
                            <p className="text-sm text-amber-600 text-center mt-3">
                              {lang === 'en' 
                                ? 'Download will be available after completing the active learning time requirement' 
                                : 'Preuzimanje će biti dostupno nakon ispunjenja uslova aktivnog vremena učenja'}
                            </p>
                          )}
                        </div>
                      )}

                      {material.type === 'text' && (
                        <div className="prose prose-blue max-w-none bg-gray-50 p-6 rounded-xl border border-gray-200">
                          <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-semibold">{material.title}</h4>
                            <span className="text-sm text-blue-600">
                              {lang === 'en' ? '⏱️ Active time counted automatically' : '⏱️ Aktivno vreme se automatski računa'}
                            </span>
                          </div>
                          {material.content || (
                            <p className="text-gray-500 italic">
                              {lang === 'en' ? 'No content available' : 'Nema dostupnog sadržaja'}
                            </p>
                          )}
                        </div>
                      )}

                      {/* File info card for uploaded files */}
                      {fileInfo && (
                        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg border border-gray-300">
                                {getFileIcon(fileInfo.type)}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{fileInfo.name}</p>
                                <p className="text-sm text-gray-500">
                                  {fileInfo.type.split('/')[1]?.toUpperCase() || 'FILE'} • Uploaded to Supabase Storage
                                </p>
                                <p className="text-sm text-blue-600">
                                  {lang === 'en' 
                                    ? '⏱️ Active time counted when viewing' 
                                    : '⏱️ Aktivno vreme se računa prilikom pregleda'}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {material.type === 'pdf' && (
                                <button
                                  onClick={() => openViewer(material, 'pdf')}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                                  type="button"
                                >
                                  {lang === 'en' ? 'View' : 'Pogledaj'}
                                </button>
                              )}
                              {material.type === 'video' && (
                                <button
                                  onClick={() => openViewer(material, 'video')}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors text-sm"
                                  type="button"
                                >
                                  {lang === 'en' ? 'Play' : 'Pusti'}
                                </button>
                              )}
                              {material.type === 'pptx' && (
                                <button
                                  onClick={() => openViewer(material, 'pptx')}
                                  className="px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors text-sm"
                                  type="button"
                                >
                                  {lang === 'en' ? 'View' : 'Pogledaj'}
                                </button>
                              )}
                              {isDownloadAllowed() ? (
                                <a
                                  href={fileInfo.url}
                                  download={fileInfo.name}
                                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm"
                                >
                                  {lang === 'en' ? 'Download' : 'Preuzmi'}
                                </a>
                              ) : (
                                <button
                                  disabled
                                  className="px-4 py-2 bg-gray-200 text-gray-400 rounded-lg font-medium cursor-not-allowed text-sm"
                                  title={lang === 'en' ? 'Complete the lesson active time requirement to download' : 'Završite uslov aktivnog vremena lekcije da biste preuzeli'}
                                  type="button"
                                >
                                  {lang === 'en' ? 'Download' : 'Preuzmi'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center text-blue-600 shadow border border-gray-200">
                  {isLearningActive ? (
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">
                    {lang === 'en' ? 'Active Learning (This Session)' : 'Aktivno učenje (ova sesija)'}
                  </p>
                  <p className="font-semibold text-gray-900">{formatTime(activeLearningSeconds)}</p>
                </div>
              </div>

              <div className="text-center">
                {secondsRemaining > 0 ? (
                  <div className="text-amber-600 font-medium">
                    {lang === 'en' 
                      ? `Spend ${formatTime(secondsRemaining)} more ACTIVE time to complete`
                      : `Provedite još ${formatTime(secondsRemaining)} AKTIVNOG vremena da biste završili`}
                  </div>
                ) : (
                  <div className="text-green-600 font-medium">
                    {lang === 'en' ? 'Active time requirement completed ✓' : 'Uslov aktivnog vremena ispunjen ✓'}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'en' 
                    ? 'Time counts only when interacting with materials' 
                    : 'Vreme se računa samo pri interakciji sa materijalima'}
                </p>
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