import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Excel Export Functions
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Data') => {
  try {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    
    // Auto-size columns
    const cols = []
    if (data.length > 0) {
      const firstRow = data[0]
      for (const key in firstRow) {
        cols.push({ wch: Math.max(key.length, 15) })
      }
    }
    worksheet['!cols'] = cols
    
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    
    const timestamp = new Date().toISOString().slice(0, 10)
    const finalFilename = `${filename}_${timestamp}.xlsx`
    
    XLSX.writeFile(workbook, finalFilename)
    return { success: true, filename: finalFilename }
  } catch (error) {
    console.error('Excel export error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// PDF Export Functions
export const exportToPDF = (
  data: any[], 
  filename: string, 
  title: string = 'Rapor',
  columns?: { header: string; dataKey: string }[]
) => {
  try {
    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(16)
    doc.text(title, 20, 20)
    
    // Date
    doc.setFontSize(10)
    doc.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 20, 30)
    
    // Auto-generate columns if not provided
    let tableColumns = columns
    if (!tableColumns && data.length > 0) {
      tableColumns = Object.keys(data[0]).map(key => ({
        header: key.charAt(0).toUpperCase() + key.slice(1),
        dataKey: key
      }))
    }
    
    if (tableColumns) {
      autoTable(doc, {
        startY: 40,
        head: [tableColumns.map(col => col.header)],
        body: data.map(row => tableColumns!.map(col => row[col.dataKey] || '')),
        styles: {
          fontSize: 8,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [99, 102, 241],
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      })
    }
    
    const timestamp = new Date().toISOString().slice(0, 10)
    const finalFilename = `${filename}_${timestamp}.pdf`
    
    doc.save(finalFilename)
    return { success: true, filename: finalFilename }
  } catch (error) {
    console.error('PDF export error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// CSV Export Function
export const exportToCSV = (data: any[], filename: string) => {
  try {
    if (data.length === 0) {
      throw new Error('No data to export')
    }
    
    const headers = Object.keys(data[0])
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header]
        // Handle values with commas or quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      }).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const timestamp = new Date().toISOString().slice(0, 10)
      const finalFilename = `${filename}_${timestamp}.csv`
      
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', finalFilename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      return { success: true, filename: finalFilename }
    }
    
    throw new Error('Browser does not support file download')
  } catch (error) {
    console.error('CSV export error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Analytics Data Formatters
export const formatAnalyticsData = {
  dekontlar: (data: any[]) => data.map(item => ({
    'Ay': item.month || item.ay,
    'Toplam Dekont': item.dekontlar || item.toplam_dekont,
    'Onaylanan': item.onaylanan,
    'Reddedilen': item.reddedilen,
    'Toplam Ücret (TL)': item.toplam_ucret ? new Intl.NumberFormat('tr-TR').format(item.toplam_ucret) : '0'
  })),
  
  alanlar: (data: any[]) => data.map(item => ({
    'Meslek Alanı': item.name || item.ad,
    'Öğrenci Sayısı': item.ogrenci_sayisi,
    'Staj Yeri Sayısı': item.staj_yeri_sayisi,
    'Yerleştirme Oranı (%)': item.yerlestirme_orani ? `${item.yerlestirme_orani}%` : 'N/A'
  })),
  
  isletmeler: (data: any[]) => data.map(item => ({
    'İşletme Türü': item.name || item.tur,
    'Sayı': item.value || item.sayi,
    'Yüzde (%)': item.yuzde ? `${item.yuzde}%` : 'N/A'
  })),
  
  durumlar: (data: any[]) => data.map(item => ({
    'Durum': item.name || item.durum,
    'Sayı': item.value || item.sayi,
    'Renk': item.color || 'N/A'
  }))
}

// Multi-sheet Excel export
export const exportMultiSheetExcel = (
  sheets: { name: string; data: any[] }[],
  filename: string
) => {
  try {
    const workbook = XLSX.utils.book_new()
    
    sheets.forEach(sheet => {
      const worksheet = XLSX.utils.json_to_sheet(sheet.data)
      
      // Auto-size columns
      const cols = []
      if (sheet.data.length > 0) {
        const firstRow = sheet.data[0]
        for (const key in firstRow) {
          cols.push({ wch: Math.max(key.length, 15) })
        }
      }
      worksheet['!cols'] = cols
      
      XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name)
    })
    
    const timestamp = new Date().toISOString().slice(0, 10)
    const finalFilename = `${filename}_${timestamp}.xlsx`
    
    XLSX.writeFile(workbook, finalFilename)
    return { success: true, filename: finalFilename }
  } catch (error) {
    console.error('Multi-sheet Excel export error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Comprehensive Analytics Export
export const exportAnalyticsReport = async (
  monthlyData: any[],
  areaData: any[],
  statusData: any[],
  companyData: any[],
  format: 'excel' | 'pdf' | 'csv' = 'excel'
) => {
  const timestamp = new Date().toISOString().slice(0, 10)
  const baseFilename = `analytics_raporu_${timestamp}`
  
  try {
    if (format === 'excel') {
      const sheets = [
        {
          name: 'Aylık Trend',
          data: formatAnalyticsData.dekontlar(monthlyData)
        },
        {
          name: 'Alan Dağılımı',
          data: formatAnalyticsData.alanlar(areaData)
        },
        {
          name: 'Durum Dağılımı',
          data: formatAnalyticsData.durumlar(statusData)
        },
        {
          name: 'İşletme Türleri',
          data: formatAnalyticsData.isletmeler(companyData)
        }
      ]
      
      return exportMultiSheetExcel(sheets, 'analytics_raporu')
    } else if (format === 'pdf') {
      return exportToPDF(
        formatAnalyticsData.dekontlar(monthlyData),
        baseFilename,
        'Analytics Raporu - Aylık Trend'
      )
    } else if (format === 'csv') {
      return exportToCSV(
        formatAnalyticsData.dekontlar(monthlyData),
        baseFilename
      )
    }
    
    return { success: false, error: 'Unsupported format' }
  } catch (error) {
    console.error('Analytics export error:', error)
    return { success: false, error: (error as Error).message }
  }
}

// Chart data to image export (requires html2canvas)
export const exportChartAsImage = async (
  chartElementId: string,
  filename: string = 'chart'
) => {
  try {
    // This would require html2canvas library
    // For now, we'll return a placeholder
    console.log(`Chart export requested for element: ${chartElementId}`)
    return { success: true, filename: `${filename}.png`, note: 'Chart export feature requires html2canvas library' }
  } catch (error) {
    console.error('Chart export error:', error)
    return { success: false, error: (error as Error).message }
  }
}