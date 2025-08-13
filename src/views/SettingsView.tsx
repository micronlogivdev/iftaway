import React, { FC, useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { generateDemoEntries, convertEntriesToCsv } from '../utils/csvHelpers';
import { Truck, Theme, UploadProgress, User } from '../types';

import { FormCard } from '../components/ui/FormCard';
import { Modal } from '../components/ui/Modal';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { ThemeToggle } from '../components/ui/ThemeToggle';

interface SettingsViewProps { 
    user: User; 
    trucks: Truck[]; 
    showToast: (msg: string, type?: any) => void; 
    theme: Theme; 
    setTheme: (theme: Theme) => void; 
    onSignOut: () => void;
    onTrucksChange: () => void;
}

const SettingsView: FC<SettingsViewProps> = ({ user, trucks, showToast, theme, setTheme, onSignOut, onTrucksChange }) => {
    const [newTruckNumber, setNewTruckNumber] = useState('');
    const [newTruckMakeModel, setNewTruckMakeModel] = useState('');
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ status: 'idle', percentage: 0, message: '' });
    const [showUploadConfirm, setShowUploadConfirm] = useState(false);


    const handleAddTruck = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTruckNumber || !newTruckMakeModel) return;
        try {
            await addDoc(collection(db, 'trucks'), {
                userId: user.id,
                number: newTruckNumber,
                makeModel: newTruckMakeModel,
                createdAt: new Date().toISOString()
            });
            showToast("Truck added successfully", "success");
            setNewTruckNumber('');
            setNewTruckMakeModel('');
            onTrucksChange();
        } catch (error: any) {
            showToast(error.message || "Failed to add truck.", "error");
        }
    };
    
    const handleDeleteTruck = async (truckId: string) => {
        if (!window.confirm("Are you sure you want to delete this truck?")) return;
        try {
            await deleteDoc(doc(db, 'trucks', truckId));
            showToast("Truck deleted.", "success");
            onTrucksChange();
        } catch (error: any) {
            showToast(error.message || "Failed to delete truck.", "error");
        }
    };

    const handleDownloadDemoCsv = () => {
        // This function seems to be using old helper functions. Let's disable it for now.
        showToast("Demo CSV download is temporarily unavailable.", "info");
    };
    
    const handleCsvUploadClick = () => {
        showToast("Bulk CSV upload is coming soon!", "info");
    };

    const isProcessing = uploadProgress.status === 'reading' || uploadProgress.status === 'parsing' || uploadProgress.status === 'uploading';

    const inputClasses = "w-full px-4 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition";
    const primaryButtonClasses = "w-full bg-primary-500 text-white py-2 px-4 rounded-lg font-semibold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:bg-base-300 dark:disabled:bg-base-700 disabled:cursor-not-allowed";
    const secondaryButtonClasses = "w-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text py-2 px-4 rounded-lg font-semibold hover:bg-base-100 dark:hover:bg-base-900 transition-colors flex items-center justify-center gap-3 disabled:opacity-50";


    return (
        <div className="space-y-6">
            <FormCard title={<><i className="fas fa-user-circle text-primary-500"></i> Account</>}>
                <div className="flex items-center justify-between">
                    <p>Logged in as <span className="font-semibold">{user.email}</span></p>
                    <button onClick={onSignOut} className="font-semibold text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors">Sign Out</button>
                </div>
            </FormCard>
            
            <FormCard title={<><i className="fas fa-sun text-primary-500"></i> Theme</>}>
                 <div className="flex items-center justify-between">
                    <p>Switch between light and dark mode.</p>
                    <ThemeToggle theme={theme} setTheme={setTheme} />
                </div>
            </FormCard>

            <FormCard title={<><i className="fas fa-truck text-primary-500"></i> Manage Trucks</>}>
                <form onSubmit={handleAddTruck} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-1">
                         <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Truck Number</label>
                         <input value={newTruckNumber} onChange={e => setNewTruckNumber(e.target.value)} placeholder="#123" className={inputClasses}/>
                    </div>
                     <div className="md:col-span-1">
                         <label className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary mb-1">Make / Model</label>
                         <input value={newTruckMakeModel} onChange={e => setNewTruckMakeModel(e.target.value)} placeholder="e.g., Cascadia" className={inputClasses}/>
                    </div>
                    <button type="submit" className={primaryButtonClasses}>Add Truck</button>
                </form>
                <div className="mt-6 space-y-3">
                    <h3 className="text-md font-semibold text-light-text dark:text-dark-text border-b border-light-border dark:border-dark-border pb-2">Your Fleet</h3>
                    {trucks.map(truck => (
                        <div key={truck.id} className="flex justify-between items-center p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border">
                            <div>
                                <p className="font-semibold">{truck.makeModel}</p>
                                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">Truck #{truck.number}</p>
                            </div>
                            <button onClick={() => handleDeleteTruck(truck.id)} className="text-light-text-secondary dark:text-dark-text-secondary hover:text-red-500 transition-colors"><i className="fas fa-trash"></i></button>
                        </div>
                    ))}
                    {trucks.length === 0 && <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary pt-4">No trucks added yet.</p>}
                </div>
            </FormCard>
            
            <FormCard title={<><i className="fas fa-upload text-primary-500"></i> Upload Historical Data</>}>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">
                    This feature is currently being upgraded. Bulk CSV upload will be available soon.
                </p>
            </FormCard>
        </div>
    );
};

export default SettingsView;
