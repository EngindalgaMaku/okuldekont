"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";

interface FileWithProgress {
  id: string;
  file: File;
  progress: number;
  status: "waiting" | "uploading" | "success" | "error";
  error?: string;
}

interface Student {
  id: string;
  name: string;
  surname: string;
  className: string;
  number?: string;
  alan?: { name: string };
}

interface Teacher {
  id: string;
  name: string;
  surname: string;
}

interface Staj {
  id: string;
  studentId: string;
  teacherId: string;
  student: Student;
  teacher: Teacher;
  company: {
    name: string;
  };
}

interface MultiFileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export default function MultiFileUploadModal({
  isOpen,
  onClose,
  onUploadComplete,
}: MultiFileUploadModalProps) {
  const [files, setFiles] = useState<FileWithProgress[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [stajlar, setStajlar] = useState<Staj[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedStaj, setSelectedStaj] = useState<string>("");
  const [selectedTeacher, setSelectedTeacher] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [description, setDescription] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MONTHS = [
    "Ocak",
    "Şubat",
    "Mart",
    "Nisan",
    "Mayıs",
    "Haziran",
    "Temmuz",
    "Ağustos",
    "Eylül",
    "Ekim",
    "Kasım",
    "Aralık",
  ];

  // Fetch data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStajlar();
      fetchTeachers();
    }
  }, [isOpen]);

  const fetchStajlar = async () => {
    try {
      const response = await fetch("/api/admin/internships?status=ACTIVE");
      if (response.ok) {
        const data = await response.json();
        setStajlar(data.stajlar || []);
      }
    } catch (error) {
      console.error("Error fetching stajlar:", error);
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await fetch("/api/admin/teachers");
      if (response.ok) {
        const data = await response.json();
        setTeachers(data.teachers || []);
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const generateFileId = () => Math.random().toString(36).substr(2, 9);

  const validateFile = (file: File): string | null => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "application/pdf",
    ];

    if (file.size > maxSize) {
      return "Dosya boyutu 10MB'dan büyük olamaz";
    }

    if (!allowedTypes.includes(file.type)) {
      return "Sadece JPEG, PNG ve PDF dosyaları yüklenebilir";
    }

    return null;
  };

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles: FileWithProgress[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      const fileWithProgress: FileWithProgress = {
        id: generateFileId(),
        file,
        progress: 0,
        status: error ? "error" : "waiting",
        error: error || undefined,
      };
      validFiles.push(fileWithProgress);
    });

    setFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);

      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
        e.target.value = ""; // Reset input
      }
    },
    [addFiles]
  );

  const uploadFile = async (
    fileWithProgress: FileWithProgress,
    index: number
  ): Promise<boolean> => {
    try {
      // Update file status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithProgress.id
            ? { ...f, status: "uploading", progress: 0 }
            : f
        )
      );

      const formData = new FormData();
      formData.append("dosya", fileWithProgress.file);
      formData.append("staj_id", selectedStaj);
      formData.append("ogretmen_id", selectedTeacher);
      formData.append("miktar", amount);
      formData.append("ay", month.toString());
      formData.append("yil", year.toString());
      if (description) {
        formData.append("aciklama", description);
      }

      const xhr = new XMLHttpRequest();

      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithProgress.id ? { ...f, progress } : f
              )
            );
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithProgress.id
                  ? { ...f, status: "success", progress: 100 }
                  : f
              )
            );
            resolve(true);
          } else {
            let errorMessage = "Upload failed";
            try {
              const response = JSON.parse(xhr.responseText);
              errorMessage = response.error || errorMessage;
            } catch (e) {
              errorMessage = xhr.responseText || errorMessage;
            }
            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileWithProgress.id
                  ? { ...f, status: "error", error: errorMessage }
                  : f
              )
            );
            reject(new Error(errorMessage));
          }
        });

        xhr.addEventListener("error", () => {
          const errorMessage = "Network error occurred";
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileWithProgress.id
                ? { ...f, status: "error", error: errorMessage }
                : f
            )
          );
          reject(new Error(errorMessage));
        });

        xhr.open("POST", "/api/admin/dekontlar");
        xhr.send(formData);
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileWithProgress.id
            ? { ...f, status: "error", error: errorMessage }
            : f
        )
      );
      return false;
    }
  };

  const handleUpload = async () => {
    const validFiles = files.filter((f) => f.status === "waiting");

    if (validFiles.length === 0) return;

    // Validate form
    if (!selectedStaj) {
      alert("Lütfen bir staj seçin");
      return;
    }

    if (!selectedTeacher) {
      alert("Lütfen bir öğretmen seçin");
      return;
    }

    setIsUploading(true);

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < validFiles.length; i++) {
        await uploadFile(validFiles[i], i);
        // Small delay between uploads
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Check if all files were uploaded successfully
      const successFiles = files.filter((f) => f.status === "success");
      if (successFiles.length > 0) {
        onUploadComplete();
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      clearFiles();
      setSelectedStaj("");
      setSelectedTeacher("");
      setAmount("");
      setMonth(new Date().getMonth() + 1);
      setYear(new Date().getFullYear());
      setDescription("");
      onClose();
    }
  };

  const getStatusIcon = (status: FileWithProgress["status"]) => {
    switch (status) {
      case "waiting":
        return <FileText className="h-5 w-5 text-gray-400" />;
      case "uploading":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: FileWithProgress["status"]) => {
    switch (status) {
      case "waiting":
        return "border-gray-200 bg-gray-50";
      case "uploading":
        return "border-blue-200 bg-blue-50";
      case "success":
        return "border-green-200 bg-green-50";
      case "error":
        return "border-red-200 bg-red-50";
      default:
        return "border-gray-200 bg-gray-50";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (!isOpen) return null;

  const waitingFiles = files.filter((f) => f.status === "waiting").length;
  const successFiles = files.filter((f) => f.status === "success").length;
  const errorFiles = files.filter((f) => f.status === "error").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Çoklu Dosya Yükleme
          </h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Staj Selection */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staj Seçin *
              </label>
              <select
                value={selectedStaj}
                onChange={(e) => setSelectedStaj(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Staj seçin...</option>
                {stajlar.map((staj) => (
                  <option key={staj.id} value={staj.id}>
                    {staj.student.name} {staj.student.surname} -{" "}
                    {staj.company.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Teacher Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Öğretmen Seçin *
              </label>
              <select
                value={selectedTeacher}
                onChange={(e) => setSelectedTeacher(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Öğretmen seçin...</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} {teacher.surname}
                  </option>
                ))}
              </select>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Miktar (₺)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Miktar girin (opsiyonel)"
              />
            </div>

            {/* Month */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ay
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {MONTHS.map((monthName, index) => (
                  <option key={index} value={index + 1}>
                    {monthName}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Yıl
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                min="2020"
                max="2030"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Açıklama girin (opsiyonel)"
            />
          </div>

          {/* Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900">
                Dosyaları buraya sürükleyin
              </p>
              <p className="mt-1 text-sm text-gray-500">
                veya{" "}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  dosya seçin
                </button>
              </p>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              PNG, JPG, PDF dosyaları desteklenir (Maksimum 10MB)
            </p>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Dosyalar ({files.length})
                </h3>
                <button
                  onClick={clearFiles}
                  disabled={isUploading}
                  className="text-sm text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tümünü Temizle
                </button>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {files.map((fileWithProgress) => (
                  <div
                    key={fileWithProgress.id}
                    className={`p-4 rounded-lg border ${getStatusColor(
                      fileWithProgress.status
                    )}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getStatusIcon(fileWithProgress.status)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileWithProgress.file.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(fileWithProgress.file.size)}
                          </p>
                          {fileWithProgress.error && (
                            <p className="text-sm text-red-600 mt-1">
                              {fileWithProgress.error}
                            </p>
                          )}
                        </div>
                      </div>

                      {fileWithProgress.status !== "uploading" && (
                        <button
                          onClick={() => removeFile(fileWithProgress.id)}
                          className="text-red-400 hover:text-red-600 ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {fileWithProgress.status === "uploading" && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fileWithProgress.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {fileWithProgress.progress}% tamamlandı
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="font-medium text-gray-900">
                      {waitingFiles}
                    </div>
                    <div className="text-gray-500">Beklemede</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-green-600">
                      {successFiles}
                    </div>
                    <div className="text-gray-500">Başarılı</div>
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-red-600">{errorFiles}</div>
                    <div className="text-gray-500">Hatalı</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {successFiles > 0 ? "Kapat" : "İptal"}
          </button>

          {waitingFiles > 0 && (
            <button
              onClick={handleUpload}
              disabled={
                isUploading ||
                waitingFiles === 0 ||
                !selectedStaj ||
                !selectedTeacher
              }
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Yükleniyor...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Yükle ({waitingFiles})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
