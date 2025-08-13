import React, { FC } from 'react';
import { Theme, User } from '../types';
import { ThemeToggle } from './ui/ThemeToggle';

interface HeaderProps {
    isOffline: boolean;
    theme: Theme;
    setTheme: (theme: Theme) => void;
    user: User;
}

export const Header: FC<HeaderProps> = ({ isOffline, theme, setTheme, user }) => (
    <header className="bg-light-bg dark:bg-dark-bg fixed top-0 left-0 right-0 z-50 border-b border-light-border dark:border-dark-border">
        <div className="container mx-auto px-4 h-16 flex justify-between items-center">
            <div className="text-xl font-bold text-primary-500 flex items-center gap-2">
                <i className="fas fa-gas-pump"></i>
                <span>IFTA WAY</span>
            </div>
            <div className="flex items-center gap-4">
                {/* User menu and other items can be added here based on the new design */}
                <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
        </div>
    </header>
);
