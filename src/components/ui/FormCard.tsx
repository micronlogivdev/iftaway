import React, { FC, ReactNode } from 'react';

export const FormCard: FC<{ title: ReactNode; children: ReactNode; className?: string }> = ({ title, children, className }) => (
    <div className={`bg-light-card dark:bg-dark-card p-6 rounded-xl shadow-sm dark:shadow-none border border-light-border dark:border-dark-border ${className}`}>
        <h2 className="text-lg font-semibold text-light-text dark:text-dark-text mb-4 flex items-center gap-3">{title}</h2>
        <div className="space-y-4">
            {children}
        </div>
    </div>
);
