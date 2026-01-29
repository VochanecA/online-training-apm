import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { User, Course, Progress, UserRole, AuditLog } from '../types';
import { Language, translations } from '../translations';
import { useNavigate } from 'react-router-dom';

const Reports: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [progressData, setProgressData] = useState<Progress[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [viewTab, setViewTab] = useState<'results' | 'audit'>('results');
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourseId, setFilterCourseId] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'passed' | 'failed'>('all');

  useEffect(() => {
    if (user.role === UserRole.TRAINEE) {
      navigate('/dashboard');
      return;
    }
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load data from Supabase
        const coursesData = await db.getCourses();
        setCourses(coursesData);
        
     
        const usersData = db.getUsers();
        setUsers(usersData);
        
        // Load progress data - we need to get progress for each course/user combination
        // This is inefficient but works for now
        const progressPromises: Promise<Progress>[] = [];
        
        // For each course, get progress for all users
        for (const course of coursesData) {
          // Get all users who might have progress
          for (const user of usersData) {
            try {
              progressPromises.push(db.getProgress(user.id, course.id));
            } catch (error) {
              console.error(`Error loading progress for user ${user.id}, course ${course.id}:`, error);
            }
          }
        }
        
        const progressResults = await Promise.all(progressPromises);
        // Filter out empty progress (users who haven't started the course)
        const validProgress = progressResults.filter(p => 
          p && (p.completedLessonIds.length > 0 || p.attempts.length > 0)
        );
        setProgressData(validProgress);
        
        // Load audit logs from Supabase
        const auditLogsData = await db.getAuditLogs();
        setAuditLogs(auditLogsData.reverse());
        
      } catch (error) {
        console.error('Error loading reports data:', error);
        alert(lang === 'en' ? 'Error loading reports data' : 'Greška pri učitavanju podataka izveštaja');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [user, navigate, lang]);

  const getCandidateName = (uid: string) => users.find(u => u.id === uid)?.name || 'Unknown';
  const getCourseTitle = (cid: string) => courses.find(c => c.id === cid)?.title || 'Deleted Course';
  const getCourseVersion = (cid: string) => courses.find(c => c.id === cid)?.version || 'N/A';

  const filteredReports = useMemo(() => {
    return progressData
      .filter(p => p.attempts.length > 0)
      .filter(p => filterCourseId === 'all' || p.courseId === filterCourseId)
      .filter(p => {
        if (filterStatus === 'all') return true;
        return filterStatus === 'passed' ? p.isCompleted : !p.isCompleted;
      })
      .filter(p => {
        const candidateName = getCandidateName(p.userId).toLowerCase();
        const courseTitle = getCourseTitle(p.courseId).toLowerCase();
        const query = searchQuery.toLowerCase();
        return candidateName.includes(query) || courseTitle.includes(query);
      })
      .filter(p => {
        const dateStr = p.completionDate || (p.attempts.length > 0 ? p.attempts[p.attempts.length - 1].timestamp : null);
        if (!dateStr) return true;
        
        const timestamp = new Date(dateStr).getTime();
        if (filterStartDate && timestamp < new Date(filterStartDate).getTime()) return false;
        if (filterEndDate && timestamp > new Date(filterEndDate).getTime() + 86400000) return false;
        return true;
      });
  }, [progressData, filterCourseId, filterStartDate, filterEndDate, filterStatus, searchQuery, users, courses]);

  const handleExportRecords = () => {
    const dataToExport = filteredReports.map(p => ({
      Candidate: getCandidateName(p.userId),
      Course: getCourseTitle(p.courseId),
      Version: getCourseVersion(p.courseId),
      Score: p.attempts.length > 0 ? p.attempts[p.attempts.length - 1].score : 0,
      Status: p.isCompleted ? 'Passed' : 'Failed',
      CompletionDate: p.completionDate || 'N/A',
      Attempts: p.attempts.length,
      TimeSpentSeconds: p.attempts.reduce((acc, attempt) => acc + (attempt.timeSpentSeconds || 0), 0)
    }));
    
    db.exportToCSV(dataToExport, `CloudTraining_Records_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportAudit = () => {
    const dataToExport = auditLogs.map(log => ({
      Timestamp: log.timestamp,
      User: getCandidateName(log.userId),
      Action: log.action,
      Details: log.details
    }));
    db.exportToCSV(dataToExport, `CloudTraining_Audit_Log_${new Date().toISOString().split('T')[0]}`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterCourseId('all');
    setFilterStatus('all');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  // Statistics for dashboard
  const stats = useMemo(() => {
    const totalAttempts = progressData.reduce((acc, p) => acc + p.attempts.length, 0);
    const passedCount = progressData.filter(p => p.isCompleted).length;
    
    // Calculate average score from attempts
    let totalScore = 0;
    let scoreCount = 0;
    
    progressData.forEach(p => {
      p.attempts.forEach(attempt => {
        totalScore += attempt.score;
        scoreCount++;
      });
    });
    
    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    
    return { totalAttempts, passedCount, averageScore };
  }, [progressData]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">
            {lang === 'en' ? 'Loading reports...' : 'Učitavanje izveštaja...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-8 bg-gradient-to-b from-blue-600 to-cyan-600 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t.reportTitle || 'Training Reports'}
              </h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base">
              {t.reportDesc || 'View and analyze training results and audit trails'}
            </p>
          </div>
          
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button 
              onClick={() => setViewTab('results')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                viewTab === 'results' 
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              {lang === 'en' ? 'Training Results' : 'Rezultati treninga'}
            </button>
            <button 
              onClick={() => setViewTab('audit')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                viewTab === 'audit' 
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white'
              }`}
            >
              {lang === 'en' ? 'Audit Trail' : 'Audit trag'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {viewTab === 'results' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.passedCount}</h3>
            <p className="text-sm text-gray-600 font-medium">
              {lang === 'en' ? 'Passed Attempts' : 'Položene probe'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.totalAttempts}</h3>
            <p className="text-sm text-gray-600 font-medium">
              {lang === 'en' ? 'Total Attempts' : 'Ukupno proba'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              </div>
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-blue-600 mb-1">{stats.averageScore}%</h3>
            <p className="text-sm text-gray-600 font-medium">
              {lang === 'en' ? 'Average Score' : 'Prosečan skor'}
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-gradient-to-b from-white to-gray-50/50 rounded-2xl p-5 md:p-8 border border-gray-200">
        {viewTab === 'results' ? (
          <>
            {/* Filters Section */}
            <div className="mb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {lang === 'en' ? 'Search Records' : 'Pretraži zapise'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchPlaceholder || (lang === 'en' ? "Search by candidate or course..." : "Pretraži po kandidatu ili kursu...")}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang === 'en' ? 'From Date' : 'Od datuma'}
                    </label>
                    <input 
                      type="date" 
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang === 'en' ? 'To Date' : 'Do datuma'}
                    </label>
                    <input 
                      type="date" 
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang === 'en' ? 'Filter by Course' : 'Filtriraj po kursu'}
                    </label>
                    <select 
                      value={filterCourseId}
                      onChange={(e) => setFilterCourseId(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                    >
                      <option value="all">{lang === 'en' ? 'All Courses' : 'Svi kursevi'}</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {lang === 'en' ? 'Status' : 'Status'}
                    </label>
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="w-full bg-white border border-gray-300 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
                    >
                      <option value="all">{lang === 'en' ? 'All Status' : 'Svi statusi'}</option>
                      <option value="passed">{lang === 'en' ? 'Passed' : 'Položeno'}</option>
                      <option value="failed">{lang === 'en' ? 'Failed' : 'Palo'}</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button 
                    onClick={resetFilters}
                    className="px-5 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {lang === 'en' ? 'Reset' : 'Resetuj'}
                  </button>
                  <button 
                    onClick={handleExportRecords}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    {lang === 'en' ? 'Export CSV' : 'Izvezi CSV'}
                  </button>
                </div>
              </div>
            </div>

            {/* Results Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Candidate' : 'Kandidat'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Course' : 'Kurs'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Score' : 'Skor'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Status' : 'Status'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Date' : 'Datum'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Actions' : 'Akcije'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredReports.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <p className="text-gray-600 font-medium mb-2">
                              {lang === 'en' ? 'No reports found' : 'Nema pronađenih izveštaja'}
                            </p>
                            <p className="text-gray-500 text-sm">
                              {lang === 'en' ? 'Try adjusting your filters' : 'Pokušajte da prilagodite filtere'}
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : filteredReports.map((p, idx) => {
                      const latestAttempt = p.attempts[p.attempts.length - 1];
                      const isPassed = p.isCompleted;
                      
                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm mr-3">
                                {getCandidateName(p.userId).charAt(0)}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{getCandidateName(p.userId)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{getCourseTitle(p.courseId)}</div>
                              <div className="text-xs text-gray-500">v{getCourseVersion(p.courseId)}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                                isPassed ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                              }`}>
                                <span className="font-bold text-lg">
                                  {latestAttempt ? latestAttempt.score : 0}%
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                              isPassed 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {isPassed ? (lang === 'en' ? 'Passed' : 'Položeno') : (lang === 'en' ? 'Failed' : 'Palo')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {p.completionDate 
                              ? new Date(p.completionDate).toLocaleDateString() 
                              : latestAttempt 
                                ? new Date(latestAttempt.timestamp).toLocaleDateString() 
                                : '-'
                            }
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => {
                                // Navigate to detailed view
                                console.log('View details for:', p.userId, p.courseId);
                              }}
                              className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                            >
                              {lang === 'en' ? 'View Details' : 'Pogledaj detalje'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Audit Trail Section */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {lang === 'en' ? 'Audit Trail' : 'Audit trag'}
                </h3>
                <p className="text-gray-600 text-sm">
                  {lang === 'en' ? 'System activity and user actions' : 'Aktivnosti sistema i akcije korisnika'}
                </p>
              </div>
              <button 
                onClick={handleExportAudit}
                className="px-5 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                {lang === 'en' ? 'Export Logs' : 'Izvezi logove'}
              </button>
            </div>

            {/* Audit Logs Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Timestamp' : 'Vreme'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'User' : 'Korisnik'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Action' : 'Akcija'}
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        {lang === 'en' ? 'Details' : 'Detalji'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 font-medium">
                            {new Date(log.timestamp).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center text-white font-semibold text-sm mr-3">
                              {getCandidateName(log.userId).charAt(0)}
                            </div>
                            <div className="font-medium text-gray-900 text-sm">
                              {getCandidateName(log.userId)}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Summary Cards */}
      {viewTab === 'results' && filteredReports.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800 mb-1">
                  {lang === 'en' ? 'Total Records' : 'Ukupno zapisa'}
                </p>
                <p className="text-2xl font-bold text-blue-900">{filteredReports.length}</p>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-5 rounded-2xl border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800 mb-1">
                  {lang === 'en' ? 'Pass Rate' : 'Stopa prolaznosti'}
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {filteredReports.length > 0
                    ? `${Math.round((filteredReports.filter(p => p.isCompleted).length / filteredReports.length) * 100)}%`
                    : '0%'}
                </p>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-100 p-5 rounded-2xl border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-800 mb-1">
                  {lang === 'en' ? 'Avg. Attempts' : 'Prosečno proba'}
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredReports.length > 0
                    ? (filteredReports.reduce((acc, p) => acc + p.attempts.length, 0) / filteredReports.length).toFixed(1)
                    : '0.0'}
                </p>
              </div>
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;