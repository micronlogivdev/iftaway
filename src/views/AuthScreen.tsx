import React, { FC, useState } from 'react';
import apiService from '../services/apiService';
import { Theme } from '../types';
import { Spinner } from '../components/ui/Spinner';
import { ThemeToggle } from '../components/ui/ThemeToggle';

interface AuthScreenProps {
    onLoginSuccess: (data: { user: any, token: string }) => void;
    showToast: (msg: string, type?: any) => void; 
    theme: Theme; 
    setTheme: (theme: Theme) => void;
}

const AuthScreen: FC<AuthScreenProps> = ({ onLoginSuccess, showToast, theme, setTheme }) => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('demo@iftaway.com');
    const [password, setPassword] = useState('password123');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isLoginView) {
                const data = await apiService.login(email, password);
                onLoginSuccess(data);
            } else {
                await apiService.register(email, password);
                showToast("Account created! Please login.", "success");
                setIsLoginView(true);
            }
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGoogleSignIn = async () => {
        showToast("Google Sign-In is not yet configured for this backend.", "info");
    };

    return (
        <div className="flex items-center justify-center min-h-screen p-4 relative">
             <div className="absolute top-4 right-4">
                <ThemeToggle theme={theme} setTheme={setTheme} />
            </div>
             <div className="w-full max-w-md bg-light-card/80 dark:bg-dark-card/80 backdrop-blur-lg p-8 rounded-xl shadow-2xl border border-light-border/50 dark:border-dark-border/50">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-light-accent dark:text-dark-accent flex items-center justify-center gap-3">
                        <i className="fas fa-gas-pump"></i> IFTA WAY
                    </h1>
                    <p className="text-light-text-secondary dark:text-dark-text-secondary mt-2">Mileage & Fuel Command Center</p>
                </div>

                <form onSubmit={handleAuthAction} className="space-y-4">
                    <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required className="w-full px-4 py-3 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent transition"/>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="w-full px-4 py-3 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent transition"/>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-light-text-secondary hover:text-light-accent dark:text-dark-text-secondary dark:hover:text-dark-accent">
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                        </button>
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-light-accent dark:bg-dark-accent text-white py-3 mt-4 rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed">
                        {isLoading ? <Spinner /> : <i className={`fas ${isLoginView ? 'fa-sign-in-alt' : 'fa-user-plus'}`}></i>}
                        {isLoginView ? 'Login' : 'Create Account'}
                    </button>
                </form>
                <div className="relative my-6 flex items-center">
                    <hr className="flex-grow border-light-border dark:border-dark-border" /><span className="mx-4 text-light-text-secondary dark:text-dark-text-secondary text-sm">OR</span><hr className="flex-grow border-light-border dark:border-dark-border" />
                </div>
                <button onClick={handleGoogleSignIn} className="w-full bg-transparent border border-light-border dark:border-dark-border text-light-text dark:text-dark-text py-3 rounded-lg font-semibold hover:bg-slate-200/50 dark:hover:bg-dark-card/80 hover:text-light-accent dark:hover:text-dark-accent hover:border-light-accent/50 dark:hover:border-dark-accent/50 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed">
                    <i className="fab fa-google text-light-accent dark:text-dark-accent"></i> Sign in with Google
                </button>
                <p className="text-center mt-6 text-sm text-light-text-secondary dark:text-dark-text-secondary">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => setIsLoginView(!isLoginView)} className="font-semibold text-light-accent dark:text-dark-accent ml-1 hover:opacity-80">
                        {isLoginView ? 'Sign Up' : 'Login'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthScreen;