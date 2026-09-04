import React, { createContext, useContext, useState, useEffect } from 'react';

export interface Requester {
    id: number;
    name: string;
    email: string;
    department: string;
}

interface RequesterContextType {
    selectedRequester: Requester | null;
    selectRequester: (requester: Requester) => void;
    clearRequester: () => void;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export const RequesterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedRequester, setSelectedRequester] = useState<Requester | null>(() => {
        const saved = localStorage.getItem('toktickit_selected_requester');
        return saved ? JSON.parse(saved) : null;
    });

    const selectRequester = (requester: Requester) => {
        setSelectedRequester(requester);
        localStorage.setItem('toktickit_selected_requester', JSON.stringify(requester));
    };

    const clearRequester = () => {
        setSelectedRequester(null);
        localStorage.removeItem('toktickit_selected_requester');
    };

    return (
        <RequesterContext.Provider value={{ selectedRequester, selectRequester, clearRequester }}>
            {children}
        </RequesterContext.Provider>
    );
};

export const useRequester = () => {
    const context = useContext(RequesterContext);
    if (!context) {
        throw new Error('useRequester must be used within a RequesterProvider');
    }
    return context;
};