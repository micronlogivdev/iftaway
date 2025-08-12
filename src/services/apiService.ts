import { FuelEntry, Truck } from "../types";

// Set API_BASE_URL to the production backend.
const API_BASE_URL = 'https://ifta-way-backend.onrender.com';

async function fetchApi(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('iftaway_token');
    const headers = new Headers(options.headers || {});
    
    if (!(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { msg: 'An unknown error occurred. The server might be offline.' };
            }
            throw new Error(errorData.msg || `Request failed with status ${response.status}`);
        }
        
        if (response.status === 204) {
            return null;
        }

        return response.json();
    } catch (error: any) {
        throw new Error(error.message || 'Network request failed. Please check your connection.');
    }
}

// --- Auth ---
const register = (email: string, password: string) => fetchApi('/api/register', { method: 'POST', body: JSON.stringify({ email, password }) });
const login = (email: string, password: string): Promise<{user: any, token: string}> => fetchApi('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
const getMe = (): Promise<{user: any}> => fetchApi('/api/me');

// --- AI Receipt Scan ---
const scanReceipt = (base64Image: string, mimeType: string): Promise<any> => {
    return fetchApi('/api/scan-receipt', {
        method: 'POST',
        body: JSON.stringify({ image: base64Image, mimeType }),
    });
};

// --- Trucks ---
const getTrucks = (): Promise<Truck[]> => fetchApi('/api/trucks');
const addTruck = (number: string, makeModel: string): Promise<Truck> => fetchApi('/api/trucks', { method: 'POST', body: JSON.stringify({ number, makeModel }) });
const deleteTruck = (id: string) => fetchApi(`/api/trucks/${id}`, { method: 'DELETE' });

// --- Fuel Entries ---
const getEntries = (): Promise<FuelEntry[]> => fetchApi('/api/entries');
const addEntry = (entryData: Partial<FuelEntry>) => fetchApi('/api/entries', { method: 'POST', body: JSON.stringify(entryData) });
const updateEntry = (id: string, entryData: Partial<FuelEntry>) => fetchApi(`/api/entries/${id}`, { method: 'PUT', body: JSON.stringify(entryData) });
const deleteEntry = (id: string) => fetchApi(`/api/entries/${id}`, { method: 'DELETE' });
const toggleIgnoreEntry = (id: string, isIgnored: boolean) => fetchApi(`/api/entries/${id}/ignore`, { method: 'PUT', body: JSON.stringify({ isIgnored }) });

const apiService = {
    register,
    login,
    getMe,
    scanReceipt,
    getTrucks,
    addTruck,
    deleteTruck,
    getEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    toggleIgnoreEntry
};

export default apiService;