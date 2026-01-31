// pages/UserAnalytics.tsx
import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { User, Course, Progress, ExamAttempt, UserCourseAssignment } from '../types';

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  usersByDepartment: Record<string, number>;
}

interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  totalEnrolled: number;
  completed: number;
  inProgress: number;
  averageScore: number;
  averageTimeSpent: number;
  completionRate: number;
}

const UserAnalytics: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    usersByRole: {},
    usersByDepartment: {}
  });
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeRange]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      // Dohvati sve korisnike
      const allUsers = await db.getAllUsers();
      setUsers(allUsers);

      // Dohvati sve kurseve
      const allCourses = await db.getCourses();
      setCourses(allCourses);

      // Izračunaj statistiku korisnika
      const stats = calculateUserStats(allUsers);
      setUserStats(stats);

      // Dohvati i izračunaj analitiku za svaki kurs
      const analytics = await Promise.all(
        allCourses.map(course => calculateCourseAnalytics(course, allUsers))
      );
      setCourseAnalytics(analytics);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateUserStats = (allUsers: User[]): UserStats => {
    const activeThreshold = new Date();
    activeThreshold.setDate(activeThreshold.getDate() - 30); // Aktivni u poslednjih 30 dana
    
    const activeUsers = allUsers.filter(user => {
      // Ovo je pojednostavljeno - u stvarnosti biste proverili poslednju aktivnost
      return true;
    }).length;

    const usersByRole: Record<string, number> = {};
    const usersByDepartment: Record<string, number> = {};

    allUsers.forEach(user => {
      // Grupisanje po ulozi
      const role = user.role || 'Nepoznato';
      usersByRole[role] = (usersByRole[role] || 0) + 1;

      // Grupisanje po odeljenju
      const dept = user.department || 'Nepoznato';
      usersByDepartment[dept] = (usersByDepartment[dept] || 0) + 1;
    });

    return {
      totalUsers: allUsers.length,
      activeUsers,
      usersByRole,
      usersByDepartment
    };
  };

  const calculateCourseAnalytics = async (course: Course, allUsers: User[]): Promise<CourseAnalytics> => {
    // Dohvati sve dodele kurseva
    const assignments: UserCourseAssignment[] = [];
    for (const user of allUsers) {
      const userAssignments = await db.getUserCourseAssignments(user.id);
      assignments.push(...userAssignments.filter(a => a.courseId === course.id));
    }

    // Dohvati progres za sve korisnike na ovom kursu
    const progresses: Progress[] = [];
    for (const user of allUsers) {
      const progress = await db.getProgress(user.id, course.id);
      progresses.push(progress);
    }

    // Dohvati sve pokušaje ispita za ovaj kurs
    const examAttempts: ExamAttempt[] = [];
    for (const user of allUsers) {
      const attempts = await db.getExamAttempts(user.id, course.id);
      examAttempts.push(...attempts);
    }

    // Izračunaj statistiku
    const totalEnrolled = assignments.length;
    const completed = progresses.filter(p => p.isCompleted).length;
    const inProgress = totalEnrolled - completed;
    
    // Prosečna ocena (samo za položene ispite)
    const passedAttempts = examAttempts.filter(a => a.passed);
    const averageScore = passedAttempts.length > 0 
      ? passedAttempts.reduce((sum, a) => sum + a.score, 0) / passedAttempts.length 
      : 0;
    
    // Prosečno vreme provedeno (u minutima)
    const totalTimeSpent = progresses.reduce((sum, p) => {
      const timeSpent = Object.values(p.lessonTimeSpent).reduce((s, t) => s + t, 0);
      return sum + timeSpent;
    }, 0);
    const averageTimeSpent = totalEnrolled > 0 ? totalTimeSpent / totalEnrolled / 60 : 0; // pretvori u minute
    
    const completionRate = totalEnrolled > 0 ? (completed / totalEnrolled) * 100 : 0;

    return {
      courseId: course.id,
      courseTitle: course.title,
      totalEnrolled,
      completed,
      inProgress,
      averageScore,
      averageTimeSpent,
      completionRate
    };
  };

  const exportToCSV = () => {
    // Priprema podataka za CSV izvoz
    const headers = ['Kurs', 'Ukupno upisano', 'Završeno', 'U toku', 'Prosječna ocena', 'Prosečno vreme (min)', 'Stopa završetka (%)'];
    const rows = courseAnalytics.map(course => [
      course.courseTitle,
      course.totalEnrolled.toString(),
      course.completed.toString(),
      course.inProgress.toString(),
      course.averageScore.toFixed(2),
      course.averageTimeSpent.toFixed(2),
      course.completionRate.toFixed(2)
    ]);
    
    // Kreiranje CSV sadržaja
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Preuzimanje CSV fajla
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `course_analytics_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Analitika korisnika</h1>
        <div className="flex space-x-2">
          <select 
            value={selectedTimeRange} 
            onChange={(e) => setSelectedTimeRange(e.target.value as any)}
            className="px-4 py-2 border rounded-md"
          >
            <option value="week">Zadnjih 7 dana</option>
            <option value="month">Zadnjih 30 dana</option>
            <option value="quarter">Zadnja 3 meseca</option>
            <option value="year">Zadnjih 12 meseci</option>
          </select>
          <button 
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Izvezi u CSV
          </button>
        </div>
      </div>

      {/* Kartice sa statistikom */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Ukupno korisnika</h2>
          <p className="text-3xl font-bold">{userStats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Aktivni korisnici</h2>
          <p className="text-3xl font-bold">{userStats.activeUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-2">Ukupno kurseva</h2>
          <p className="text-3xl font-bold">{courses.length}</p>
        </div>
      </div>

      {/* Grafikoni i tabele */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Korisnici po ulozi */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Korisnici po ulozi</h2>
          <div className="space-y-2">
            {Object.entries(userStats.usersByRole).map(([role, count]) => (
              <div key={role} className="flex justify-between">
                <span>{role}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Korisnici po odeljenju */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Korisnici po odjeljenju</h2>
          <div className="space-y-2">
            {Object.entries(userStats.usersByDepartment).map(([dept, count]) => (
              <div key={dept} className="flex justify-between">
                <span>{dept}</span>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela sa analitikom kurseva */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Analitika kurseva</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kurs
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Upisano
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Završeno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  U toku
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prosječna ocena
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prosječno vrijeme (min)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stopa završetka
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {courseAnalytics.map((course) => (
                <tr key={course.courseId}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {course.courseTitle}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.totalEnrolled}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.completed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.inProgress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.averageScore.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.averageTimeSpent.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${course.completionRate}%` }}
                        ></div>
                      </div>
                      <span>{course.completionRate.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserAnalytics;