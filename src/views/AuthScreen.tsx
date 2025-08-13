import React, { FC, useState } from 'react';
import { Theme } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { auth, db, googleProvider } from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthScreenProps {
    showToast: (msg: string, type?: any) => void; 
    theme: Theme; 
    setTheme: (theme: Theme) => void;
}

const AuthScreen: FC<AuthScreenProps> = ({ showToast, theme, setTheme }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Handle creating user profile in Firestore
    const handleUserCreation = async (user: any, additionalData: Record<string, any> = {}) => {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
            const { displayName, email, photoURL } = user;
            const createdAt = new Date();
            try {
                await setDoc(userDocRef, {
                    displayName: displayName || `${additionalData.firstName} ${additionalData.lastName}`,
                    email,
                    photoURL,
                    createdAt,
                    firstName: additionalData.firstName || '',
                    lastName: additionalData.lastName || '',
                    companyName: additionalData.companyName || '',
                });
            } catch (error) {
                console.error("Error creating user document:", error);
                showToast("Error setting up your profile.", "error");
            }
        }
    };

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isLoginView) {
                await signInWithEmailAndPassword(auth, email, password);
                showToast("Login successful!", "success");
            } else {
                if (!firstName || !lastName) {
                    showToast("Please enter your first and last name.", "error");
                    setIsLoading(false);
                    return;
                }
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await handleUserCreation(userCredential.user, { firstName, lastName, companyName });
                showToast("Account created successfully!", "success");
            }
        } catch (error: any) {
            const errorCode = error.code || '';
            const errorMessage = error.message || 'An unknown error occurred.';
            showToast(`${errorCode.replace('auth/', '')}: ${errorMessage}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            await handleUserCreation(user, {
                firstName: user.displayName?.split(' ')[0] || '',
                lastName: user.displayName?.split(' ')[1] || '',
            });
            showToast("Signed in with Google successfully!", "success");
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const inputClasses = "w-full px-4 py-3 rounded-lg border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition";
    const primaryButtonClasses = "w-full bg-primary-500 text-white py-3 mt-4 rounded-lg font-semibold hover:bg-primary-600 transition-colors flex items-center justify-center gap-2 disabled:bg-base-300 dark:disabled:bg-base-700 disabled:cursor-not-allowed";
    const secondaryButtonClasses = "w-full bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border text-light-text dark:text-dark-text py-3 rounded-lg font-semibold hover:bg-base-100 dark:hover:bg-base-900 transition-colors flex items-center justify-center gap-3 disabled:opacity-50";

    return (
        <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg p-4">
             <div className="absolute top-4 right-4">
                <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
             <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-primary-500 flex items-center justify-center gap-3">
                        <i className="fas fa-gas-pump"></i> IFTA WAY
                    </h1>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">Mileage & Fuel Command Center</p>
                </div>

                <form onSubmit={handleAuthAction} className="space-y-4">
                    {!isLoginView && (
                        <>
                            <div className="flex gap-4">
                                <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required className={inputClasses}/>
                                <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required className={inputClasses}/>
                            </div>
                            <input type="text" placeholder="Company Name (Optional)" value={companyName} onChange={e => setCompanyName(e.target.value)} className={inputClasses}/>
                        </>
                    )}
                    <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required className={inputClasses}/>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className={inputClasses}/>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-secondary hover:text-primary-500 dark:text-dark-text-secondary dark:hover:text-primary-500">
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                    <button type="submit" disabled={isLoading} className={primaryButtonClasses}>
                        {isLoading ? <Spinner /> : <i className={`fas ${isLoginView ? 'fa-sign-in-alt' : 'fa-user-plus'}`}></i>}
                        {isLoginView ? 'Login' : 'Create Account'}
                    </button>
                </form>
                <div className="relative my-6 flex items-center">
                    <hr className="flex-grow border-light-border dark:border-dark-border" /><span className="mx-4 text-light-text-secondary dark:text-dark-text-secondary text-sm">OR</span><hr className="flex-grow border-light-border dark:border-dark-border" />
                </div>
                <button onClick={handleGoogleSignIn} className={secondaryButtonClasses} disabled={isLoading}>
                    <i className="fab fa-google text-primary-500"></i> Sign in with Google
                </button>
                <p className="text-center mt-6 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-primary-500 ml-1 hover:underline">
                        {isLoginView ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthScreen;