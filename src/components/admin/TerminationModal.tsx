'use client';

import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Upload } from 'lucide-react';

interface TerminationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (data: TerminationData) => Promise<void>;
  internship: {
    id: string;
    student: {
      name: string;
      surname: string;
    };
    company: {
      name: string;
    };
    teacher: {
      name: string;
      surname: string;
    };
  } | null;
}

interface TerminationData {
  reason: string;
  notes?: string;
  documentId?: string;
  terminatedBy: string;
  terminationDate?: string;
}

export default function TerminationModal({
  isOpen,
  onClose,
  onConfirm,
  internship
}: TerminationModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reason: '',
    notes: '',
    documentId: '',
    terminationDate: new Date().toISOString().split('T')[0] // Bugünün tarihi default
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      setError('Fesih nedeni zorunludur');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Mock user ID for now - should come from auth context
      const terminatedBy = 'current-user-id';
      
      await onConfirm({
        ...formData,
        terminatedBy
      });
      
      setFormData({ reason: '', notes: '', documentId: '', terminationDate: new Date().toISOString().split('T')[0] });
      onClose();
    } catch (error: any) {
      setError(error.message || 'Fesih işleminde hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ reason: '', notes: '', documentId: '', terminationDate: new Date().toISOString().split('T')[0] });
      setError(null);
      onClose();
    }
  };

  if (!internship) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Staj Fesih İşlemi"
      titleIcon={AlertTriangle}
    >
      <div className="space-y-4">
        {/* Student Info */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm space-y-1">
            <p><strong>Öğrenci:</strong> {internship.student.name} {internship.student.surname}</p>
            <p><strong>Şirket:</strong> {internship.company.name}</p>
            <p><strong>Koordinatör:</strong> {internship.teacher.name} {internship.teacher.surname}</p>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-orange-800">Dikkat</h3>
              <div className="mt-1 text-sm text-orange-700">
                Bu işlem geri alınamaz. Staj fesih edildikten sonra öğrenci bu şirketten ayrılmış sayılacak ve yeni bir staja atanabilecektir.
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 mr-3 flex-shrink-0" />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                Fesih Nedeni *
              </label>
              <input
                type="text"
                id="reason"
                value={formData.reason}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Örn: Öğrenci isteği, disiplin problemi, şirket talebi..."
                disabled={isLoading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label htmlFor="terminationDate" className="block text-sm font-medium text-gray-700 mb-2">
                Fesih Tarihi *
              </label>
              <input
                type="date"
                id="terminationDate"
                value={formData.terminationDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  setFormData(prev => ({ ...prev, terminationDate: e.target.value }))}
                disabled={isLoading}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-50"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Ek Notlar
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
                setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Fesih ile ilgili ek bilgiler veya açıklamalar..."
              disabled={isLoading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-50"
            />
          </div>

          <div>
            <label htmlFor="document" className="block text-sm font-medium text-gray-700 mb-2">
              Fesih Belgesi (Opsiyonel)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="document"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                disabled={isLoading}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:bg-gray-50"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  // TODO: Implement file upload
                  console.log('File selected:', e.target.files?.[0]);
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Yükle
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              PDF, Word belgesi veya görsel dosyalar yükleyebilirsiniz
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={isLoading || !formData.reason.trim()}
              loading={isLoading}
            >
              Stajı Fesih Et
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}