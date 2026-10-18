'use client';

import { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  Phone, 
  Mail, 
  Clock, 
  Edit3, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface StudentChangeHistoryViewProps {
  studentId: string;
  embedded?: boolean;
}

interface HistoryRecord {
  id: string;
  changeType: string;
  fieldName: string;
  previousValue: any;
  newValue: any;
  validFrom: string;
  validTo: string | null;
  reason: string | null;
  notes: string | null;
  changedBy: string;
  changedAt: string;
}

export default function StudentChangeHistoryView({ 
  studentId, 
  embedded = false 
}: StudentChangeHistoryViewProps) {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (studentId) {
      fetchStudentHistory();
    }
  }, [studentId]);

  const fetchStudentHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/students/${studentId}/history`);
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching student history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const getChangeTypeIcon = (changeType: string) => {
    switch (changeType) {
      case 'PERSONAL_INFO_UPDATE':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'CONTACT_INFO_UPDATE':
        return <Phone className="h-4 w-4 text-green-500" />;
      case 'PARENT_INFO_UPDATE':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'SCHOOL_INFO_UPDATE':
        return <FileText className="h-4 w-4 text-orange-500" />;
      default:
        return <Edit3 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeTypeColor = (changeType: string) => {
    switch (changeType) {
      case 'PERSONAL_INFO_UPDATE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'CONTACT_INFO_UPDATE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PARENT_INFO_UPDATE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'SCHOOL_INFO_UPDATE':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getChangeTypeText = (changeType: string) => {
    const typeTexts: { [key: string]: string } = {
      'PERSONAL_INFO_UPDATE': 'Kişisel Bilgi Değişikliği',
      'CONTACT_INFO_UPDATE': 'İletişim Bilgisi Değişikliği',
      'PARENT_INFO_UPDATE': 'Veli Bilgisi Değişikliği',
      'SCHOOL_INFO_UPDATE': 'Okul Bilgisi Değişikliği',
      'OTHER_UPDATE': 'Diğer Değişiklik'
    };
    return typeTexts[changeType] || changeType;
  };

  const getFieldNameText = (fieldName: string) => {
    const fieldTexts: { [key: string]: string } = {
      'name': 'Ad',
      'surname': 'Soyad',
      'tcNo': 'TC Kimlik No',
      'phone': 'Telefon',
      'email': 'E-posta',
      'gender': 'Cinsiyet',
      'birthDate': 'Doğum Tarihi',
      'parentName': 'Veli Adı',
      'parentSurname': 'Veli Soyadı',
      'parentPhone': 'Veli Telefonu',
      'className': 'Sınıf',
      'number': 'Okul Numarası'
    };
    return fieldTexts[fieldName] || fieldName;
  };

  const formatValue = (value: any) => {
    if (value === null || value === undefined) return 'Boş';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  };

  const formatDate = (dateString: string, includeTime: boolean = true) => {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    
    return new Date(dateString).toLocaleDateString('tr-TR', options);
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
        <h3 className="text-sm font-medium text-amber-900 mb-2 flex items-center">
          <Edit3 className="h-4 w-4 mr-2" />
          İşlem Geçmişi
        </h3>
        <p className="text-sm text-amber-800">
          Bu öğrencinin kişisel bilgilerinde yapılan tüm değişikliklerin detayları burada görüntülenir.
        </p>
      </div>

      {/* History Timeline */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Geçmiş yükleniyor...</p>
        </div>
      ) : history.length > 0 ? (
        <div className="space-y-4">
          {history.map((record, index) => (
            <div key={record.id} className="border border-gray-200 rounded-lg">
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleExpanded(record.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`p-2 rounded-lg ${getChangeTypeColor(record.changeType)}`}>
                      {getChangeTypeIcon(record.changeType)}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {getFieldNameText(record.fieldName)} Değişikliği
                      </h4>
                      <p className="text-sm text-gray-600">
                        {getChangeTypeText(record.changeType)} • {formatDate(record.changedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getChangeTypeColor(record.changeType)}`}>
                      Değiştirildi
                    </span>
                    {expandedItems.has(record.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {expandedItems.has(record.id) && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <div className="space-y-4">
                    {/* Change Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <AlertCircle className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-700">Önceki Değer</span>
                        </div>
                        <p className="text-sm text-red-800 font-mono">
                          {formatValue(record.previousValue)}
                        </p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">Yeni Değer</span>
                        </div>
                        <p className="text-sm text-green-800 font-mono">
                          {formatValue(record.newValue)}
                        </p>
                      </div>
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          <span className="font-medium">Değiştiren:</span> {record.changedBy}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          <span className="font-medium">Tarih:</span> {formatDate(record.changedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Reason and Notes */}
                    {(record.reason || record.notes) && (
                      <div className="space-y-2">
                        {record.reason && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Neden:</span>
                            <p className="text-sm text-gray-600 mt-1">{record.reason}</p>
                          </div>
                        )}
                        {record.notes && (
                          <div>
                            <span className="text-sm font-medium text-gray-700">Notlar:</span>
                            <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Edit3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <p>Henüz bilgi değişikliği kaydı bulunamadı</p>
          <p className="text-sm mt-1">
            Öğrenci bilgileri değiştirildiğinde kayıtlar burada görünecektir.
          </p>
        </div>
      )}
    </div>
  );
}