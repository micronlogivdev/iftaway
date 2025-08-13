import React, { FC } from 'react';
import { FuelEntry } from '../types';
import { EntryCard } from '../components/EntryCard';
import { Spinner } from '../components/ui/Spinner';

interface EntriesViewProps {
    entries: FuelEntry[];
    onOpenActionSheet: (entry: FuelEntry) => void;
}

const EntriesView: FC<EntriesViewProps> = ({ entries, onOpenActionSheet }) => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">All Fuel Entries</h1>
            </div>

            <div className="space-y-4">
                {entries.map(entry => <EntryCard key={entry.id} entry={entry} onOpenActionSheet={onOpenActionSheet} />)}
            </div>

            {entries.length === 0 && (
                <div className="text-center py-10">
                    <i className="fas fa-receipt text-4xl text-light-text-secondary dark:text-dark-text-secondary mb-4"></i>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary">No entries found.</p>
                </div>
            )}
        </div>
    );
};

export default EntriesView;
