// Define the company type based on the Prisma schema
export type CompanyType = "PRIVATE" | "GOVERNMENT";

/**
 * Checks if a company is a government institution
 * @param companyType The company type from the database
 * @returns true if the company is a government institution
 */
export function isGovernmentInstitution(companyType: CompanyType): boolean {
  return companyType === "GOVERNMENT";
}

/**
 * Determines if dekont submission is required for a company
 * @param companyType The company type from the database
 * @returns true if dekont submission is required
 */
export function isDekontRequired(companyType: CompanyType): boolean {
  return !isGovernmentInstitution(companyType);
}

/**
 * Gets a human-readable label for company type
 * @param companyType The company type from the database
 * @returns Turkish label for the company type
 */
export function getCompanyTypeLabel(companyType: CompanyType): string {
  switch (companyType) {
    case "GOVERNMENT":
      return "Kamu Kurumu";
    case "PRIVATE":
      return "Özel Sektör";
    default:
      return "Bilinmiyor";
  }
}

/**
 * Gets the badge color class for company type display
 * @param companyType The company type from the database
 * @returns CSS class name for badge styling
 */
export function getCompanyTypeBadgeClass(companyType: CompanyType): string {
  switch (companyType) {
    case "GOVERNMENT":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "PRIVATE":
      return "bg-gray-100 text-gray-800 border-gray-200";
    default:
      return "bg-gray-100 text-gray-500 border-gray-200";
  }
}
