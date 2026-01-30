import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, Progress, User } from '../types';
import { Language, translations } from '../translations';

// Constants for better maintainability
const CERTIFICATE_BORDER_WIDTH = 24;
const CERTIFICATE_PRINT_BORDER_WIDTH = 20;

// Custom hook for certificate data fetching
const useCertificateData = (courseId: string | undefined, userId: string) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificateData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (!courseId) {
          throw new Error('Course ID is required');
        }

        const foundCourse = (await db.getCourses()).find(c => c.id === courseId);
        if (!foundCourse) {
          throw new Error('Course not found');
        }

        // Assuming getUserProgress returns a single Progress object or null
        const userProgress = db.getUserProgress(userId, courseId);
        
        // Check if userProgress is a Promise and resolve it if needed
        let progressData: Progress | null = null;
        
        // Resolve potential promise first, then handle whether the result is an array or a single Progress
        const resolved = userProgress instanceof Promise ? await userProgress : userProgress;
        
        if (Array.isArray(resolved)) {
          // If it returns an array, find the progress for this course
          progressData = resolved.find(p => p.courseId === courseId) || null;
        } else {
          progressData = resolved as Progress | null;
        }

        if (!progressData || !progressData.isCompleted) {
          throw new Error('Certificate not available or course not completed');
        }

        setCourse(foundCourse);
        setProgress(progressData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load certificate');
        console.error('Certificate data error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCertificateData();
  }, [courseId, userId]);

  return { course, progress, isLoading, error };
};

// SVG Icons as React components (replacing Heroicons)
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const PrinterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);

const CloudIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const CheckBadgeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Loading component
const CertificateLoading: React.FC<{ lang: Language }> = ({ lang }) => {
  const t = translations[lang];
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">{t.loading || 'Loading...'}</p>
      </div>
    </div>
  );
};

// Error component
const CertificateError: React.FC<{ 
  error: string; 
  onRetry?: () => void;
  lang: Language 
}> = ({ error, onRetry, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];

  return (
    <div className="max-w-2xl mx-auto py-16 px-4 text-center">
      <div className="bg-red-50 rounded-2xl p-8 mb-8">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ErrorIcon className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="text-xl font-bold text-red-900 mb-2">
          {t.certificateError || 'Certificate Error'}
        </h3>
        <p className="text-red-700 mb-6">{error}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors"
          >
            {t.returnToDashboard || 'Return to Dashboard'}
          </button>
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
            >
              {t.retry || 'Try Again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Certificate header with controls
const CertificateHeader: React.FC<{
  onBack: () => void;
  onPrint: () => void;
  lang: Language;
}> = ({ onBack, onPrint, lang }) => {
  const t = translations[lang];

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 no-print">
      <button
        onClick={onBack}
        className="flex items-center text-slate-600 hover:text-slate-900 font-bold text-sm transition-colors group"
        aria-label={t.returnToCourse}
      >
        <ArrowLeftIcon className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />
        {t.returnToCourse}
      </button>
      
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <p className="text-xs text-slate-500 font-medium md:block">
          {t.printHint || 'Select "Save as PDF" in print options for best results'}
        </p>
        <button
          onClick={onPrint}
          className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:from-blue-700 hover:to-blue-800 transition-all flex items-center shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={t.printCertificate}
        >
          <PrinterIcon className="w-5 h-5 mr-2" />
          {t.printCertificate}
        </button>
      </div>
    </div>
  );
};

// Main certificate component
const CertificateContent: React.FC<{
  user: User;
  course: Course;
  progress: Progress;
  lang: Language;
}> = ({ user, course, progress, lang }) => {
  const t = translations[lang];
  const completionDate = progress.completionDate 
    ? new Date(progress.completionDate)
    : new Date();

  const formatDate = useCallback((date: Date) => {
    return date.toLocaleDateString(lang === 'en' ? 'en-US' : 'sr-Latn-RS', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [lang]);

  return (
    <div 
      className="bg-white border-[24px] border-double border-slate-900 p-8 md:p-16 text-center relative overflow-hidden certificate-content shadow-2xl print:shadow-none"
      style={{ borderWidth: `${CERTIFICATE_BORDER_WIDTH}px` }}
    >
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-gradient-to-br from-blue-50 to-blue-100 rounded-full opacity-60" />
      <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-gradient-to-tr from-slate-50 to-slate-100 rounded-full opacity-60" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] border-2 border-slate-100 rounded-full opacity-10 pointer-events-none" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] bg-[url('data:image/svg+xml,%3Csvg%20width=%22100%22%20height=%22100%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M0%200h100v100H0z%22%20fill=%22none%22/%3E%3Cpath%20d=%22M20%2020h60v60H20z%22%20stroke=%22%23000%22%20stroke-width=%222%22%20fill=%22none%22/%3E%3C/svg%3E')]" />

      <div className="relative z-10">
        {/* Certificate Logo/Icon */}
        <div className="flex justify-center mb-8 md:mb-12">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl rotate-45 flex items-center justify-center shadow-xl transform-gpu">
            <CheckBadgeIcon className="w-16 h-16 text-white -rotate-45" />
          </div>
        </div>

        {/* Certificate Header */}
        <div className="mb-10">
          <p className="text-sm font-black tracking-[0.4em] uppercase text-slate-400 mb-2">
            {t.certificateOfCompletion}
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent mx-auto" />
        </div>

        {/* User Name */}
        <div className="mb-10">
          <p className="text-lg text-slate-500 mb-3 font-medium">
            {t.certifyThat}
          </p>
          <h2 className="text-4xl md:text-6xl text-slate-900 font-black mb-2 tracking-tight break-words">
            {user.name}
          </h2>
        </div>

        {/* Course Details */}
        <div className="mb-12 md:mb-14">
          <p className="text-lg text-slate-500 mb-3 font-medium">
            {t.completedCourse}
          </p>
          <h3 className="text-2xl md:text-4xl font-black text-blue-700 mb-2 tracking-tight uppercase break-words">
            {course.title}
          </h3>
          {course.subtitle && (
            <p className="text-slate-600 italic mt-2">
              {course.subtitle}
            </p>
          )}
        </div>

        {/* Achievement Text */}
        <div className="max-w-2xl mx-auto mb-16 md:mb-20">
          <p className="text-slate-600 leading-relaxed text-lg font-medium">
            {t.requirementsMet.replace('{score}', (progress.examScore || 0).toString())}
          </p>
          <div className="flex items-center justify-center mt-6 gap-2">
            <CloudIcon className="w-5 h-5 text-blue-500" />
            <span className="text-sm text-slate-500 font-medium">
              CloudTraining Aviation Academy
            </span>
          </div>
        </div>

        {/* Footer with signatures and details */}
        <div className="flex flex-col md:flex-row justify-between items-center md:items-end gap-8 mt-16 md:mt-24 max-w-4xl mx-auto">
          {/* Training Director Signature */}
          <div className="text-center md:text-left">
            <div className="border-b-2 border-slate-300 w-48 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
              {t.trainingDirector}
            </p>
            <p className="text-sm text-slate-900 font-bold">
              CloudTraining Aviation Academy
            </p>
          </div>
          
          {/* Certificate ID */}
          <div className="text-center bg-slate-50 px-6 py-4 rounded-2xl border border-slate-200 shadow-inner order-first md:order-none">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {t.verifyId}
            </p>
            <p className="text-sm font-mono font-bold text-slate-900 tracking-wide select-all">
              {progress.certificateId}
            </p>
          </div>

          {/* Issue Date */}
          <div className="text-center md:text-right">
            <p className="text-lg text-slate-900 font-bold mb-1">
              {formatDate(completionDate)}
            </p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {t.issueDate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component
const CertificateView: React.FC<{ user: User; lang: Language }> = ({ user, lang }) => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { course, progress, isLoading, error } = useCertificateData(courseId, user.id);
  const t = translations[lang];

  const handleBack = () => {
    navigate(`/course/${courseId}`);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRetry = () => {
    window.location.reload();
  };

  if (isLoading) {
    return <CertificateLoading lang={lang} />;
  }

  if (error) {
    return <CertificateError error={error} onRetry={handleRetry} lang={lang} />;
  }

  if (!course || !progress) {
    return (
      <CertificateError 
        error={t.certificateNotFound || 'Certificate not found'} 
        onRetry={handleRetry}
        lang={lang}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-6 md:py-8 px-4">
      <CertificateHeader 
        onBack={handleBack}
        onPrint={handlePrint}
        lang={lang}
      />
      
      <CertificateContent 
        user={user}
        course={course}
        progress={progress}
        lang={lang}
      />

      {/* Print styles */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: A4 landscape;
          }
          
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .no-print {
            display: none !important;
          }
          
          .max-w-6xl {
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .certificate-content {
            border-width: ${CERTIFICATE_PRINT_BORDER_WIDTH}px !important;
            margin: 0 !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
            height: 100vh;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            padding: 2rem !important;
          }
          
          /* Improve text rendering for print */
          h2, h3, p {
            color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
        }
        
        /* Screen-only styles */
        @media screen {
          .certificate-content {
            min-height: 80vh;
          }
        }
      `}</style>
    </div>
  );
};

export default CertificateView;