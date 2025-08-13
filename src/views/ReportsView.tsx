import React, { FC, useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { FuelEntry, Truck, Theme } from '../types';
import { FormCard } from '../components/ui/FormCard';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { InsightCard } from '../components/InsightCard';
import { exportIftaReportToCsv, exportTransactionsToCsv } from '../utils/csvHelpers';

const ReportsView: FC<{ trucks: Truck[]; showToast: (msg: string, type?: any) => void; theme: Theme; onDataChange: () => void; }> = ({ showToast, onDataChange }) => {
    const defaultEndDate = new Date();
    const defaultStartDate = new Date(defaultEndDate.getFullYear(), defaultEndDate.getMonth() - 3, defaultEndDate.getDate());

    const [startDate, setStartDate] = useState(defaultStartDate.toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(defaultEndDate.toISOString().split('T')[0]);
    const [isLoading, setIsLoading] = useState(false);
    const [insights, setInsights] = useState<any | null>(null);
    const [showDisclaimer, setShowDisclaimer] = useState(false);
    const [reportDataForCsv, setReportDataForCsv] = useState<any | null>(null);
    const [allEntries, setAllEntries] = useState<FuelEntry[]>([]);

     useEffect(() => {
        const fetchAllEntries = async () => {
            try {
                const entries = await apiService.getEntries();
                setAllEntries(entries);
            } catch (error: any) {
                showToast(error.message || "Could not load entry data for reports.", "error");
            }
        };
        fetchAllEntries();
    }, [showToast, onDataChange]);

    const inputStyle = "w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent";

    const calculateDistance = (entry1: FuelEntry, entry2: FuelEntry): number => {
        return Math.abs(entry2.odometer - entry1.odometer);
    };

    const handleConfirmAndDownload = () => {
        if (reportDataForCsv) {
            const quarter = Math.floor(new Date(startDate).getMonth() / 3) + 1;
            const year = new Date(startDate).getFullYear();
            exportIftaReportToCsv(reportDataForCsv, quarter, year);
        }
        setShowDisclaimer(false);
        setReportDataForCsv(null);
    };

    const handleGenerateReport = async () => {
        setIsLoading(true);
        setInsights(null);
        setReportDataForCsv(null);
        
        const reportStartDate = new Date(startDate);
        const reportEndDate = new Date(endDate);
        reportEndDate.setHours(23, 59, 59); // Ensure end of day

        try {
            const entries = allEntries
                .filter(e => {
                    const entryDate = new Date(e.dateTime);
                    return entryDate >= reportStartDate && entryDate <= reportEndDate && !e.isIgnored;
                })
                .sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

            if (entries.length < 2) {
                showToast("Not enough data to generate a report. At least two fuel entries are required for mileage calculation.", "info");
                setIsLoading(false);
                return;
            }

            // --- IFTA REPORT DATA ---
            const jurisdictionData: { [key: string]: { miles: number; fuel: number; cost: number } } = {};
            
            const entriesByTruck = entries.reduce((acc, entry) => {
                (acc[entry.truckNumber] = acc[entry.truckNumber] || []).push(entry);
                return acc;
            }, {} as Record<string, FuelEntry[]>);
            
            let totalMiles = 0;

            Object.values(entriesByTruck).forEach(truckEntries => {
                if (truckEntries.length > 1) {
                    for (let i = 0; i < truckEntries.length - 1; i++) {
                        const miles = calculateDistance(truckEntries[i], truckEntries[i + 1]);
                        const state = truckEntries[i].state;
                        if (!jurisdictionData[state]) jurisdictionData[state] = { miles: 0, fuel: 0, cost: 0 };
                        jurisdictionData[state].miles += miles;
                        totalMiles += miles;
                    }
                }
            });

            entries.forEach(entry => {
                const state = entry.state;
                if (!jurisdictionData[state]) jurisdictionData[state] = { miles: 0, fuel: 0, cost: 0 };
                jurisdictionData[state].fuel += entry.amount;
                jurisdictionData[state].cost += entry.cost;
            });

            const reportRows = Object.entries(jurisdictionData).map(([state, data]) => ({ jurisdiction: state, totalMiles: data.miles, totalFuel: data.fuel, totalCost: data.cost }));
            const totalDieselGallons = entries.filter(e => e.fuelType === 'diesel').reduce((sum, e) => sum + e.amount, 0);
            const overallMPG = totalDieselGallons > 0 ? totalMiles / totalDieselGallons : 0;
            setReportDataForCsv({ rows: reportRows, mpg: overallMPG });

            // --- AI INSIGHTS ---
            const truckEfficiency = Object.entries(entriesByTruck).map(([truckNumber, truckLogs]) => {
                if (truckLogs.length < 2) return { truckNumber, mpg: 0 };
                let miles = 0;
                 for (let i = 0; i < truckLogs.length - 1; i++) {
                     miles += calculateDistance(truckLogs[i], truckLogs[i + 1]);
                }
                const gallons = truckLogs.filter(e => e.fuelType === 'diesel').reduce((sum, e) => sum + e.amount, 0);
                return { truckNumber, mpg: gallons > 0 ? miles / gallons : 0 };
            }).filter(t => t.mpg > 0).sort((a, b) => b.mpg - a.mpg);

            const stateCosts = entries.reduce((acc, entry) => {
                if (!acc[entry.state]) acc[entry.state] = { cost: 0, gallons: 0 };
                acc[entry.state].cost += entry.cost;
                acc[entry.state].gallons += entry.amount;
                return acc;
            }, {} as Record<string, { cost: number, gallons: number }>);
            const statePricePerGallon = Object.entries(stateCosts).map(([state, data]) => ({ state, ppg: data.gallons > 0 ? data.cost / data.gallons : 0 })).filter(s => s.ppg > 0).sort((a,b) => a.ppg - b.ppg);

            const costs = entries.map(e => e.cost);
            const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;
            const stdDev = Math.sqrt(costs.map(x => Math.pow(x - avgCost, 2)).reduce((a, b) => a + b, 0) / costs.length);
            const flaggedHighCost = entries.filter(e => e.cost > avgCost + 2 * stdDev);
            const flaggedLateHours = entries.filter(e => { const hour = new Date(e.dateTime).getHours(); return hour >= 0 && hour < 4; });
            
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            const pastEntries = allEntries.filter(e => new Date(e.dateTime) >= sixMonthsAgo);
            const pastTotalCost = pastEntries.reduce((sum, e) => sum + e.cost, 0);
            const forecast = (pastTotalCost / 6) * 3;

            setInsights({
                efficiency: { top: truckEfficiency.slice(0, 3), bottom: truckEfficiency.slice(-3).reverse() },
                costOpt: { cheapest: statePricePerGallon.slice(0, 3), expensive: statePricePerGallon.slice(-3).reverse() },
                anomalies: { highCost: flaggedHighCost, lateHours: flaggedLateHours },
                forecast: forecast
            });
            setShowDisclaimer(true);

        } catch (error) {
            showToast("Failed to generate report.", "error");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {showDisclaimer && <Modal
                title="Disclaimer"
                onClose={() => setShowDisclaimer(false)}
                onConfirm={handleConfirmAndDownload}
                confirmText="Download CSV"
                cancelText="Close"
            >
                <p>Mileage is estimated based on the odometer difference between fueling locations for each truck.</p>
                <p className="font-semibold mt-2">Please verify all data before filing your IFTA report.</p>
            </Modal>}

            <FormCard title={<><i className="fas fa-file-invoice text-light-accent dark:text-dark-accent"></i> Report Generator</>}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Start Date</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputStyle} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">End Date</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputStyle} />
                    </div>
                </div>
                <div className="flex items-center gap-4 mt-4">
                    <button onClick={handleGenerateReport} disabled={isLoading} className="w-full h-10 px-4 py-2 rounded-lg font-semibold text-white bg-light-accent dark:bg-dark-accent hover:opacity-90 transition flex items-center justify-center gap-2 disabled:bg-slate-400 dark:disabled:bg-slate-600">
                       {isLoading ? <Spinner /> : <i className="fas fa-cogs"></i>}
                       Generate IFTA Insights
                    </button>
                    <button
                        onClick={() => {
                            const reportStartDate = new Date(startDate);
                            const reportEndDate = new Date(endDate);
                            reportEndDate.setHours(23, 59, 59);
                            const entriesToExport = allEntries.filter(e => {
                                const entryDate = new Date(e.dateTime);
                                return entryDate >= reportStartDate && entryDate <= reportEndDate && !e.isIgnored;
                            });
                            if (entriesToExport.length > 0) {
                                exportTransactionsToCsv(entriesToExport, reportStartDate, reportEndDate);
                                showToast("Transaction CSV exported successfully!", "success");
                            } else {
                                showToast("No transactions found in the selected date range.", "info");
                            }
                        }}
                        disabled={isLoading || allEntries.length === 0}
                        className="w-full h-10 px-4 py-2 rounded-lg font-semibold text-light-accent dark:text-dark-accent bg-transparent border border-light-accent/50 dark:border-dark-accent/50 hover:bg-light-accent/10 dark:hover:bg-dark-accent/10 transition flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                       <i className="fas fa-file-csv"></i>
                       Export Transactions
                    </button>
                </div>
            </FormCard>

            {isLoading && <div className="flex justify-center py-10"><Spinner className="w-10 h-10" /></div>}

            {insights && !isLoading && (
                 <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border pb-3">AI-Powered Insights</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InsightCard title="Fleet Efficiency Analysis" icon="fa-tachometer-alt">
                           <div className="space-y-2">
                                <h4 className="font-semibold text-light-text dark:text-dark-text">Top 3 Most Efficient Trucks</h4>
                                {insights.efficiency.top.length > 0 ? insights.efficiency.top.map((t:any) => <p key={t.truckNumber}>Truck #{t.truckNumber}: <span className="font-bold text-green-500">{t.mpg.toFixed(2)} MPG</span></p>) : <p>Not enough data.</p>}
                           </div>
                            <div className="space-y-2 mt-4">
                                <h4 className="font-semibold text-light-text dark:text-dark-text">Bottom 3 Least Efficient Trucks</h4>
                                {insights.efficiency.bottom.length > 0 ? insights.efficiency.bottom.map((t:any) => <p key={t.truckNumber}>Truck #{t.truckNumber}: <span className="font-bold text-red-500">{t.mpg.toFixed(2)} MPG</span></p>) : <p>Not enough data.</p>}
                            </div>
                            <p className="mt-4 pt-3 border-t border-light-border/50 dark:border-dark-border/50 font-semibold">Actionable Advice: <span className="font-normal">Consider reviewing driver habits or scheduling maintenance for the least efficient trucks to improve performance.</span></p>
                        </InsightCard>

                        <InsightCard title="Fuel Cost Optimization" icon="fa-dollar-sign">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-light-text dark:text-dark-text">Top 3 Cheapest States for Fuel</h4>
                                {insights.costOpt.cheapest.length > 0 ? insights.costOpt.cheapest.map((s:any) => <p key={s.state}>{s.state}: <span className="font-bold text-green-500">${s.ppg.toFixed(2)}/gal</span></p>) : <p>Not enough data.</p>}
                            </div>
                             <div className="space-y-2 mt-4">
                                <h4 className="font-semibold text-light-text dark:text-dark-text">Top 3 Most Expensive States for Fuel</h4>
                                {insights.costOpt.expensive.length > 0 ? insights.costOpt.expensive.map((s:any) => <p key={s.state}>{s.state}: <span className="font-bold text-red-500">${s.ppg.toFixed(2)}/gal</span></p>) : <p>Not enough data.</p>}
                            </div>
                            <p className="mt-4 pt-3 border-t border-light-border/50 dark:border-dark-border/50 font-semibold">Actionable Advice: <span className="font-normal">Plan routes to maximize fueling in states like {insights.costOpt.cheapest[0]?.state || '[Cheapest State]'} to potentially reduce costs.</span></p>
                        </InsightCard>

                         <InsightCard title="Anomaly Detection" icon="fa-exclamation-triangle">
                            <div>
                                <h4 className="font-semibold text-light-text dark:text-dark-text mb-2">Potential Flags</h4>
                                <ul className="list-disc list-inside space-y-1 max-h-40 overflow-y-auto">
                                   {insights.anomalies.highCost.map((e:FuelEntry) => <li key={e.id}>High cost entry: ${e.cost.toFixed(2)} in {e.city}, {e.state}</li>)}
                                   {insights.anomalies.lateHours.map((e:FuelEntry) => <li key={e.id}>Late hour entry: {new Date(e.dateTime).toLocaleTimeString()} in {e.city}</li>)}
                                   {insights.anomalies.highCost.length === 0 && insights.anomalies.lateHours.length === 0 && <li>No unusual activity detected.</li>}
                                </ul>
                            </div>
                            <p className="mt-4 pt-3 border-t border-light-border/50 dark:border-dark-border/50 font-semibold">Actionable Advice: <span className="font-normal">Review these flagged entries to ensure they are valid business expenses.</span></p>
                        </InsightCard>

                         <InsightCard title="Expense Forecasting" icon="fa-chart-line">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-light-text dark:text-dark-text">Next Quarter's Estimated Fuel Cost</h4>
                                <p className="text-3xl font-bold text-light-accent dark:text-dark-accent">~${insights.forecast.toLocaleString('en-US', {maximumFractionDigits: 0})}</p>
                                <p>Based on the average spending over the last 6 months.</p>
                            </div>
                            <p className="mt-4 pt-3 border-t border-light-border/50 dark:border-dark-border/50 font-semibold">Actionable Advice: <span className="font-normal">Use this forecast to help with budgeting and financial planning for the upcoming quarter.</span></p>
                        </InsightCard>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsView;
