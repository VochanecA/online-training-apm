
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db';
import { Course, User, UserRole } from '../types';
import { Language, translations } from '../translations';

const CourseManagement: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user.role === UserRole.TRAINEE) {
      navigate('/dashboard');
      return;
    }
    setCourses(db.getCourses());
    setUsers(db.getUsers());
  }, [user, navigate]);

  const canEdit = user.role === UserRole.ADMIN || user.role === UserRole.INSTRUCTOR;
  const canDelete = user.role === UserRole.ADMIN;

  const getInstructorName = (id: string) => users.find(u => u.id === id)?.name || 'Unassigned';

  const filteredCourses = useMemo(() => {
    return courses.filter(c => 
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [courses, searchQuery]);

  const handleDelete = (id: string) => {
    if (!canDelete) return;
    if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      const updated = courses.filter(c => c.id !== id);
      db.saveCourses(updated);
      db.logAction(user.id, 'COURSE_DELETE', `Deleted course ID: ${id}`);
      setCourses(updated);
    }
  };

  return (
    <div>
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{t.courseManagement}</h1>
          <p className="text-slate-500 mt-2">{t.managementDesc}</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => navigate('/admin/course/new')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold shadow-lg transition-all flex items-center shrink-0 active:scale-95"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t.createNewCourse}
          </button>
        )}
      </header>

      <div className="mb-8 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input 
          type="text" 
          placeholder="Search by title or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-slate-900 font-medium"
        />
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.title}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.version}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Instructor</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.category}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.lessons}</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium uppercase tracking-widest text-xs">
                    {t.noCoursesFound}
                  </td>
                </tr>
              ) : (
                filteredCourses.map(course => (
                  <tr key={course.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <img src={course.thumbnail} className="w-10 h-10 rounded-lg object-cover shadow-sm" alt={course.title} />
                        <span className="font-semibold text-slate-900">{course.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-600 font-black">
                        v{course.version}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500 border border-slate-200 uppercase">
                          {getInstructorName(course.instructorId).charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-slate-700">{getInstructorName(course.instructorId)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-tighter">
                        {course.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-sm">
                      {course.lessons.length} {t.lessons}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {canEdit && (
                        <button 
                          onClick={() => navigate(`/admin/course/edit/${course.id}`)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={() => handleDelete(course.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                      {!canEdit && <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">ReadOnly</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CourseManagement;
