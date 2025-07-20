'use client';

import { useState, useEffect } from 'react';
import { Calendar, Building2, Users, Download, Filter, TrendingUp, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface InternshipReport {
  totalStudents: number;
  assignedStudents: number;
  unassignedStudents: number;
  activeInternships: number;
  completedInternships: number;
  terminatedInternships: number;
  companiesWithStudents: number;
  totalCompanies: number;
  avgInternshipDuration: number;
  terminationRate: number;
}

interface CompanyReport {
  companyId: string;
  companyName: string;
  activeStudents: number;
  totalStudents: number;
  completedInternships: number;
  terminatedInternships: number;
  teacher?: {
    name: string;
    surname: string;
  };
}

interface FieldReport {
  fieldId: string;
  fieldName: string;
  totalStudents: number;
  assignedStudents: number;
  activeInternships: number;
  companies: string[];
}

interface RecentActivity {
  id: string;
  action: string;
  studentName: string;
  companyName: string;
  performedAt: string;
  performedBy: string;
}

export default function InternshipReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0]
  });

  const [overallReport, setOverallReport] = useState<InternshipReport | null>(null);
  const [companyReports, setCompanyReports] = useState<CompanyReport[]>([]);
  const [fieldReports, setFieldReports] = useState<FieldReport[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Simulate API calls - in real implementation, these would be actual API endpoints
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate loading
      
      // Mock data - replace with actual API calls
      setOverallReport({
        totalStudents: 450,
        assignedStudents: 380,
        unassignedStudents: 70,
        activeInternships: 365,
        completedInternships: 120,
        terminatedInternships: 25,
        companiesWithStudents: 85,
        totalCompanies: 120,
        avgInternshipDuration: 89, // days
        terminationRate: 6.4 // percentage
      });

      setCompanyReports([
        {
          companyId: '1',
          companyName: 'TechCorp Ltd.',
          activeStudents: 12,
          totalStudents: 18,
          completedInternships: 5,
          terminatedInternships: 1,
          teacher: { name: 'Ahmet', surname: 'Yılmaz' }
        },
        {
          companyId: '2',
          companyName: 'Digital Solutions',
          activeStudents: 8,
          totalStudents: 15,
          completedInternships: 6,
          terminatedInternships: 1
        }
      ]);

      setFieldReports([
        {
          fieldId: '1',
          fieldName: 'Bilgisayar Programcılığı',
          totalStudents: 180,
          assignedStudents: 165,
          activeInternships: 158,
          companies: ['TechCorp', 'Digital Solutions', 'Code Academy', 'Software House']
        },
        {
          fieldId: '2',
          fieldName: 'Muhasebe',
          totalStudents: 120,
          assignedStudents: 110,
          activeInternships: 105,
          companies: ['Accounting Firm', 'Tax Consultancy', 'Finance Corp']
        }
      ]);

      setRecentActivities([
        {
          id: '1',
          action: 'TERMINATED',
          studentName: 'Ayşe Demir',
          companyName: 'TechCorp Ltd.',
          performedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          performedBy: 'Mehmet Öğretmen'
        },
        {
          id: '2',
          action: 'ASSIGNED',
          studentName: 'Can Özdemir',
          companyName: 'Digital Solutions',
          performedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          performedBy: 'Fatma Koordinatör'
        }
      ]);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = (format: 'csv' | 'pdf') => {
    // Implement export functionality
    console.log(`Exporting report as ${format}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionText = (action: string) => {
    const actionTexts: { [key: string]: string } = {
      'TERMINATED': 'Fesih Edildi',
      'ASSIGNED': 'Atandı',
      'COMPLETED': 'Tamamlandı',
      'CREATED': 'Oluşturuldu'
    };
    return actionTexts[action] || action;
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'TERMINATED':
        return 'bg-red-100 text-red-800';
      case 'ASSIGNED':
      case 'CREATED':
        return 'bg-green-100 text-green-800';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Staj Raporları</h1>
          <p className="text-gray-600 mt-1">Kapsamlı staj yönetimi raporları ve istatistikleri</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => exportReport('csv')}
          >
            CSV İndir
          </Button>
          <Button
            variant="outline" 
            leftIcon={<Download className="h-4 w-4" />}
            onClick={() => exportReport('pdf')}
          >
            PDF İndir
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <label className="text-sm font-medium text-gray-700">Tarih Aralığı:</label>
          </div>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="border rounded px-3 py-1 text-sm"
          />
          <span className="text-gray-500">-</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="border rounded px-3 py-1 text-sm"
          />
          <Button size="sm" leftIcon={<Filter className="h-4 w-4" />}>
            Filtrele
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      {overallReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Toplam Öğrenci</p>
                <p className="text-3xl font-bold">{overallReport.totalStudents}</p>
                <p className="text-blue-100 text-xs">
                  {overallReport.assignedStudents} atanmış, {overallReport.unassignedStudents} atanmamış
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Aktif Stajlar</p>
                <p className="text-3xl font-bold">{overallReport.activeInternships}</p>
                <p className="text-green-100 text-xs">
                  %{((overallReport.activeInternships / overallReport.totalStudents) * 100).toFixed(1)} oran
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Tamamlanan</p>
                <p className="text-3xl font-bold">{overallReport.completedInternships}</p>
                <p className="text-purple-100 text-xs">
                  Ort. {overallReport.avgInternshipDuration} gün süre
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-200" />
            </div>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Fesih Edilen</p>
                <p className="text-3xl font-bold">{overallReport.terminatedInternships}</p>
                <p className="text-red-100 text-xs">
                  %{overallReport.terminationRate} fesih oranı
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-200" />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Performance */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Şirket Performansı
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {companyReports.map((company) => (
                <div key={company.companyId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{company.companyName}</h3>
                    <p className="text-sm text-gray-600">
                      Aktif: {company.activeStudents} | Toplam: {company.totalStudents}
                    </p>
                    {company.teacher && (
                      <p className="text-xs text-gray-500">
                        Koordinatör: {company.teacher.name} {company.teacher.surname}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-green-600">
                      ✓ {company.completedInternships}
                    </div>
                    <div className="text-sm text-red-600">
                      ✗ {company.terminatedInternships}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Field Statistics */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Alan Bazlı İstatistikler</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {fieldReports.map((field) => (
                <div key={field.fieldId} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">{field.fieldName}</h3>
                    <span className="text-sm text-gray-600">
                      {field.assignedStudents}/{field.totalStudents}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${(field.assignedStudents / field.totalStudents) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {field.companies.length} şirket • {field.activeInternships} aktif staj
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Son Aktiviteler</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>
                    {getActionText(activity.action)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.studentName}</p>
                    <p className="text-xs text-gray-600">{activity.companyName}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <p>{formatDate(activity.performedAt)}</p>
                  <p>{activity.performedBy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}