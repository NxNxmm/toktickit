import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
const RequesterContext = createContext(undefined);
export const RequesterProvider = ({ children }) => {
    const [selectedRequester, setSelectedRequester] = useState(() => {
        const saved = localStorage.getItem('toktickit_selected_requester');
        return saved ? JSON.parse(saved) : null;
    });
    const selectRequester = (requester) => {
        setSelectedRequester(requester);
        localStorage.setItem('toktickit_selected_requester', JSON.stringify(requester));
    };
    const clearRequester = () => {
        setSelectedRequester(null);
        localStorage.removeItem('toktickit_selected_requester');
    };
    return (_jsx(RequesterContext.Provider, { value: { selectedRequester, selectRequester, clearRequester }, children: children }));
};
export const useRequester = () => {
    const context = useContext(RequesterContext);
    if (!context) {
        throw new Error('useRequester must be used within a RequesterProvider');
    }
    return context;
};
