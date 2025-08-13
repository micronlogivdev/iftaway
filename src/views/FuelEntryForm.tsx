import React, { FC, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { FuelEntry, Truck, SaveState, User } from '../types';
import { statesAndProvinces } from '../utils/constants';
import { scanReceiptWithAI } from '../services/aiService';

import { FormCard } from '../components/ui/FormCard';
import { Autocomplete } from '../components/ui/Autocomplete';
import { Spinner } from '../components/ui/Spinner';
import { FileUpload } from '../components/FileUpload';

interface FuelEntryFormProps {
    trucks: Truck[];
    showToast: (msg: string, type?: any) => void;
    user: User;
    onSave: () => void;
    entryToEdit: FuelEntry | null;
    setEntryToEdit: (entry: FuelEntry | null) => void;
}

const FuelEntryForm: FC<FuelEntryFormProps> = ({ trucks, showToast, onSave, entryToEdit, setEntryToEdit }) => {
    const [truckNumber, setTruckNumber] = useState('');
    const [dateTime, setDateTime] = useState(new Date().toISOString().slice(0, 16));
    const [odometer, setOdometer] = useState('');
    const [city, setCity] = useState('');
    const [state, setState] = useState('');
    const [fuelType, setFuelType] = useState<'diesel' | 'def' | 'custom'>('diesel');
    const [customFuelType, setCustomFuelType] = useState('');
    const [amount, setAmount] = useState('');
    const [cost, setCost] = useState('');
    const [pricePerGallon, setPricePerGallon] = useState('');
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [previewObjectURL, setPreviewObjectURL] = useState<string | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const [isScanning, setIsScanning] = useState(false);
    const [scanError, setScanError] = useState<string | null>(null);

    const clearForm = useCallback(() => {
        setTruckNumber('');
        setDateTime(new Date().toISOString().slice(0, 16));
        setOdometer('');
        setCity('');
        setState('');
        setFuelType('diesel');
        setCustomFuelType('');
        setAmount('');
        setCost('');
        setPricePerGallon('');
        setReceiptFile(null);
        setReceiptPreview(null);
        setScanError(null);
        if (previewObjectURL) {
            URL.revokeObjectURL(previewObjectURL);
            setPreviewObjectURL(null);
        }
        setEntryToEdit(null);
    }, [previewObjectURL, setEntryToEdit]);

    useEffect(() => {
        if (entryToEdit) {
            setTruckNumber(entryToEdit.truckNumber);
            setDateTime(new Date(entryToEdit.dateTime).toISOString().slice(0, 16));
            setOdometer(entryToEdit.odometer.toString());
            setCity(entryToEdit.city);
            setState(entryToEdit.state);
            setFuelType(entryToEdit.fuelType);
            setCustomFuelType(entryToEdit.customFuelType || '');
            setAmount(entryToEdit.amount.toString());
            setCost(entryToEdit.cost.toString());
            if (entryToEdit.amount > 0) {
                setPricePerGallon((entryToEdit.cost / entryToEdit.amount).toFixed(4));
            } else {
                setPricePerGallon('');
            }
            if (entryToEdit.receiptUrl) {
                setReceiptPreview(entryToEdit.receiptUrl);
            }
        } else {
            clearForm();
        }
    }, [entryToEdit, clearForm]);

    useEffect(() => {
        return () => {
            if (previewObjectURL) URL.revokeObjectURL(previewObjectURL);
        }
    }, [previewObjectURL]);

    const handleFileSelect = useCallback(async (file: File | null) => {
        setReceiptFile(file);
        setScanError(null);

        if (previewObjectURL) {
            URL.revokeObjectURL(previewObjectURL);
            setPreviewObjectURL(null);
        }

        if (file) {
            const objectUrl = URL.createObjectURL(file);
            setPreviewObjectURL(objectUrl);
            setReceiptPreview(objectUrl);
            setIsScanning(true);

            try {
                const data = await scanReceiptWithAI(file);

                if (data.total_cost) setCost(data.total_cost.toString());
                if (data.fuel_gallons) setAmount(data.fuel_gallons.toString());

                if (data.total_cost && data.fuel_gallons && data.fuel_gallons > 0) {
                    setPricePerGallon((data.total_cost / data.fuel_gallons).toFixed(4));
                }

                if (data.city) setCity(data.city);
                if (data.state) setState(data.state.toUpperCase());
                if (data.purchase_date) {
                    const parsedDate = new Date(data.purchase_date + 'T12:00:00Z');
                     if (!isNaN(parsedDate.getTime())) {
                        const localDate = new Date(parsedDate.getTime() + parsedDate.getTimezoneOffset() * 60000);
                        setDateTime(localDate.toISOString().slice(0,16));
                     }
                }
                if (data.fuel_type) {
                    const ft = data.fuel_type.toLowerCase();
                    if(ft.includes('diesel')) setFuelType('diesel');
                    else if(ft.includes('def')) setFuelType('def');
                    else {
                        setFuelType('custom');
                        setCustomFuelType(data.fuel_type);
                    }
                }
                showToast("Receipt auto-filled successfully!", "success");
            } catch (error: any) {
                console.error("AI Scan failed:", error);
                setScanError(error.message || "Scan failed. Please enter details manually.");
            } finally {
                setIsScanning(false);
            }
        } else {
            if (!entryToEdit?.receiptUrl) {
                setReceiptPreview(null);
            }
        }
    }, [previewObjectURL, showToast, entryToEdit]);

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newAmount = e.target.value;
        setAmount(newAmount);
        const numAmount = parseFloat(newAmount);
        const numPrice = parseFloat(pricePerGallon);
        if (!isNaN(numAmount) && !isNaN(numPrice) && numAmount >= 0 && numPrice >= 0) {
            setCost((numAmount * numPrice).toFixed(2));
        }
    };
    
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newPrice = e.target.value;
        setPricePerGallon(newPrice);
        const numAmount = parseFloat(amount);
        const numPrice = parseFloat(newPrice);
        if (!isNaN(numAmount) && !isNaN(numPrice) && numAmount >= 0 && numPrice >= 0) {
            setCost((numAmount * numPrice).toFixed(2));
        }
    };
    
    const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newCost = e.target.value;
        setCost(newCost);
        const numAmount = parseFloat(amount);
        const numCost = parseFloat(newCost);
        if (!isNaN(numAmount) && !isNaN(numCost) && numAmount > 0) {
            setPricePerGallon((numCost / numAmount).toFixed(4));
        } else if (numAmount <= 0 && numCost > 0) {
            setPricePerGallon('');
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaveState('saving');
        
        let receiptUrl = entryToEdit?.receiptUrl || '';

        try {
            if (receiptFile) {
                const storage = getStorage();
                const storageRef = ref(storage, `receipts/${user.id}/${Date.now()}-${receiptFile.name}`);
                const snapshot = await uploadBytes(storageRef, receiptFile);
                receiptUrl = await getDownloadURL(snapshot.ref);
            }

            const entryData = {
                userId: user.id,
                truckNumber,
                dateTime,
                odometer: parseFloat(odometer) || 0,
                city,
                state,
                fuelType,
                customFuelType: fuelType === 'custom' ? customFuelType : '',
                amount: parseFloat(amount) || 0,
                cost: parseFloat(cost) || 0,
                receiptUrl,
                isIgnored: entryToEdit?.isIgnored || false,
                lastEditedAt: new Date().toISOString(),
            };
            
            if (entryToEdit) {
                const entryDocRef = doc(db, 'fuel_entries', entryToEdit.id);
                await updateDoc(entryDocRef, entryData);
                showToast("Entry updated successfully!", "success");
            } else {
                await addDoc(collection(db, 'fuel_entries'), {
                    ...entryData,
                    createdAt: new Date().toISOString()
                });
                showToast("Entry saved successfully!", "success");
            }

            setSaveState('success');
            setTimeout(() => {
                clearForm();
                onSave();
                setSaveState('idle');
            }, 1500);

        } catch (error: any) {
            setSaveState('error');
            showToast(error.message || 'Save failed. Please check your connection.', 'error');
            setTimeout(() => setSaveState('idle'), 3000);
        }
    };
    
    const inputStyle = "mt-1 block w-full px-3 py-2 rounded-lg border border-light-border dark:border-dark-border bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text-secondary dark:placeholder-dark-text-secondary focus:outline-none focus:ring-2 focus:ring-light-accent dark:focus:ring-dark-accent focus:border-light-accent dark:focus:border-dark-accent transition disabled:opacity-50";
    const labelStyle = "block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary";

    const stateOptions = statesAndProvinces.map(s => ({ value: s.code, label: `${s.name} (${s.code})` }));
    
    const renderSaveButtonContent = () => {
        switch (saveState) {
            case 'saving':
                return <><Spinner />Saving...</>;
            case 'success':
                return <><i className="fas fa-check-circle"></i>Saved!</>;
            case 'error':
                return <><i className="fas fa-exclamation-triangle"></i>Save Failed</>;
            default:
                return <><i className="fas fa-save"></i>{entryToEdit ? 'Save Changes' : 'Save Entry'}</>;
        }
    };
    
    const getSaveButtonClass = () => {
        switch (saveState) {
            case 'saving':
                return 'bg-slate-400 dark:bg-slate-600 cursor-not-allowed';
            case 'success':
                return 'bg-green-600 dark:bg-green-500';
            case 'error':
                return 'bg-red-600 dark:bg-red-500';
            default:
                return 'bg-light-accent dark:bg-dark-accent hover:opacity-90';
        }
    };

    return (
        <FormCard title={<><i className={`fas ${entryToEdit ? 'fa-edit' : 'fa-plus'} text-light-accent dark:text-dark-accent`}></i> {entryToEdit ? 'Edit Fuel Entry' : 'Add Fuel Entry'}</>}>
            <form onSubmit={handleSubmit} className="space-y-6">
                <FileUpload 
                    onFileSelect={handleFileSelect}
                    receiptFile={receiptFile}
                    receiptPreview={receiptPreview}
                    isScanning={isScanning}
                    scanError={scanError}
                    clearFile={() => { 
                        setReceiptFile(null); 
                        setReceiptPreview(null); 
                        if (previewObjectURL) URL.revokeObjectURL(previewObjectURL);
                        setPreviewObjectURL(null);
                    }}
                />
                
                <div>
                    <label htmlFor="truckNumber" className={labelStyle}>Truck</label>
                    <select
                        id="truckNumber"
                        value={truckNumber}
                        onChange={e => setTruckNumber(e.target.value)}
                        required
                        className={inputStyle}
                    >
                        <option value="" disabled>Select a truck...</option>
                        {trucks.map(truck => (
                            <option key={truck.id} value={truck.number}>
                                {truck.makeModel} - #{truck.number}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="dateTime" className={labelStyle}>Date & Time</label>
                        <input type="datetime-local" id="dateTime" value={dateTime} onChange={e => setDateTime(e.target.value)} required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="odometer" className={labelStyle}>Odometer Reading</label>
                        <input type="number" id="odometer" value={odometer} onChange={e => setOdometer(e.target.value)} placeholder="e.g., 123456" required className={inputStyle} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label htmlFor="city" className={labelStyle}>City</label>
                        <input type="text" id="city" value={city} onChange={e => setCity(e.target.value)} placeholder="e.g., Phoenix" required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="state" className={labelStyle}>State/Province</label>
                        <Autocomplete id="state" value={state} onChange={setState} items={stateOptions} placeholder="Select state..." />
                    </div>
                </div>

                <div>
                    <label className={labelStyle}>Fuel Type</label>
                    <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg bg-light-bg dark:bg-dark-bg p-1">
                        {(['diesel', 'def', 'custom'] as const).map(type => (
                            <button type="button" key={type} onClick={() => setFuelType(type)} className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors capitalize ${fuelType === type ? 'bg-light-accent dark:bg-dark-accent text-white shadow' : 'hover:bg-slate-200/50 dark:hover:bg-slate-700/50'}`}>{type}</button>
                        ))}
                    </div>
                    {fuelType === 'custom' && (
                        <input type="text" value={customFuelType} onChange={e => setCustomFuelType(e.target.value)} placeholder="Enter custom fuel type" required className={`${inputStyle} mt-2`} />
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="amount" className={labelStyle}>Fuel amount (gallons)</label>
                        <input type="number" step="any" id="amount" value={amount} onChange={handleAmountChange} placeholder="e.g., 150.5" required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="pricePerGallon" className={labelStyle}>Price per gallon ($)</label>
                        <input type="number" step="any" id="pricePerGallon" value={pricePerGallon} onChange={handlePriceChange} placeholder="e.g., 3.999" required className={inputStyle} />
                    </div>
                    <div>
                        <label htmlFor="cost" className={labelStyle}>Total Cost ($)</label>
                        <input type="number" step="any" id="cost" value={cost} onChange={handleCostChange} placeholder="e.g., 601.75" required className={inputStyle} />
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-light-border dark:border-dark-border">
                     <button type="button" onClick={clearForm} className="px-6 py-3 rounded-lg font-semibold text-light-text-secondary dark:text-dark-text-secondary hover:bg-slate-200/50 dark:hover:bg-dark-border/50 transition-colors">Clear</button>
                    <button type="submit" disabled={saveState !== 'idle' || isScanning} className={`px-8 py-3 rounded-lg font-semibold text-white transition-all flex items-center gap-2 disabled:cursor-not-allowed ${getSaveButtonClass()}`}>
                        {renderSaveButtonContent()}
                    </button>
                </div>
            </form>
        </FormCard>
    );
};

export default FuelEntryForm;
