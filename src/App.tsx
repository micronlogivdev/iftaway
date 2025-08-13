import React, { useState, useEffect, useCallback } from 'react';
import { View, Theme, User } from './types';
import { auth, db } from './firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import MainApp from './views/MainApp';
import AuthScreen from './views/AuthScreen';
import { Spinner } from './components/ui/Spinner';
import { Toast } from './components/ui/Toast';

function App() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('theme') as Theme) || 'dark');
    
    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                // User is signed in, see docs for a list of available properties
                // https://firebase.google.com/docs/reference/js/firebase.User
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setUser({
                        id: firebaseUser.uid, // Use Firebase UID as the primary ID
                        ...userDocSnap.data()
                    } as User);
                } else {
                    // This case might happen if a user is created in Auth but not in Firestore
                    // Or for Google Sign-In on first login, Firestore doc is created in AuthScreen
                     setUser({
                        id: firebaseUser.uid,
                        email: firebaseUser.email || "",
                    });
                }
            } else {
                // User is signed out
                setUser(null);
            }
            setIsLoading(false);
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);
    
    const handleSignOut = () => {
        auth.signOut();
        setCurrentView('dashboard'); // Reset to dashboard view on sign out
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-light-bg dark:bg-dark-bg">
                <div className="text-center">
                    <Spinner className="w-12 h-12 mx-auto" />
                    <p className="mt-4 text-light-text-secondary dark:text-dark-text-secondary">Loading IFTA WAY Command Center...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="text-light-text dark:text-dark-text min-h-screen">
            {user ? (
                <MainApp user={user} currentView={currentView} setCurrentView={setCurrentView} showToast={showToast} theme={theme} setTheme={setTheme} onSignOut={handleSignOut}/>
            ) : (
                <AuthScreen showToast={showToast} theme={theme} setTheme={setTheme} />
            )}
            {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
        </div>
    );
}

export default App;
