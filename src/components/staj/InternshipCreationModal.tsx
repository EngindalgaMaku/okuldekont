"use client";

import { useState, useEffect } from "react";
import {
  Search,
  X,
  Calendar,
  User,
  Building2,
  GraduationCap,
} from "lucide-react";
import Modal from "@/components/ui/Modal";

interface Student {
  id: string;
  name: string;
  surname: string;
  number: string;
  className: string;
  alan?: {
    id: string;
    name: string;
  } | null;
  internshipStatus?: {
    hasActiveInternship: boolean;
    status: string;
    companyName?: string;
    startDate?: string;
    endDate?: string;
    terminationDate?: string;
  } | null;
}

interface Company {
  id: string;
  name: string;
  contact: string;
}

interface Teacher {
  id: string;
  name: string;
  surname: string;
  alanId?: string;
  alan?: {
    id: string;
    name: string;
  } | null;
}

interface InternshipCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: InternshipFormData) => Promise<void>;
  availableStudents: Student[];
  availableCompanies: Company[];
  availableTeachers: Teacher[];
  loading?: boolean;
  onFetchAllStudents?: () => Promise<Student[]>;
}

export interface InternshipFormData {
  studentId: string;
  companyId: string;
  teacherId: string;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "TERMINATED" | "COMPLETED";
  terminationDate?: string;
  terminationReason?: string;
  terminationNotes?: string;
}

const InternshipCreationModal = ({
  isOpen,
  onClose,
  onSubmit,
  availableStudents,
  availableCompanies,
  availableTeachers,
  loading = false,
  onFetchAllStudents,
}: InternshipCreationModalProps) => {
  const [formData, setFormData] = useState<InternshipFormData>({
    studentId: "",
    companyId: "",
    teacherId: "",
    startDate: "",
    endDate: "",
    status: "ACTIVE",
  });

  // Search states
  const [studentSearch, setStudentSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");

  // Dropdown visibility states
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // All students state (loaded when modal opens)
  const [allStudentsLoaded, setAllStudentsLoaded] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Get today's date for form defaults and validation
  const today = new Date().toISOString().split("T")[0];

  // Reset form and fetch all students when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        studentId: "",
        companyId: "",
        teacherId: "",
        startDate: "",
        endDate: "",
        status: "ACTIVE",
      });
      setStudentSearch("");
      setCompanySearch("");
      setTeacherSearch("");
      setErrors({});

      // Fetch all students when modal opens
      if (onFetchAllStudents && allStudentsLoaded.length === 0) {
        setStudentsLoading(true);
        onFetchAllStudents()
          .then((students) => {
            setAllStudentsLoaded(students);
          })
          .catch((error) => {
            console.error("Error fetching all students:", error);
            setAllStudentsLoaded([]);
          })
          .finally(() => {
            setStudentsLoading(false);
          });
      }
    } else {
      // Don't reset allStudentsLoaded when closing to maintain the list for next time
    }
  }, [isOpen, onFetchAllStudents, allStudentsLoaded.length]);

  // Filter functions - use all students loaded from API
  const studentsToUse =
    allStudentsLoaded.length > 0 ? allStudentsLoaded : availableStudents;
  const filteredStudents = studentsToUse.filter((student) =>
    `${student.name} ${student.surname} ${student.number} ${student.className}`
      .toLowerCase()
      .includes(studentSearch.toLowerCase())
  );

  const filteredCompanies = availableCompanies.filter((company) =>
    company.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const filteredTeachers = availableTeachers.filter((teacher) =>
    `${teacher.name} ${teacher.surname}`
      .toLowerCase()
      .includes(teacherSearch.toLowerCase())
  );

  // Get selected items
  const selectedStudent = studentsToUse.find(
    (s) => s.id === formData.studentId
  );
  const selectedCompany = availableCompanies.find(
    (c) => c.id === formData.companyId
  );
  const selectedTeacher = availableTeachers.find(
    (t) => t.id === formData.teacherId
  );

  // Filter teachers by student's field if student is selected
  const compatibleTeachers = selectedStudent?.alan
    ? filteredTeachers.filter(
        (teacher) => teacher.alan?.id === selectedStudent.alan?.id
      )
    : filteredTeachers;

  // Validation function
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.studentId) {
      newErrors.studentId = "Öğrenci seçimi zorunludur";
    }

    if (!formData.companyId) {
      newErrors.companyId = "İşletme seçimi zorunludur";
    }

    if (!formData.teacherId) {
      newErrors.teacherId = "Koordinatör öğretmen seçimi zorunludur";
    }

    if (!formData.startDate) {
      newErrors.startDate = "Başlangıç tarihi zorunludur";
    }

    if (!formData.endDate) {
      newErrors.endDate = "Bitiş tarihi zorunludur";
    }

    if (formData.startDate && formData.endDate) {
      if (new Date(formData.startDate) >= new Date(formData.endDate)) {
        newErrors.endDate = "Bitiş tarihi başlangıç tarihinden sonra olmalıdır";
      }
    }

    // Terminated status specific validations
    if (formData.status === "TERMINATED") {
      if (!formData.terminationDate) {
        newErrors.terminationDate = "Fesih tarihi zorunludur";
      }
      if (!formData.terminationReason) {
        newErrors.terminationReason = "Fesih nedeni zorunludur";
      }
      if (formData.terminationDate && formData.startDate) {
        if (new Date(formData.terminationDate) < new Date(formData.startDate)) {
          newErrors.terminationDate =
            "Fesih tarihi başlangıç tarihinden sonra olmalıdır";
        }
      }
    }

    // Check if selected teacher's field matches student's field
    if (selectedStudent?.alan && selectedTeacher?.alan) {
      if (selectedStudent.alan.id !== selectedTeacher.alan.id) {
        newErrors.teacherId =
          "Seçilen koordinatör öğrencinin alanı ile uyumlu değil";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Staj oluşturma hatası:", error);
    }
  };

  // Handle status change
  const handleStatusChange = (
    status: "ACTIVE" | "TERMINATED" | "COMPLETED"
  ) => {
    const updatedFormData = { ...formData, status };

    // Clear termination fields if not terminated
    if (status !== "TERMINATED") {
      updatedFormData.terminationDate = "";
      updatedFormData.terminationReason = "";
      updatedFormData.terminationNotes = "";
    }

    setFormData(updatedFormData);
    setErrors({}); // Clear errors when status changes
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Staj Oluştur"
      size="xl"
    >
      <div className="space-y-6">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <GraduationCap className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div>
              <h4 className="text-sm font-medium text-blue-800">
                Staj Oluşturma
              </h4>
              <p className="text-xs text-blue-700 mt-1">
                Geçmişe dönük stajlar da dahil olmak üzere yeni staj kayıtları
                oluşturabilirsiniz. Feshedilmiş stajlar için durumu "Feshedildi"
                olarak seçin.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Student Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Öğrenci <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
                  <User className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Öğrenci ara..."
                    value={
                      selectedStudent
                        ? `${selectedStudent.name} ${selectedStudent.surname} (${selectedStudent.number})`
                        : studentSearch
                    }
                    onChange={(e) => {
                      if (!selectedStudent) {
                        setStudentSearch(e.target.value);
                        setShowStudentDropdown(true);
                      }
                    }}
                    onFocus={() => setShowStudentDropdown(true)}
                    className="flex-1 outline-none bg-transparent"
                  />
                  {selectedStudent && (
                    <button
                      onClick={() => {
                        setFormData({ ...formData, studentId: "" });
                        setStudentSearch("");
                        setShowStudentDropdown(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showStudentDropdown && !selectedStudent && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
                    {studentsLoading ? (
                      <div className="p-4 text-center text-gray-500">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400 mx-auto"></div>
                        <div className="mt-2">Öğrenciler yükleniyor...</div>
                      </div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        Arama kriterinize uygun öğrenci bulunamadı
                      </div>
                    ) : (
                      filteredStudents.map((student) => {
                        const hasActiveInternship =
                          student.internshipStatus?.hasActiveInternship;
                        const status = student.internshipStatus?.status;
                        return (
                          <button
                            key={student.id}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                studentId: student.id,
                              });
                              setShowStudentDropdown(false);
                              setStudentSearch("");
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <div className="font-medium text-gray-900">
                                  {student.name} {student.surname}
                                </div>
                                {hasActiveInternship && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                    Aktif Staj
                                  </span>
                                )}
                                {status === "TERMINATED" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    Feshedilmiş
                                  </span>
                                )}
                                {status === "COMPLETED" && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Tamamlanmış
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                No: {student.number} • {student.className} •{" "}
                                {student.alan?.name || "Alan yok"}
                              </div>
                              {student.internshipStatus?.companyName && (
                                <div className="text-xs text-gray-400 mt-1">
                                  Son işletme:{" "}
                                  {student.internshipStatus.companyName}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              {errors.studentId && (
                <p className="mt-1 text-xs text-red-600">{errors.studentId}</p>
              )}
            </div>

            {/* Company Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İşletme <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
                  <Building2 className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="İşletme ara..."
                    value={
                      selectedCompany ? selectedCompany.name : companySearch
                    }
                    onChange={(e) => {
                      if (!selectedCompany) {
                        setCompanySearch(e.target.value);
                        setShowCompanyDropdown(true);
                      }
                    }}
                    onFocus={() => setShowCompanyDropdown(true)}
                    className="flex-1 outline-none bg-transparent"
                  />
                  {selectedCompany && (
                    <button
                      onClick={() => {
                        setFormData({ ...formData, companyId: "" });
                        setCompanySearch("");
                        setShowCompanyDropdown(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showCompanyDropdown && !selectedCompany && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
                    {filteredCompanies.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        İşletme bulunamadı
                      </div>
                    ) : (
                      filteredCompanies.map((company) => (
                        <button
                          key={company.id}
                          onClick={() => {
                            setFormData({ ...formData, companyId: company.id });
                            setShowCompanyDropdown(false);
                            setCompanySearch("");
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {company.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {company.contact}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {errors.companyId && (
                <p className="mt-1 text-xs text-red-600">{errors.companyId}</p>
              )}
            </div>

            {/* Teacher Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Koordinatör Öğretmen <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500 bg-white">
                  <GraduationCap className="h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Koordinatör ara..."
                    value={
                      selectedTeacher
                        ? `${selectedTeacher.name} ${selectedTeacher.surname}`
                        : teacherSearch
                    }
                    onChange={(e) => {
                      if (!selectedTeacher) {
                        setTeacherSearch(e.target.value);
                        setShowTeacherDropdown(true);
                      }
                    }}
                    onFocus={() => setShowTeacherDropdown(true)}
                    className="flex-1 outline-none bg-transparent"
                  />
                  {selectedTeacher && (
                    <button
                      onClick={() => {
                        setFormData({ ...formData, teacherId: "" });
                        setTeacherSearch("");
                        setShowTeacherDropdown(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {showTeacherDropdown && !selectedTeacher && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-auto">
                    {compatibleTeachers.length === 0 ? (
                      <div className="p-4 text-center text-gray-500">
                        {selectedStudent?.alan
                          ? `${selectedStudent.alan.name} alanında koordinatör bulunamadı`
                          : "Koordinatör bulunamadı"}
                      </div>
                    ) : (
                      compatibleTeachers.map((teacher) => (
                        <button
                          key={teacher.id}
                          onClick={() => {
                            setFormData({ ...formData, teacherId: teacher.id });
                            setShowTeacherDropdown(false);
                            setTeacherSearch("");
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div>
                            <div className="font-medium text-gray-900">
                              {teacher.name} {teacher.surname}
                            </div>
                            <div className="text-sm text-gray-500">
                              {teacher.alan?.name || "Alan bilgisi yok"}
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
              {errors.teacherId && (
                <p className="mt-1 text-xs text-red-600">{errors.teacherId}</p>
              )}
              {selectedStudent?.alan && (
                <p className="mt-1 text-xs text-gray-500">
                  Öğrencinin alanı: {selectedStudent.alan.name}
                </p>
              )}
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Status Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Staj Durumu <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange("ACTIVE")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    formData.status === "ACTIVE"
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">🚀 Aktif Staj</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Devam eden staj
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("TERMINATED")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    formData.status === "TERMINATED"
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">❌ Feshedilmiş Staj</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Geçmişte feshedilen staj kaydı
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("COMPLETED")}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    formData.status === "COMPLETED"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="font-medium">✅ Tamamlanmış Staj</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Başarıyla tamamlanan staj
                  </div>
                </button>
              </div>
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Başlangıç Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.startDate && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.startDate}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bitiş Tarihi <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                {errors.endDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.endDate}</p>
                )}
              </div>
            </div>

            {/* Termination Fields - Only show if status is TERMINATED */}
            {formData.status === "TERMINATED" && (
              <div className="space-y-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="font-medium text-red-800">Fesih Bilgileri</h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fesih Tarihi <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.terminationDate || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terminationDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {errors.terminationDate && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.terminationDate}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fesih Nedeni <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.terminationReason || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terminationReason: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="">Neden Seçin</option>
                    <option value="Öğrenci İsteği">Öğrenci İsteği</option>
                    <option value="İşletme İsteği">İşletme İsteği</option>
                    <option value="Disiplin Problemi">Disiplin Problemi</option>
                    <option value="Devamsızlık">Devamsızlık</option>
                    <option value="İş Güvenliği">İş Güvenliği</option>
                    <option value="Sağlık Problemi">Sağlık Problemi</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                  {errors.terminationReason && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.terminationReason}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fesih Notları
                  </label>
                  <textarea
                    value={formData.terminationNotes || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        terminationNotes: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Fesih ile ilgili ek bilgiler..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Oluşturuluyor...</span>
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4" />
                <span>Stajı Oluştur</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default InternshipCreationModal;
