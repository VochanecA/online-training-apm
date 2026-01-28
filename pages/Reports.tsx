
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
    setCourses(db.getCourses());
    setUsers(db.getUsers());
    setProgressData(db.getProgress());
    setAuditLogs(db.getAuditLogs().reverse()); 
  }, [user, navigate]);

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
      Score: p.examScore || 0,
      Status: p.isCompleted ? 'Passed' : 'Failed',
      CompletionDate: p.completionDate || 'N/A',
      Attempts: p.attempts.length
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

  return (
    <div className="animate-in fade-in duration-700">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.reportTitle}</h1>
          <p className="text-slate-500 mt-2 font-medium">{t.reportDesc}</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-inner self-start md:self-auto">
          <button 
            onClick={() => setViewTab('results')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'results' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Training Results
          </button>
          <button 
            onClick={() => setViewTab('audit')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewTab === 'audit' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Audit Trail
          </button>
        </div>
      </header>

      {viewTab === 'results' ? (
        <>
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 mb-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Search Records</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  </div>
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.startDate}</label>
                <input 
                  type="date" 
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.endDate}</label>
                <input 
                  type="date" 
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900 transition-all"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4 border-t border-slate-50 pt-6">
              <div className="w-full md:w-64">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Filter by Course</label>
                <select 
                  value={filterCourseId}
                  onChange={(e) => setFilterCourseId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900 transition-all"
                >
                  <option value="all">All Courses</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="w-full md:w-36">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t.status}</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 font-bold text-slate-900 transition-all">
                  <option value="all">All</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              
              <div className="flex-1 flex justify-end gap-3">
                <button 
                  onClick={resetFilters}
                  className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-300 transition-all active:scale-95 h-[52px]"
                >
                  {t.resetFilters}
                </button>
                <button 
                  onClick={handleExportRecords}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all h-[52px] flex items-center gap-2 shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                  {t.exportRecord}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.candidate}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.course}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.version}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.score}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.result}</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.date}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-20 text-center">
                         <div className="flex flex-col items-center opacity-30">
                            <svg className="w-12 h-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="text-sm font-black uppercase tracking-widest">{t.noReports}</p>
                         </div>
                      </td>
                    </tr>
                  ) : filteredReports.map((p, idx) => {
                    const latestAttempt = p.attempts[p.attempts.length - 1];
                    const isPassed = p.isCompleted;
                    return (
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <td className="px-8 py-5">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-[10px]">
                                 {getCandidateName(p.userId).charAt(0)}
                              </div>
                              <span className="font-black text-slate-900 text-sm tracking-tight">{getCandidateName(p.userId)}</span>
                           </div>
                        </td>
                        <td className="px-8 py-5 text-slate-600 font-bold text-sm tracking-tight">{getCourseTitle(p.courseId)}</td>
                        <td className="px-8 py-5">
                          <span className="text-[9px] font-black bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 uppercase tracking-widest shadow-sm">
                            v{getCourseVersion(p.courseId)}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                           <span className={`text-sm font-black font-mono ${latestAttempt?.passed ? 'text-green-600' : 'text-red-500'}`}>
                              {latestAttempt ? `${latestAttempt.score}%` : (p.examScore ? `${p.examScore}%` : '-')}
                           </span>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-widest uppercase shadow-sm border ${isPassed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>{isPassed ? t.passed : t.failed}</span>
                        </td>
                        <td className="px-8 py-5 text-slate-400 text-[10px] font-black tracking-widest uppercase">{p.completionDate ? new Date(p.completionDate).toLocaleDateString() : (latestAttempt ? new Date(latestAttempt.timestamp).toLocaleDateString() : '-')}</td>
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
          <div className="mb-6 flex justify-end">
             <button 
              onClick={handleExportAudit}
              className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-2xl shadow-slate-900/20 hover:bg-black active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
              {t.exportAudit}
            </button>
          </div>
          <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">User</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors animate-in fade-in duration-300">
                      <td className="px-8 py-5 text-[10px] text-slate-400 font-black tracking-widest uppercase">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="px-8 py-5 font-black text-slate-900 text-sm tracking-tight">{getCandidateName(log.userId)}</td>
                      <td className="px-8 py-5"><span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black tracking-widest uppercase border border-slate-200 shadow-sm">{log.action}</span></td>
                      <td className="px-8 py-5 text-slate-600 text-sm font-medium leading-relaxed">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Reports;
