"use client";

import { useState } from "react";
import {
  CompanyType,
  getCompanyTypeLabel,
  getCompanyTypeBadgeClass,
} from "@/lib/company-utils";

interface Company {
  id: string;
  name: string;
  companyType: CompanyType;
}

interface CompanyTypeManagerProps {
  companies: Company[];
  onUpdate: (companyId: string, companyType: CompanyType) => Promise<void>;
}

export default function CompanyTypeManager({
  companies,
  onUpdate,
}: CompanyTypeManagerProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | CompanyType>("ALL");

  const handleTypeChange = async (companyId: string, newType: CompanyType) => {
    setLoading(companyId);
    try {
      await onUpdate(companyId, newType);
    } catch (error) {
      console.error("Error updating company type:", error);
      alert("Şirket türü güncellenirken hata oluştu");
    } finally {
      setLoading(null);
    }
  };

  const filteredCompanies = companies.filter(
    (company) => filter === "ALL" || company.companyType === filter
  );

  const governmentCount = companies.filter(
    (c) => c.companyType === "GOVERNMENT"
  ).length;
  const privateCount = companies.filter(
    (c) => c.companyType === "PRIVATE"
  ).length;

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          İşletme Türü Yönetimi
        </h2>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">
              {companies.length}
            </div>
            <div className="text-sm text-gray-600">Toplam İşletme</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-900">
              {governmentCount}
            </div>
            <div className="text-sm text-blue-600">Kamu Kurumu</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-900">
              {privateCount}
            </div>
            <div className="text-sm text-green-600">Özel Sektör</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "ALL"
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
            }`}
          >
            Tümü ({companies.length})
          </button>
          <button
            onClick={() => setFilter("GOVERNMENT")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "GOVERNMENT"
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
            }`}
          >
            Kamu Kurumu ({governmentCount})
          </button>
          <button
            onClick={() => setFilter("PRIVATE")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "PRIVATE"
                ? "bg-blue-100 text-blue-800 border border-blue-200"
                : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
            }`}
          >
            Özel Sektör ({privateCount})
          </button>
        </div>

        {/* Company List */}
        <div className="space-y-3">
          {filteredCompanies.map((company) => (
            <div
              key={company.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center space-x-4">
                <div>
                  <h3 className="font-medium text-gray-900">{company.name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getCompanyTypeBadgeClass(
                        company.companyType
                      )}`}
                    >
                      {getCompanyTypeLabel(company.companyType)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <select
                  value={company.companyType}
                  onChange={(e) =>
                    handleTypeChange(company.id, e.target.value as CompanyType)
                  }
                  disabled={loading === company.id}
                  className="block w-40 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="PRIVATE">Özel Sektör</option>
                  <option value="GOVERNMENT">Kamu Kurumu</option>
                </select>
                {loading === company.id && (
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Bu kategoride işletme bulunamadı.
          </div>
        )}
      </div>

      {/* Information Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">Önemli Bilgi</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                <strong>Kamu Kurumu</strong> olarak işaretlenen işletmelerde
                staj yapan öğrenciler için dekont (bordro) yüklenmesi gerekmez.
                <br />
                <strong>Özel Sektör</strong> işletmelerde ise dekont yüklenmesi
                zorunludur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
