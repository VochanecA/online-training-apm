import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../db';
import { Language, translations } from '../translations';
import { useNavigate } from 'react-router-dom';
import { Course } from '../types';

interface PublicCoursesProps {
  lang: Language;
  setLang: (l: Language) => void;
}

const PublicCourses: React.FC<PublicCoursesProps> = ({ lang, setLang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Load courses from Supabase
  useEffect(() => {
    const loadCourses = async () => {
      try {
        setLoading(true);
        console.log('Loading public courses from Supabase...');
        
        const coursesData = await db.getCourses();
        console.log(`Loaded ${coursesData.length} courses from Supabase`);
        
        // Debug: log first few courses
        coursesData.slice(0, 3).forEach((course, idx) => {
          console.log(`Course ${idx + 1}:`, {
            id: course.id,
            title: course.title,
            category: course.category,
            lessons: course.lessons?.length || 0,
            hasThumbnail: !!course.thumbnail
          });
        });
        
        setCourses(coursesData);
        setError(null);
      } catch (err) {
        console.error('Error loading courses:', err);
        setError('Failed to load courses. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadCourses();
  }, []);

  // Extract unique categories
  const categories = useMemo(() => {
    const allCategories = courses.map(c => c.category);
    const uniqueCategories = Array.from(new Set(allCategories));
    return ['all', ...uniqueCategories];
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let result = courses;
    
    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(c => {
        const title = c.title?.toLowerCase() || '';
        const category = c.category?.toLowerCase() || '';
        const description = c.description?.toLowerCase() || '';
        
        return title.includes(lowerSearch) || 
               category.includes(lowerSearch) ||
               description.includes(lowerSearch);
      });
    }
    
    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(c => c.category === selectedCategory);
    }
    
    return result;
  }, [courses, searchTerm, selectedCategory]);

  // Calculate estimated duration based on lessons
  const calculateDuration = (course: Course): string => {
    const totalLessons = course.lessons?.length || 0;
    if (totalLessons === 0) return lang === 'en' ? 'Self-paced' : 'Samostalno';
    
    const avgTimePerLesson = 30; // minutes
    const totalMinutes = totalLessons * avgTimePerLesson;
    
    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    } else if (totalMinutes < 480) { // 8 hours
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const days = Math.ceil(totalMinutes / 480); // 8-hour work day
      return `${days} ${lang === 'en' ? 'days' : 'dana'}`;
    }
  };

  // Default thumbnail if not provided
  const getThumbnailUrl = (course: Course): string => {
    if (course.thumbnail) return course.thumbnail;
    
    // Generate placeholder based on category
    const categoryColors: Record<string, string> = {
      'Safety': 'from-red-50 to-orange-50',
      'Security': 'from-blue-50 to-indigo-50',
      'Operations': 'from-green-50 to-teal-50',
      'Customer Service': 'from-purple-50 to-pink-50',
      'default': 'from-gray-50 to-blue-50'
    };
    
    const gradient = categoryColors[course.category] || categoryColors.default;
    return `linear-gradient(135deg, ${gradient})`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Inter'] text-gray-800">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-60"></div>
                <div className="relative bg-gradient-to-r from-blue-700 to-cyan-700 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">CLOUDTRAINING</div>
                <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Aviation Training</div>
              </div>
            </div>
          </div>
        </nav>

        {/* Loading State */}
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            {lang === 'en' ? 'Loading courses...' : 'Učitavanje tečajeva...'}
          </h2>
          <p className="text-gray-500">
            {lang === 'en' ? 'Fetching the latest training programs...' : 'Preuzimamo najnovije programe obuke...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 font-['Inter'] text-gray-800">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-white border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-60"></div>
                <div className="relative bg-gradient-to-r from-blue-700 to-cyan-700 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                </div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">CLOUDTRAINING</div>
                <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Aviation Training</div>
              </div>
            </div>
          </div>
        </nav>

        {/* Error State */}
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            {lang === 'en' ? 'Unable to load courses' : 'Ne mogu se učitati tečajevi'}
          </h2>
          <p className="text-gray-600 max-w-md mx-auto mb-8">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            {lang === 'en' ? 'Try Again' : 'Pokušaj Ponovo'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-['Inter'] text-gray-800">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg blur opacity-60"></div>
              <div className="relative bg-gradient-to-r from-blue-700 to-cyan-700 p-2 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">CLOUDTRAINING</div>
              <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Aviation Training</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button 
                onClick={() => setLang('en')} 
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${lang === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLang('me')} 
                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${lang === 'me' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                ME
              </button>
            </div>
            <button 
              onClick={() => navigate('/')} 
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-semibold text-sm hover:from-blue-700 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg"
            >
              {lang === 'en' ? 'Portal Login' : 'Portal Prijava'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-50 via-white to-cyan-50/30 border-b border-gray-200/50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
          <div className="text-center">
            <div className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 rounded-full text-xs font-semibold mb-6">
              <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {lang === 'en' ? 'Public Course Catalog' : 'Javni katalog tečajeva'}
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
              Aviation Training
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">
                Course Catalog
              </span>
            </h1>
            
            <p className="text-gray-600 text-lg font-medium max-w-3xl mx-auto leading-relaxed mb-10">
              {lang === 'en' 
                ? 'Browse our comprehensive collection of aviation training programs designed for regulatory compliance and professional development.'
                : 'Pregledajte našu sveobuhvatnu kolekciju programa avijacijske obuke dizajniranih za regulatornu usklađenost i profesionalni razvoj.'}
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 mb-10">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{courses.length}</div>
                <div className="text-sm text-gray-600 font-medium">
                  {lang === 'en' ? 'Courses Available' : 'Dostupnih kurseva'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-600">
                  {courses.reduce((total, course) => total + (course.lessons?.length || 0), 0)}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {lang === 'en' ? 'Learning Modules' : 'Modula za učenje'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {categories.length - 1}
                </div>
                <div className="text-sm text-gray-600 font-medium">
                  {lang === 'en' ? 'Categories' : 'Kategorija'}
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto mb-12">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input 
                type="text" 
                placeholder={lang === 'en' ? 'Search courses by title, category, or keyword...' : 'Pretraži tečajeve po naslovu, kategoriji ili ključnoj riječi...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-14 pr-5 py-4 bg-white border border-gray-300 rounded-xl shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-gray-900 font-medium transition-colors"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-2 mb-12">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedCategory === category 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                    : 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  {category === 'all' 
                    ? (lang === 'en' ? 'All Courses' : 'Svi tečajevi')
                    : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12 lg:py-20">
        {filteredCourses.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {lang === 'en' ? 'Available Courses' : 'Dostupni tečajevi'}
                <span className="text-gray-500 text-lg font-normal ml-2">
                  ({filteredCourses.length})
                </span>
              </h2>
              <div className="text-sm text-gray-500">
                {lang === 'en' ? 'Showing' : 'Prikazano'} {filteredCourses.length} {lang === 'en' ? 'courses' : 'tečajeva'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map(course => (
                <div 
                  key={course.id}
                  className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 overflow-hidden flex flex-col h-full"
                >
                  {/* Course Image */}
                  <div 
                    className="h-48 relative overflow-hidden"
                    style={course.thumbnail ? undefined : {
                      background: getThumbnailUrl(course)
                    }}
                  >
                    {course.thumbnail ? (
                      <img 
                        src={course.thumbnail} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback to gradient if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement!.style.background = getThumbnailUrl(course);
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-blue-600 text-4xl">
                          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      </div>
                    )}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-lg text-xs font-semibold text-blue-700 shadow-sm">
                        {course.category?.charAt(0).toUpperCase() + course.category?.slice(1) || 'General'}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className="px-2 py-1 bg-black/50 backdrop-blur-sm rounded text-xs font-semibold text-white">
                        v{course.version || '1.0'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Course Content */}
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {course.title || 'Untitled Course'}
                    </h3>
                    
                    <p className="text-gray-600 text-sm leading-relaxed mb-6 line-clamp-3 flex-1">
                      {course.description || 'No description available.'}
                    </p>
                    
                    {/* Course Metadata */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{calculateDuration(course)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>{course.lessons?.length || 0} {lang === 'en' ? 'lessons' : 'lekcija'}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{course.validityYears || 2} {lang === 'en' ? 'years validity' : 'godina važenja'}</span>
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <button 
                        onClick={() => navigate('/')}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-lg shadow-sm hover:shadow transition-all duration-300 flex items-center justify-center group/btn"
                      >
                        <span>{lang === 'en' ? 'Enroll Now' : 'Upiši se'}</span>
                        <svg className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* No Results State */
          <div className="text-center py-16 lg:py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              {lang === 'en' ? 'No courses found' : 'Nije pronađen nijedan kurs'}
            </h3>
            <p className="text-gray-600 max-w-md mx-auto mb-8">
              {lang === 'en' 
                ? 'Try adjusting your search or filter to find what you\'re looking for.'
                : 'Pokušajte prilagoditi svoju pretragu ili filtar kako biste pronašli ono što tražite.'}
            </p>
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }}
              className="px-6 py-2.5 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors"
            >
              {lang === 'en' ? 'Clear filters' : 'Očisti filtere'}
            </button>
          </div>
        )}
      </main>

      {/* Compliance & Trust Section */}
      <div className="bg-gradient-to-b from-white to-gray-50 border-t border-gray-200/50 py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm text-gray-500 font-medium mb-8">
              {lang === 'en' ? 'COMPLIANT WITH AVIATION REGULATIONS' : 'USKLAĐENO S AVJACIJSKIM PROPISIMA'}
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
              <div className="text-sm font-semibold text-gray-700 opacity-80 hover:opacity-100 transition-opacity">EASA</div>
              <div className="text-sm font-semibold text-gray-700 opacity-80 hover:opacity-100 transition-opacity">ICAO</div>
              <div className="text-sm font-semibold text-gray-700 opacity-80 hover:opacity-100 transition-opacity">FAA</div>
              <div className="text-sm font-semibold text-gray-700 opacity-80 hover:opacity-100 transition-opacity">IATA</div>
              <div className="text-sm font-semibold text-gray-700 opacity-80 hover:opacity-100 transition-opacity">ISO 9001</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200/50 py-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm">
            <div className="mb-4 md:mb-0">
              <span className="font-semibold text-gray-700">© 2026 CLOUDTRAINING Aviation Training Platform</span>
              <span className="mx-2">•</span>
              <span>{lang === 'en' ? 'All rights reserved' : 'Sva prava zadržana'}</span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-gray-700 font-medium">GDPR Compliant</span>
              <div className="h-4 w-px bg-gray-300"></div>
              <span>{lang === 'en' ? 'Enterprise-Grade Security' : 'Sigurnost na nivou poduzeća'}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicCourses;