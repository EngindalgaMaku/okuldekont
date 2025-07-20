'use client';

import { useState, useEffect } from 'react';
import { Calendar, Building2, Users, AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface StudentHistoryViewProps {
  isOpen: boolean;
  onClose: () => void;
  student: {
    id: string;
    name: string;
    surname: string;
    className: string;
    number?: string;
  } | null;
}

interface TimelineEvent {
  type: 'internship' | 'audit';
  action: string;
  date: string;
  internshipId?: string;
  companyName?: string;
  teacherName?: string;
  educationYear?: string;
  performedBy?: string;
  reason?: string;
  notes?: string;
  previousData?: any;
  newData?: any;
  status?: string;
  details?: any;
}

interface HistoryStats {
  totalInternships: number;
  activeInternships: number;
  completedInternships: number;
  terminatedInternships: number;
  companies: string[];
  currentCompany: string | null;
}

export default function StudentHistoryView({ isOpen, onClose, student }: StudentHistoryViewProps) {
  const [loading, setLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      fetchStudentHistory();
    }
  }, [isOpen, student]);

  const fetchStudentHistory = async () => {
    if (!student) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/students/${student.id}/internship-history`);
      if (response.ok) {
        const data = await response.json();
        setTimeline(data.timeline || []);
        setStats(data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching student history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATED':
      case 'ASSIGNED':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'TERMINATED':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED':
      case 'ASSIGNED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'TERMINATED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatActionText = (action: string, reason?: string) => {
    // Eğer reason Turkish text içeriyorsa, onu kullan
    if (reason && (reason.includes('koordinatör') || reason.includes('atandı') || reason.includes('fesih') || reason.includes('değiştirildi'))) {
      return reason;
    }
    
    const actionTexts: { [key: string]: string } = {
      'CREATED': 'Staj Kaydı Oluşturuldu',
      'ASSIGNED': 'Koordinatör Atandı', 
      'TERMINATED': 'Staj Fesih Edildi',
      'COMPLETED': 'Staj Tamamlandı',
      'COMPANY_CHANGED': 'Şirket Değiştirildi',
      'TEACHER_CHANGED': 'Koordinatör Değiştirildi',
      'UPDATED': 'Bilgiler Güncellendi'
    };
    return actionTexts[action] || action;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEventClick = (event: TimelineEvent) => {
    setSelectedEvent(event);
    setShowDetailModal(true);
  };

  if (!student) return null;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`${student.name} ${student.surname} - Staj Geçmişi`}
        titleIcon={Calendar}
      >
        <div className="space-y-6">
          {/* Student Info */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-2">Öğrenci Bilgileri</h3>
            <div className="text-sm text-blue-800 grid grid-cols-2 gap-4">
              <div>
                <p><span className="font-medium">Ad Soyad:</span> {student.name} {student.surname}</p>
                <p><span className="font-medium">Sınıf:</span> {student.className}</p>
              </div>
              <div>
                <p><span className="font-medium">No:</span> {student.number || 'Belirtilmemiş'}</p>
                <p><span className="font-medium">Durum:</span> {stats?.currentCompany ? `${stats.currentCompany}'de` : 'Atanmamış'}</p>
              </div>
            </div>
          </div>

          {/* Statistics */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
                <div className="text-2xl font-bold text-green-700">{stats.totalInternships}</div>
                <div className="text-xs text-green-600">Toplam Staj</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-200">
                <div className="text-2xl font-bold text-blue-700">{stats.activeInternships}</div>
                <div className="text-xs text-blue-600">Aktif Staj</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-200">
                <div className="text-2xl font-bold text-purple-700">{stats.completedInternships}</div>
                <div className="text-xs text-purple-600">Tamamlanan</div>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center border border-red-200">
                <div className="text-2xl font-bold text-red-700">{stats.terminatedInternships}</div>
                <div className="text-xs text-red-600">Fesih Edilen</div>
              </div>
            </div>
          )}

          {/* Companies */}
          {stats && stats.companies.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                <Building2 className="h-4 w-4 mr-1" />
                Çalışılan Şirketler ({stats.companies.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {stats.companies.map((company, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-800"
                  >
                    {company}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Zaman Çizelgesi ({timeline.length} kayıt)
            </h3>
            
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-500">Geçmiş yükleniyor...</p>
              </div>
            ) : timeline.length > 0 ? (
              <div className="flow-root">
                <ul className="-mb-8">
                  {timeline.map((event, eventIndex) => (
                    <li key={eventIndex}>
                      <div className="relative pb-8">
                        {eventIndex !== timeline.length - 1 ? (
                          <span
                            className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                            aria-hidden="true"
                          />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div className="flex-shrink-0">
                            <div className="flex items-center justify-center h-8 w-8 rounded-full bg-white border-2 border-gray-200">
                              {getActionIcon(event.action)}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div
                              className={`cursor-pointer rounded-lg border p-3 hover:shadow-md transition-shadow ${getActionColor(event.action)}`}
                              onClick={() => handleEventClick(event)}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">
                                    {formatActionText(event.action, event.reason)}
                                  </p>
                                  {event.companyName && (
                                    <p className="text-xs mt-1">
                                      <Building2 className="h-3 w-3 inline mr-1" />
                                      {event.companyName}
                                    </p>
                                  )}
                                  {event.teacherName && (
                                    <p className="text-xs mt-1">
                                      <Users className="h-3 w-3 inline mr-1" />
                                      {event.teacherName}
                                    </p>
                                  )}
                                  
                                  {/* Staj Başlangıç Tarihi */}
                                  {event.action === 'CREATED' && event.details?.startDate && (
                                    <p className="text-xs mt-1 text-blue-600">
                                      <Calendar className="h-3 w-3 inline mr-1" />
                                      Başlangıç: {formatDate(event.details.startDate)}
                                    </p>
                                  )}
                                  
                                  {/* Fesih Tarihi */}
                                  {event.action === 'TERMINATED' && event.details?.terminationDate && (
                                    <p className="text-xs mt-1 text-red-600">
                                      <Calendar className="h-3 w-3 inline mr-1" />
                                      Fesih: {formatDate(event.details.terminationDate)}
                                    </p>
                                  )}
                                  
                                  {event.reason && !formatActionText(event.action, event.reason).includes(event.reason) && (
                                    <p className="text-xs mt-1 italic">
                                      {event.reason}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right text-xs">
                                  <p>{formatDate(event.date)}</p>
                                  {event.performedBy && (
                                    <p className="text-gray-500 mt-1">
                                      {event.performedBy}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p>Henüz kayıt bulunamadı</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Kapat
            </Button>
          </div>
        </div>
      </Modal>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title="Kayıt Detayları"
        >
          <div className="space-y-4">
            <div className={`rounded-lg border p-4 ${getActionColor(selectedEvent.action)}`}>
              <h3 className="font-medium">{formatActionText(selectedEvent.action)}</h3>
              <p className="text-sm mt-1">{formatDate(selectedEvent.date)}</p>
            </div>

            {selectedEvent.companyName && (
              <div>
                <label className="text-sm font-medium text-gray-700">Şirket:</label>
                <p className="text-sm text-gray-900">{selectedEvent.companyName}</p>
              </div>
            )}

            {selectedEvent.teacherName && (
              <div>
                <label className="text-sm font-medium text-gray-700">Koordinatör:</label>
                <p className="text-sm text-gray-900">{selectedEvent.teacherName}</p>
              </div>
            )}

            {selectedEvent.performedBy && (
              <div>
                <label className="text-sm font-medium text-gray-700">İşlemi Yapan:</label>
                <p className="text-sm text-gray-900">{selectedEvent.performedBy}</p>
              </div>
            )}

            {selectedEvent.reason && (
              <div>
                <label className="text-sm font-medium text-gray-700">Neden:</label>
                <p className="text-sm text-gray-900">{selectedEvent.reason}</p>
              </div>
            )}

            {selectedEvent.notes && (
              <div>
                <label className="text-sm font-medium text-gray-700">Notlar:</label>
                <p className="text-sm text-gray-900">{selectedEvent.notes}</p>
              </div>
            )}

            {selectedEvent.previousData && (
              <div>
                <label className="text-sm font-medium text-gray-700">Önceki Durum:</label>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(selectedEvent.previousData, null, 2)}
                </pre>
              </div>
            )}

            {selectedEvent.newData && (
              <div>
                <label className="text-sm font-medium text-gray-700">Yeni Durum:</label>
                <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(selectedEvent.newData, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                Kapat
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}