import { FuelEntry } from '../types';

/**
 * A generic utility to create and download a CSV file from an array of objects.
 * @param data An array of objects to be converted into CSV rows.
 * @param filename The desired name for the downloaded file (e.g., "report.csv").
 * @param headers An optional array of strings to use as CSV headers. If not provided, the keys of the first object in the data array will be used.
 */
const downloadCsv = (data: any[], filename: string, headers?: string[]) => {
    if (!data || data.length === 0) {
        console.warn("CSV download cancelled: No data provided.");
        return;
    }

    const columnHeaders = headers || Object.keys(data[0]);

    // Convert data to CSV format
    const csvRows = [
        columnHeaders.join(','),
        ...data.map(row =>
            columnHeaders.map(header => {
                let value = row[header];
                if (value === null || value === undefined) {
                    value = '';
                } else if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    value = `"${value.replace(/"/g, '""')}"`; // Escape quotes
                }
                return value;
            }).join(',')
        )
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Generates and downloads a summarized IFTA report in CSV format.
 * @param reportData The processed data for the IFTA report, including rows and overall MPG.
 * @param quarter The fiscal quarter of the report.
 * @param year The fiscal year of the report.
 */
export const exportIftaReportToCsv = (reportData: { rows: any[], mpg: number }, quarter: number, year: number) => {
    const filename = `IFTA_Report_Q${quarter}_${year}.csv`;
    const headers = ["Jurisdiction", "Total Miles Driven", "Total Fuel Purchased (Gallons)", "Total Fuel Cost ($)"];

    // Create a new array with the desired data structure for the CSV
    const csvData = reportData.rows.map(row => ({
        "Jurisdiction": row.jurisdiction,
        "Total Miles Driven": row.totalMiles.toFixed(2),
        "Total Fuel Purchased (Gallons)": row.totalFuel.toFixed(2),
        "Total Fuel Cost ($)": row.totalCost.toFixed(2)
    }));

    // Add summary rows at the top (optional, but can be nice)
    const summary = [
        { "Jurisdiction": "IFTA Report Summary", "Total Miles Driven": "", "Total Fuel Purchased (Gallons)": "", "Total Fuel Cost ($)": "" },
        { "Jurisdiction": `Quarter`, "Total Miles Driven": `Q${quarter}`, "Total Fuel Purchased (Gallons)": "", "Total Fuel Cost ($)": "" },
        { "Jurisdiction": `Year`, "Total Miles Driven": `${year}`, "Total Fuel Purchased (Gallons)": "", "Total Fuel Cost ($)": "" },
        { "Jurisdiction": `Overall Fleet MPG`, "Total Miles Driven": reportData.mpg.toFixed(2), "Total Fuel Purchased (Gallons)": "", "Total Fuel Cost ($)": "" },
        { "Jurisdiction": "", "Total Miles Driven": "", "Total Fuel Purchased (Gallons)": "", "Total Fuel Cost ($)": "" } // Spacer
    ];

    downloadCsv([...summary, ...csvData], filename, headers);
};

/**
 * Generates and downloads a detailed transaction list in CSV format.
 * @param entries An array of FuelEntry objects.
 * @param startDate The start date of the reporting period.
 * @param endDate The end date of the reporting period.
 */
export const exportTransactionsToCsv = (entries: FuelEntry[], startDate: Date, endDate: Date) => {
    const filename = `Fuel_Transactions_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`;
    const headers = [
        "Date", "Truck Number", "Odometer", "City", "State",
        "Fuel Type", "Amount (Gallons)", "Cost ($)", "Receipt"
    ];

    const csvData = entries.map(entry => ({
        "Date": new Date(entry.dateTime).toLocaleDateString(),
        "Truck Number": entry.truckNumber,
        "Odometer": entry.odometer,
        "City": entry.city,
        "State": entry.state,
        "Fuel Type": entry.fuelType === 'custom' ? entry.customFuelType : entry.fuelType,
        "Amount (Gallons)": entry.amount,
        "Cost ($)": entry.cost.toFixed(2),
        "Receipt": entry.receiptUrl || "No"
    }));

    downloadCsv(csvData, filename, headers);
};
