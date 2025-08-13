import React, { FC } from 'react';
import { FuelEntry } from '../types';

export const EntryCard: FC<{ entry: FuelEntry, onOpenActionSheet: (entry: FuelEntry) => void }> = ({ entry, onOpenActionSheet }) => {
    const fuelDisplay = entry.fuelType === 'custom' ? entry.customFuelType : entry.fuelType;
    const fuelBadgeClass = { 
        diesel: 'bg-yellow-400/10 text-yellow-500 dark:text-yellow-300 border border-yellow-400/20', 
        def: 'bg-blue-400/10 text-blue-500 dark:text-blue-300 border border-blue-400/20', 
        custom: 'bg-slate-400/10 text-slate-500 dark:text-slate-300 border border-slate-400/20'
    }[entry.fuelType];

    return (
        <div
            className={`bg-light-card dark:bg-dark-card p-4 rounded-xl border border-light-border dark:border-dark-border shadow-sm transition-all duration-200 hover:border-primary-500/50 hover:shadow-lg cursor-pointer ${entry.isIgnored ? 'opacity-50 grayscale' : ''}`}
            onClick={() => onOpenActionSheet(entry)}
        >
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-semibold text-md text-light-text dark:text-dark-text">{entry.city}, {entry.state}</p>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{new Date(entry.dateTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
                <div className="text-right">
                    <p className="font-bold text-lg text-light-text dark:text-dark-text">${entry.cost.toFixed(2)}</p>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{entry.amount.toFixed(2)} gal</p>
                </div>
            </div>
            <div className="flex justify-between items-center mt-3 border-t border-light-border dark:border-dark-border pt-3 text-sm">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${fuelBadgeClass}`}>{fuelDisplay}</span>
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    <i className="fas fa-truck mr-2"></i>Truck #{entry.truckNumber || 'N/A'}
                </p>
                <p className="text-light-text-secondary dark:text-dark-text-secondary">
                    <i className="fas fa-tachometer-alt mr-2"></i>{entry.odometer.toLocaleString()}
                </p>
            </div>
        </div>
    );
};
