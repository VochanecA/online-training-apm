// pages/CertificateManagement.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../db';
import { User, UserRole, Course } from '../types';
import { Language, translations } from '../translations';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

interface CertificateData {
  id: string;
  certificateId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  courseId: string;
  courseTitle: string;
  courseCategory: string;
  examScore: number;
  practicalCheckStatus: string;
  completionDate: string;
  expiryDate: string;
  createdAt: string;
  updatedAt: string;
}

const CertificateManagement: React.FC<{ user: User, lang: Language }> = ({ user, lang }) => {
  const navigate = useNavigate();
  const t = translations[lang];
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [filteredCertificates, setFilteredCertificates] = useState<CertificateData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all'); // 'all', 'expired', 'active', 'practical'
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Učitavanje podataka
  useEffect(() => {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.INSPECTOR) {
      navigate('/app');
      return;
    }

    const loadCertificates = async () => {
      setIsLoading(true);
      try {
        const allCertificates = await db.getAllProgressWithDetails();
        setCertificates(allCertificates);
        setFilteredCertificates(allCertificates);
        console.log('Loaded certificates:', allCertificates.length);
      } catch (error) {
        console.error('Error loading certificates:', error);
        alert(lang === 'en' ? 'Error loading certificates. Check console for details.' : 'Greška pri učitavanju sertifikata. Provjerite konzolu za detalje.');
      } finally {
        setIsLoading(false);
      }
    };

    loadCertificates();
  }, [user, navigate, lang]);

  // Filtriraj sertifikate
  useEffect(() => {
    let filtered = certificates;

    // Primeni search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(cert =>
        cert.userName.toLowerCase().includes(term) ||
        cert.userEmail.toLowerCase().includes(term) ||
        cert.courseTitle.toLowerCase().includes(term) ||
        cert.certificateId.toLowerCase().includes(term)
      );
    }

    // Primeni status filter
    if (selectedFilter !== 'all') {
      switch (selectedFilter) {
        case 'expired':
          const now = new Date();
          filtered = filtered.filter(cert =>
            cert.expiryDate && new Date(cert.expiryDate) < now
          );
          break;
        case 'active':
          const nowActive = new Date();
          filtered = filtered.filter(cert =>
            !cert.expiryDate || new Date(cert.expiryDate) >= nowActive
          );
          break;
        case 'practical':
          filtered = filtered.filter(cert =>
            cert.practicalCheckStatus === 'COMPETENT'
          );
          break;
        case 'needs_renewal':
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          filtered = filtered.filter(cert =>
            cert.expiryDate &&
            new Date(cert.expiryDate) < thirtyDaysFromNow &&
            new Date(cert.expiryDate) >= new Date()
          );
          break;
      }
    }

    setFilteredCertificates(filtered);
  }, [certificates, searchTerm, selectedFilter]);

  // Statistike
  const stats = useMemo(() => {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    return {
      total: certificates.length,
      active: certificates.filter(cert =>
        !cert.expiryDate || new Date(cert.expiryDate) >= now
      ).length,
      expired: certificates.filter(cert =>
        cert.expiryDate && new Date(cert.expiryDate) < now
      ).length,
      needsRenewal: certificates.filter(cert =>
        cert.expiryDate &&
        new Date(cert.expiryDate) < thirtyDaysFromNow &&
        new Date(cert.expiryDate) >= now
      ).length,
      practicalCompetent: certificates.filter(cert =>
        cert.practicalCheckStatus === 'COMPETENT'
      ).length,
    };
  }, [certificates]);

  // Handle print certificate
  const handlePrintCertificate = (certificate: CertificateData) => {
    navigate(`/certificate/${certificate.courseId}?userId=${certificate.userId}`);
  };

  // Handle regenerate certificate ID
  const handleRegenerateCertificateId = async () => {
    if (!selectedCertificate) return;

    try {
      const newCertId = await db.regenerateCertificateId(selectedCertificate.id);
      if (newCertId) {
        // Update local state
        const updatedCertificates = certificates.map(cert =>
          cert.id === selectedCertificate.id
            ? { ...cert, certificateId: newCertId }
            : cert
        );
        setCertificates(updatedCertificates);
        setSelectedCertificate(null);
        setShowRegenerateModal(false);
        alert(lang === 'en' ? 'Certificate ID regenerated successfully!' : 'ID sertifikata je uspješno regenerisan!');
      } else {
        alert(lang === 'en' ? 'Failed to regenerate certificate ID.' : 'Neuspješno regenerisanje ID sertifikata.');
      }
    } catch (error) {
      console.error('Error regenerating certificate ID:', error);
      alert(lang === 'en' ? 'Error regenerating certificate ID.' : 'Greška pri regenerisanju ID sertifikata.');
    }
  };

  // Handle export to CSV
  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await db.exportCertificatesToCSV(filteredCertificates, `certificates_${format(new Date(), 'yyyy-MM-dd')}`);
    } catch (error) {
      console.error('Error exporting certificates:', error);
      alert(lang === 'en' ? 'Error exporting certificates.' : 'Greška pri izvozu sertifikata.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle bulk print
  const handleBulkPrint = () => {
    if (filteredCertificates.length === 0) {
      alert(lang === 'en' ? 'No certificates to print.' : 'Nema sertifikata za štampanje.');
      return;
    }

    // Open each certificate in new tab for printing
    filteredCertificates.forEach((cert, index) => {
      setTimeout(() => {
        window.open(`/certificate/${cert.courseId}?userId=${cert.userId}`, '_blank');
      }, index * 1000); // Delay 1 second between each
    });
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return lang === 'en' ? 'N/A' : 'N/D';
    return format(new Date(dateString), 'dd/MM/yyyy');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{t.loadingCertificates}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-2 h-8 bg-gradient-to-b from-emerald-600 to-green-600 rounded-full"></div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {t.certificateManagement}
              </h1>
            </div>
            <p className="text-gray-600 text-sm md:text-base">
              {t.viewManageExport}
            </p>
          </div>
          <div className="flex gap-3 self-start lg:self-auto">
            <button
              onClick={handleExportCSV}
              disabled={isExporting || filteredCertificates.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  {lang === 'en' ? 'Exporting...' : 'Izvoženje...'}
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t.exportCSV} ({filteredCertificates.length})
                </>
              )}
            </button>
            <button
              onClick={handleBulkPrint}
              disabled={filteredCertificates.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              {t.bulkPrint}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.total}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.totalCertificates}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.active}</h3>
          <p className="text-sm text-gray-600 font-medium">{lang === 'en' ? 'Active' : 'Aktivni'}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-rose-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.expired}</h3>
          <p className="text-sm text-gray-600 font-medium">{lang === 'en' ? 'Expired' : 'Istekli'}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.needsRenewal}</h3>
          <p className="text-sm text-gray-600 font-medium">{lang === 'en' ? 'Needs Renewal' : 'Potrebno Obnavljanje'}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{stats.practicalCompetent}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.practicalCompetent}</p>
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-100 to-violet-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
          </div>
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">{filteredCertificates.length}</h3>
          <p className="text-sm text-gray-600 font-medium">{t.filtered}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gradient-to-b from-white to-gray-50/50 rounded-2xl p-5 md:p-8 border border-gray-200 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t.certificateDirectory}</h2>
            <p className="text-gray-600 text-sm">{t.searchAndManageCertificates}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={t.searchCertificatePlaceholder}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <select
              value={selectedFilter}
              onChange={e => setSelectedFilter(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-colors text-gray-900"
            >
              <option value="all">{t.allCertificates}</option>
              <option value="active">{t.activeOnly}</option>
              <option value="expired">{t.expiredOnly}</option>
              <option value="practical">{t.practicalCompetent}</option>
              <option value="needs_renewal">{t.needsRenewal}</option>
            </select>
          </div>
        </div>

        {/* Certificate List */}
        <div className="space-y-3">
          {filteredCertificates.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-2">{t.noCertificatesFound}</p>
              <p className="text-gray-500 text-sm">{t.adjustSearchFilters}</p>
            </div>
          ) : filteredCertificates.map(cert => (
            <div
              key={cert.id}
              className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
                selectedCertificate?.id === cert.id
                  ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-300 shadow-sm'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedCertificate(cert)}
            >
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                    {cert.userName.charAt(0)}
                  </div>
                  {cert.expiryDate && new Date(cert.expiryDate) < new Date() ? (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full"></div>
                  ) : (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 text-sm truncate">{cert.userName}</h3>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                      {cert.userRole}
                    </span>
                    {cert.practicalCheckStatus === 'COMPETENT' && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {lang === 'en' ? 'Practical' : 'Praktični'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-gray-600 text-xs">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate">{cert.userEmail}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="truncate">{cert.courseTitle}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>{cert.examScore}%</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintCertificate(cert);
                    }}
                    className="p-2 text-blue-400 hover:text-blue-600 transition-colors"
                    title={t.printCertificate}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCertificate(cert);
                      setShowRegenerateModal(true);
                    }}
                    className="p-2 text-amber-400 hover:text-amber-600 transition-colors"
                    title={t.regenerateId}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="text-gray-500">{t.certificateId}:</span>
                    <code className="bg-gray-100 px-2 py-1 rounded font-mono">{cert.certificateId}</code>
                    <span className="text-gray-500">{t.completed}:</span>
                    <span className="font-medium">{formatDate(cert.completionDate)}</span>
                    {cert.expiryDate && (
                      <>
                        <span className="text-gray-500">{t.expires}:</span>
                        <span className={`font-medium ${new Date(cert.expiryDate) < new Date() ? 'text-red-600' : ''}`}>
                          {formatDate(cert.expiryDate)}
                          {new Date(cert.expiryDate) < new Date() && ` (${t.expired})`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Certificate Details Panel */}
      {selectedCertificate && (
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg sticky top-6 mb-8">
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white p-6 rounded-t-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center font-bold text-2xl">
                  {selectedCertificate.userName.charAt(0) || '?'}
                </div>
                <div>
                  <h2 className="text-xl font-bold">{t.certificateDetails}</h2>
                  <p className="text-gray-300 text-sm">{t.certificateId}: {selectedCertificate.certificateId}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCertificate(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* User Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {t.userInformation}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.fullName}</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {selectedCertificate.userName}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.emailAddress}</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {selectedCertificate.userEmail}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.role}</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {selectedCertificate.userRole}
                  </div>
                </div>
              </div>
            </div>

            {/* Course Info */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {t.courseInformation}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.courseTitle}</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 font-medium">
                    {selectedCertificate.courseTitle}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.courseCategory}</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {selectedCertificate.courseCategory}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.score}</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {selectedCertificate.examScore}%
                  </div>
                </div>
              </div>
            </div>

            {/* Certificate Dates */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {t.certificateDates}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.completionDate}</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {formatDate(selectedCertificate.completionDate)}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.expiryDate}</label>
                  <div className={`w-full px-4 py-3 border rounded-xl ${
                    selectedCertificate.expiryDate && new Date(selectedCertificate.expiryDate) < new Date()
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-gray-50 border-gray-200 text-gray-900'
                  }`}>
                    {selectedCertificate.expiryDate ? formatDate(selectedCertificate.expiryDate) : t.noExpiry}
                    {selectedCertificate.expiryDate && new Date(selectedCertificate.expiryDate) < new Date() && (
                      <span className="ml-2 text-xs font-medium">({t.expired})</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t.issuedOn}</label>
                  <div className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900">
                    {formatDate(selectedCertificate.createdAt)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                onClick={() => handlePrintCertificate(selectedCertificate)}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t.printCertificate}
              </button>
              <button
                onClick={() => {
                  setShowRegenerateModal(true);
                }}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {t.regenerateId}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Regenerate Certificate ID Modal */}
      {showRegenerateModal && selectedCertificate && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {t.regenerateIdWarning}
              </h3>
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  setSelectedCertificate(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-gray-600">
                {t.regenerateIdMessage} <strong>{selectedCertificate.userName}</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.928-.833-2.698 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-red-800">{lang === 'en' ? 'Warning' : 'Upozorenje'}</p>
                    <p className="text-xs text-red-600 mt-1">
                      {t.regenerateWarning}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleRegenerateCertificateId}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                type="button"
              >
                {t.regenerate}
              </button>
              <button
                onClick={() => {
                  setShowRegenerateModal(false);
                  setSelectedCertificate(null);
                }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                type="button"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificateManagement;