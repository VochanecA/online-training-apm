import React, { useState,useRef , useEffect } from 'react';

interface PDFViewerProps {
  url: string;
  title: string;
  onActivityChange?: (isActive: boolean) => void; // Dodaj ovaj prop
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, title, onActivityChange }) => {
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState(1);
  const [error, setError] = useState(false);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Formatirajte URL za PDF
  const formattedUrl = url.startsWith('http') 
    ? url 
    : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

  useEffect(() => {
    // Početak aktivnosti kada se PDF učita
    onActivityChange?.(true);
    lastActivityRef.current = Date.now();

    // Praćenje aktivnosti korisnika
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      onActivityChange?.(true);
    };

    // Dodaj event listenere za praćenje aktivnosti
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);

    // Timer za proveru neaktivnosti
    activityTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastActivityRef.current > 30000) { // 30 sekundi neaktivnosti
        onActivityChange?.(false);
      }
    }, 5000);

    return () => {
      onActivityChange?.(false);
      if (activityTimerRef.current) {
        clearInterval(activityTimerRef.current);
      }
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, [onActivityChange]);

  const handleLoad = () => {
    console.log('PDF loaded');
  };

  const handleError = () => {
    setError(true);
    onActivityChange?.(false);
  };

  const nextPage = () => {
    if (numPages && pageNumber < numPages) {
      setPageNumber(pageNumber + 1);
      onActivityChange?.(true);
      lastActivityRef.current = Date.now();
    }
  };

  const prevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
      onActivityChange?.(true);
      lastActivityRef.current = Date.now();
    }
  };

  const zoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
    onActivityChange?.(true);
    lastActivityRef.current = Date.now();
  };

  const zoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
    onActivityChange?.(true);
    lastActivityRef.current = Date.now();
  };

  const resetZoom = () => {
    setScale(1);
    onActivityChange?.(true);
    lastActivityRef.current = Date.now();
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to load PDF
          </h3>
          <p className="text-gray-600 mb-4">Please try downloading the document instead.</p>
          <a
            href={url}
            download
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => onActivityChange?.(true)}
          >
            Download PDF
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* PDF Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={prevPage}
              disabled={pageNumber <= 1}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm text-gray-700">
              Page <span className="font-semibold">{pageNumber}</span>
              {numPages && ` of ${numPages}`}
            </span>
            <button
              onClick={nextPage}
              disabled={numPages ? pageNumber >= numPages : false}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              title="Next page"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
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

      {/* PDF Viewer */}
      <div 
        className="flex-1 overflow-auto bg-gray-900 p-4"
        onClick={() => {
          onActivityChange?.(true);
          lastActivityRef.current = Date.now();
        }}
      >
        <div 
          className="bg-white mx-auto shadow-2xl" 
          style={{ 
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            transition: 'transform 0.2s ease'
          }}
        >
          <iframe
            src={formattedUrl}
            title={title}
            className="w-full h-full min-h-[600px] border-0"
            onLoad={handleLoad}
            onError={handleError}
          />
        </div>
      </div>

      {/* PDF Notes */}
      <div className="bg-gray-50 border-t border-gray-200 p-4">
        <div className="max-w-7xl mx-auto">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">PDF Controls</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Use the toolbar above to navigate between pages</li>
            <li>• Zoom in/out for better readability</li>
            <li>• The PDF may take a moment to load depending on size</li>
            <li>• If the PDF doesn't load, try downloading it</li>
            <li className="text-green-600 font-medium">
              ⏱️ Active learning time is being tracked
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;