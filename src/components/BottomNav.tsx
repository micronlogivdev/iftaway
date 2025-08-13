import React, { FC } from 'react';
import { View } from '../types';

interface BottomNavProps { activeView: View; setCurrentView: (view: View) => void; onAdd: () => void; }

export const BottomNav: FC<BottomNavProps> = ({ activeView, setCurrentView, onAdd }) => {
    const navItems = [
        { view: 'dashboard', icon: 'fa-th-large', label: 'Dashboard' },
        { view: 'entries', icon: 'fa-list', label: 'Entries' },
        { view: 'add-entry', icon: 'fa-plus-circle', label: 'Add' },
        { view: 'reports', icon: 'fa-chart-pie', label: 'Reports' },
        { view: 'settings', icon: 'fa-cog', label: 'Settings' }
    ] as const;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border z-50">
            <div className="flex justify-around max-w-lg mx-auto">
                {navItems.map(item => {
                    const isActive = activeView === item.view;
                    const buttonClasses = `flex flex-col items-center justify-center flex-1 py-3 px-1 text-center transition-colors duration-200`;
                    const colorClasses = isActive ? 'text-primary-500' : 'text-light-text-secondary dark:text-dark-text-secondary hover:text-primary-500';

                    const handleClick = () => {
                        if (item.view === 'add-entry') {
                            onAdd();
                        } else {
                            setCurrentView(item.view);
                        }
                    };
                    
                    return (
                        <button key={item.view} onClick={handleClick} className={`${buttonClasses} ${colorClasses}`}>
                            <i className={`fas ${item.icon} text-xl`}></i>
                            <span className="text-xs mt-1 font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </nav>
    );
};
