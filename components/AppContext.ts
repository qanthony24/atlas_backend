
import React, { createContext } from 'react';
import { Voter, User, WalkList, Interaction, Assignment, Organization } from '../types';
import { IDataClient } from '../data/client';

interface AppContextType {
    client: IDataClient;
    currentUser: User | null;
    currentOrg: Organization | null;
    
    // Data Caches (synced from client)
    voters: Voter[];
    canvassers: User[];
    walkLists: WalkList[];
    assignments: Assignment[];
    interactions: Interaction[];

    // Actions
    refreshData: () => Promise<void>;
}

export const AppContext = createContext<AppContextType | null>(null);
