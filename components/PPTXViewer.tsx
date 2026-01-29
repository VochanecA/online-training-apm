import React, { useState, useEffect } from 'react';

interface PPTXViewerProps {
  url: string;
  title: string;
}

const PPTXViewer: React.FC<PPTXViewerProps> = ({ url, title }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [totalSlides, setTotalSlides] = useState(4); // Pretpostavimo 4 slajda za demo
  const [scale, setScale] = useState(1);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Konvertuj PowerPoint u Google Slides viewer
  const getGoogleSlidesUrl = (pptUrl: string): string => {
    // Ako je već Google Slides URL, koristi direktno
    if (pptUrl.includes('docs.google.com/presentation')) {
      return pptUrl.replace('/edit', '/preview');
    }
    
    // Ako je lokalni PPTX, možete ga konvertovati na drugi način
    // Za sada koristimo placeholder slike
    return pptUrl;
  };

  const viewerUrl = getGoogleSlidesUrl(url);

  // Mock slides za demonstraciju
  const mockSlides = [
    'https://images.unsplash.com/photo-1542744095-fcf48d80b0fd?w=1200&h=675&fit=crop',
    'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=1200&h=675&fit=crop',
    'https://images.unsplash.com/photo-1542744094-5d2e3fd4fd7e?w=1200&h=675&fit=crop',
    'https://images.unsplash.com/photo-1542744095-68b6e24b0d8d?w=1200&h=675&fit=crop',
  ];

  useEffect(() => {
    // Simulacija učitavanja
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const resetZoom = () => {
    setScale(1);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load presentation</h3>
          <p className="text-gray-600 mb-4">Please try downloading the presentation instead.</p>
          <a
            href={url}
            download
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download PPTX
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading presentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Presentation Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevSlide}
              disabled={currentSlide <= 0}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous slide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-gray-700">
              Slide <span className="font-semibold">{currentSlide + 1}</span> of {totalSlides}
            </span>
            <button
              onClick={nextSlide}
              disabled={currentSlide >= totalSlides - 1}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next slide"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Slide Navigation Dots */}
          <div className="flex items-center gap-1">
            {Array.from({ length: totalSlides }).map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`w-2 h-2 rounded-full transition-all ${index === currentSlide ? 'bg-blue-600 scale-125' : 'bg-gray-300 hover:bg-gray-400'}`}
                title={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Zoom out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <span className="text-sm text-gray-700">{Math.round(scale * 100)}%</span>
            <button
              onClick={zoomIn}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
              title="Zoom in"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button
              onClick={resetZoom}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Presentation Viewer */}
      <div className="flex-1 overflow-auto bg-gray-900 p-4 flex items-center justify-center">
        <div 
          className="max-w-4xl w-full bg-white rounded-lg shadow-2xl overflow-hidden" 
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease'
          }}
        >
          {viewerUrl.includes('docs.google.com') ? (
            <iframe
              src={viewerUrl}
              title={title}
              className="w-full h-[600px] border-0"
              allowFullScreen
              onError={() => setError(true)}
            />
          ) : (
            <div className="relative">
              <img
                src={mockSlides[currentSlide]}
                alt={`Slide ${currentSlide + 1}`}
                className="w-full h-auto"
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
                Demo Slide {currentSlide + 1} of {totalSlides}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Presentation Controls */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Presentation Controls</h4>
              <p className="text-xs text-gray-600">
                Use ← → arrows or click dots to navigate between slides
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={prevSlide}
                disabled={currentSlide <= 0}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={nextSlide}
                disabled={currentSlide >= totalSlides - 1}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PPTXViewer;