"use client";

import { useState, useCallback } from "react";
import * as xlsx from "xlsx";

interface ExcelRow {
  Sınıf: string;
  "Staj Günü": string;
  Bölüm: string;
  No: number;
  "Adı Soyadı": string;
  "Koordinatör Öğretmen": string;
  "Öğrencinin Çalıştığı İşletmenin Adı": string;
  "İşletmenin Adresi": string;
  Telefon: string;
}

interface StudentData {
  tcNo: string;
  name: string;
  surname: string;
  className: string;
  studentNumber: string;
  alanName: string;
  companyName: string;
  teacherName: string;
}

interface ComparisonResult {
  newRecords: StudentData[];
  updatedRecords: { old: any; new: StudentData }[];
  removedRecords: any[];
}

export default function ChangesReportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ComparisonResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const parseExcelFile = useCallback((file: File): Promise<StudentData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = xlsx.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          console.log("=== EXCEL STRUCTURE DEBUG ===");
          console.log("Worksheet name:", sheetName);
          console.log("Worksheet range:", worksheet["!ref"]);

          // Get raw data to understand structure
          const range = xlsx.utils.decode_range(worksheet["!ref"] || "A1");
          console.log("Total rows:", range.e.r + 1);
          console.log("Total columns:", range.e.c + 1);

          // Parse Excel with proper header handling for split header structure
          // Row 6 (index 5): Contains first part of headers
          // Row 7 (index 6): Contains second part of headers
          // Row 8 (index 7): Data starts here

          // Get data starting from row 8 (0-indexed = 7) WITHOUT headers
          const rawData = xlsx.utils.sheet_to_json(worksheet, {
            range: 7, // Start from row 8 (0-indexed)
            header: 1, // Use array of arrays instead of objects
            defval: "", // Default value for missing cells
          }) as any[][];

          console.log("=== RAW DATA STRUCTURE ===");
          console.log("Total raw data rows:", rawData.length);
          console.log("First raw data row:", rawData[0]);

          // Manually map columns based on the actual Excel structure we discovered
          const students = (rawData as any[][])
            .filter((row: any[]) => {
              // Filter out empty rows - check if key fields have values
              const hasClassName = row[0] && row[0].toString().trim() !== "";
              const hasStudentNumber =
                row[3] && typeof row[3] === "number" && row[3] > 0;
              const hasStudentName = row[4] && row[4].toString().trim() !== "";

              console.log("Row filter check:", {
                hasClassName,
                hasStudentNumber,
                hasStudentName,
                className: row[0],
                studentNumber: row[3],
                studentName: row[4],
              });

              return hasClassName && hasStudentNumber && hasStudentName;
            })
            .map((row: any[], index: number) => {
              // Based on debug output, the columns are:
              // 0: Sınıf (Class)
              // 1: Staj Günü (Internship Day)
              // 2: Bölüm (Department)
              // 3: No (Student Number)
              // 4: Adı Soyadı (Full Name)
              // 5: Koordinatör Öğretmen (Coordinator Teacher)
              // 6: İşletmenin Adı (Company Name) - comes from combined headers
              // 7: İşletmenin Adresi (Company Address)
              // 8: Telefonu (Phone)

              const fullName = row[4]?.toString().trim() || "";
              const nameParts = fullName.split(" ");
              const surname = nameParts.pop() || "";
              const name = nameParts.join(" ");

              // Clean up the department name (remove extra line breaks)
              const cleanAlanName =
                row[2]
                  ?.toString()
                  .replace(/\r\n/g, " ")
                  .replace(/\n/g, " ")
                  .trim() || "";

              const student = {
                tcNo: "", // Excel doesn't have TC numbers
                name: name,
                surname: surname,
                className: row[0]?.toString().trim() || "",
                studentNumber: row[3]?.toString() || "",
                alanName: cleanAlanName,
                companyName: row[6]?.toString().trim() || "",
                teacherName: row[5]?.toString().trim() || "",
              };

              if (index < 5) {
                console.log(`Student ${index + 1} mapped:`, student);
              }

              return student;
            });

          console.log("=== FINAL PARSING RESULTS ===");
          console.log("Total Excel rows processed:", rawData.length);
          console.log("Filtered valid students:", students.length);
          console.log("Sample student data:", students.slice(0, 3));
          console.log(
            "Expected ~153 students from Excel file (based on debug)"
          );

          if (students.length < 100) {
            console.warn(
              "⚠️ WARNING: Only",
              students.length,
              "students found. Expected around 153!"
            );
            console.log(
              "First 10 raw rows for debugging:",
              rawData.slice(0, 10)
            );
          } else {
            console.log(
              "✅ SUCCESS: Processing",
              students.length,
              "student records"
            );
          }

          resolve(students);
        } catch (error) {
          console.error("Excel parsing error:", error);
          reject(
            new Error(
              "Excel dosyası okunamadı. Lütfen geçerli bir .xlsx veya .xls dosyası seçtiğinizden emin olun."
            )
          );
        }
      };

      reader.onerror = () => {
        reject(new Error("Dosya okuma hatası oluştu."));
      };

      reader.readAsArrayBuffer(file);
    });
  }, []);

  const compareWithDatabase = useCallback(
    async (excelStudents: StudentData[]): Promise<ComparisonResult> => {
      const response = await fetch("/api/admin/students-comparison", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ excelStudents }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || "Veritabanı karşılaştırma hatası oluştu."
        );
      }

      return response.json();
    },
    []
  );

  const handleFileSelect = useCallback((selectedFile: File) => {
    if (!selectedFile) return;

    const fileExtension = selectedFile.name.toLowerCase().split(".").pop();
    if (!fileExtension || !["xlsx", "xls"].includes(fileExtension)) {
      setError("Lütfen geçerli bir Excel dosyası (.xlsx veya .xls) seçin.");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResults(null);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const analyzeChanges = async () => {
    if (!file) {
      setError("Lütfen önce bir Excel dosyası seçin.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Parse Excel file
      const excelStudents = await parseExcelFile(file);

      if (excelStudents.length === 0) {
        throw new Error("Excel dosyasında geçerli veri bulunamadı.");
      }

      // Compare with database
      const comparisonResults = await compareWithDatabase(excelStudents);
      setResults(comparisonResults);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">
          Excel vs. Database Değişiklik Raporu
        </h1>

        {/* File Upload Section */}
        <div className="mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              Nasıl Kullanılır?
            </h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>
                • Excel dosyanızı aşağıdaki alana sürükleyip bırakın veya "Dosya
                Seç" butonuna tıklayın
              </li>
              <li>
                • Dosya şu sütunları içermelidir: Sınıf, Staj Günü, Bölüm, No,
                Adı Soyadı, Koordinatör Öğretmen, Öğrencinin Çalıştığı
                İşletmenin Adı
              </li>
              <li>
                • "Değişiklikleri Analiz Et" butonuna tıklayarak raporu
                oluşturun
              </li>
            </ul>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragOver
                ? "border-blue-400 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-3">
                <div className="text-green-600">
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-900">{file.name}</p>
                <p className="text-sm text-gray-500">
                  Dosya boyutu: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  Dosyayı değiştir
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-gray-400">
                  <svg
                    className="mx-auto h-12 w-12"
                    stroke="currentColor"
                    fill="none"
                    viewBox="0 0 48 48"
                  >
                    <path
                      d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Excel dosyanızı buraya sürükleyin
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    veya dosya seçmek için tıklayın
                  </p>
                </div>
                <label className="cursor-pointer">
                  <span className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                    Dosya Seç
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Hata</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="mb-8">
          <button
            onClick={analyzeChanges}
            disabled={!file || loading}
            className={`w-full sm:w-auto px-6 py-3 text-lg font-medium rounded-lg transition-colors ${
              !file || loading
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            }`}
          >
            {loading ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Analiz Ediliyor...
              </div>
            ) : (
              "Değişiklikleri Analiz Et"
            )}
          </button>
        </div>

        {/* Results Display */}
        {results && (
          <div className="space-y-8">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800">
                  Yeni Kayıtlar
                </h3>
                <p className="text-3xl font-bold text-green-600">
                  {results.newRecords.length}
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800">
                  Güncellenen Kayıtlar
                </h3>
                <p className="text-3xl font-bold text-blue-600">
                  {results.updatedRecords.length}
                </p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800">
                  Silinen Kayıtlar
                </h3>
                <p className="text-3xl font-bold text-red-600">
                  {results.removedRecords.length}
                </p>
              </div>
            </div>

            {/* New Records */}
            {results.newRecords.length > 0 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-green-50 px-6 py-3 border-b">
                  <h2 className="text-xl font-semibold text-green-800">
                    Yeni Kayıtlar ({results.newRecords.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          TC
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Adı Soyadı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sınıf
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          İşletme Adı
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.newRecords.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.tcNo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.name} {student.surname}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.className}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.companyName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Updated Records */}
            {results.updatedRecords.length > 0 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-blue-50 px-6 py-3 border-b">
                  <h2 className="text-xl font-semibold text-blue-800">
                    Güncellenen Kayıtlar ({results.updatedRecords.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          TC
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Adı Soyadı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Alan
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Eski Değer
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Yeni Değer
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.updatedRecords.map((record, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.new.tcNo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.new.name} {record.new.surname}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.old.companyName !== record.new.companyName
                              ? "İşletme"
                              : "Sınıf"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.old.companyName !== record.new.companyName
                              ? record.old.companyName
                              : record.old.className}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                            {record.old.companyName !== record.new.companyName
                              ? record.new.companyName
                              : record.new.className}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Removed Records */}
            {results.removedRecords.length > 0 && (
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-red-50 px-6 py-3 border-b">
                  <h2 className="text-xl font-semibold text-red-800">
                    Silinen Kayıtlar ({results.removedRecords.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          TC
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Adı Soyadı
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sınıf
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.removedRecords.map((student, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.tcNo}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.name} {student.surname}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {student.className}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
