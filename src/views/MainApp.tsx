import React, { FC, useState, useEffect, useCallback } from 'react';
import { View, Theme, FuelEntry, Truck, User } from '../types';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import { ActionSheet } from '../components/ActionSheet';

import DashboardView from './DashboardView';
import FuelEntryForm from './FuelEntryForm';
import EntriesView from './EntriesView';
import ReportsView from './ReportsView';
import SettingsView from './SettingsView';

interface MainAppProps { 
    user: User; 
    currentView: View; 
    setCurrentView: (view: View) => void; 
    showToast: (msg: string, type?: any) => void; 
    theme: Theme; 
    setTheme: (theme: Theme) => void; 
    onSignOut: () => void;
}

const MainApp: FC<MainAppProps> = ({ user, currentView, setCurrentView, showToast, theme, setTheme, onSignOut }) => {
    const [trucks, setTrucks] = useState<Truck[]>([]);
    const [entryToEdit, setEntryToEdit] = useState<FuelEntry | null>(null);
    const [actionSheetEntry, setActionSheetEntry] = useState<FuelEntry | null>(null);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = () => setRefreshTrigger(t => t + 1);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const [entries, setEntries] = useState<FuelEntry[]>([]);

    const fetchTrucks = useCallback(async () => {
        if (!user) return;
        try {
            const trucksCol = collection(db, 'trucks');
            const q = query(trucksCol, where("userId", "==", user.id), orderBy("number"));
            const trucksSnapshot = await getDocs(q);
            const trucksList = trucksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Truck[];
            setTrucks(trucksList);
        } catch (err: any) {
            showToast("Failed to load trucks.", "error");
        }
    }, [user, showToast]);

    const fetchEntries = useCallback(async () => {
        if (!user) return;
        try {
            const entriesCol = collection(db, 'fuel_entries');
            const q = query(entriesCol, where("userId", "==", user.id), orderBy("dateTime", "desc"));
            const entriesSnapshot = await getDocs(q);
            const entriesList = entriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as FuelEntry[];
            setEntries(entriesList);
        } catch (err: any) {
            showToast("Failed to load fuel entries.", "error");
        }
    }, [user, showToast]);

    useEffect(() => {
        fetchTrucks();
        fetchEntries();
    }, [user, refreshTrigger, fetchTrucks, fetchEntries]);

    const handleEditRequest = (entry: FuelEntry) => {
        setEntryToEdit(entry);
        setActionSheetEntry(null);
        setCurrentView('add-entry');
    }
    
    const handleAddRequest = () => {
        setEntryToEdit(null);
        setCurrentView('add-entry');
    }

    const renderView = () => {
        const commonProps = { user, showToast, theme, onDataChange: triggerRefresh };

        switch (currentView) {
            case 'dashboard': return <DashboardView {...commonProps} entries={entries} onOpenActionSheet={setActionSheetEntry} />;
            case 'add-entry': return <FuelEntryForm trucks={trucks} {...commonProps} onSave={() => { triggerRefresh(); setCurrentView('entries'); }} entryToEdit={entryToEdit} setEntryToEdit={setEntryToEdit} />;
            case 'entries': return <EntriesView {...commonProps} entries={entries} onOpenActionSheet={setActionSheetEntry} />;
            case 'reports': return <ReportsView {...commonProps} trucks={trucks} allEntries={entries} />;
            case 'settings': return <SettingsView {...commonProps} trucks={trucks} onTrucksChange={fetchTrucks} onSignOut={onSignOut} setTheme={setTheme} />;
            default: return <DashboardView {...commonProps} entries={entries} onOpenActionSheet={setActionSheetEntry} />;
        }
    }
    
    return(
        <div>
            <Header isOffline={isOffline} theme={theme} setTheme={setTheme} user={user} />
            <main className="container mx-auto px-4 pb-24 pt-24">
                {renderView()}
            </main>
            <BottomNav activeView={currentView} setCurrentView={setCurrentView} onAdd={handleAddRequest} />
            {actionSheetEntry && <ActionSheet entry={actionSheetEntry} onClose={() => setActionSheetEntry(null)} onEdit={handleEditRequest} showToast={showToast} user={user} onDataChange={triggerRefresh} />}
        </div>
    );
};

export default MainApp;
