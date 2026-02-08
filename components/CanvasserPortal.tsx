
import React, { useState, useContext, useMemo, useEffect, useRef } from 'react';
import { AppContext } from './AppContext';
import { Voter, InteractionResultCode, InteractionCreate } from '../types';
import { MapIcon, ListBulletIcon, CheckCircleIcon, XCircleIcon, ClockIcon, NoSymbolIcon, PencilSquareIcon, ChevronRightIcon, CloudArrowUpIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

declare const google: any;

const CanvasserPortal: React.FC = () => {
    const context = useContext(AppContext);
    
    // Local state
    const [myAssignments, setMyAssignments] = useState(context?.assignments || []);
    const [selectedListId, setSelectedListId] = useState<string | null>(null);
    const [selectedVoterId, setSelectedVoterId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    
    // Sync UI State
    const [syncState, setSyncState] = useState<'synced' | 'syncing' | 'error'>('synced');
    
    // Map References
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    useEffect(() => {
        if (context) {
            context.client.getMyAssignments().then(setMyAssignments);
        }
    }, [context]);

    if (!context || !context.currentUser) return null;
    const { walkLists, voters, client, refreshData, currentUser, currentOrg, interactions } = context;

    const myLists = walkLists.filter(list => 
        myAssignments.some(a => a.listId === list.id)
    );
    
    const activeList = useMemo(() => 
        myLists.find(l => l.id === selectedListId)
    , [myLists, selectedListId]);

    const activeVoters = useMemo(() => {
        if (!activeList) return [];
        return voters.filter(v => activeList.voterIds.includes(v.id));
    }, [voters, activeList]);

    const selectedVoterHistory = useMemo(() => {
        if (!selectedVoterId) return [];
        return interactions
            .filter(i => i.voter_id === selectedVoterId)
            .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    }, [selectedVoterId, interactions]);

    // Initialize/Update Map when viewing active list in map mode
    useEffect(() => {
        if (selectedListId && viewMode === 'map' && mapRef.current && typeof google !== 'undefined') {
            if (!mapInstance.current) {
                mapInstance.current = new google.maps.Map(mapRef.current, {
                    center: { lat: 40.7128, lng: -74.0060 },
                    zoom: 14,
                    disableDefaultUI: true, // Clean mobile view
                    zoomControl: true,
                });
            }

            // Update Markers
            markersRef.current.forEach(m => m.setMap(null));
            markersRef.current = [];
            const bounds = new google.maps.LatLngBounds();

            activeVoters.forEach((v, index) => {
                if (v.geom) {
                    const status = v.lastInteractionStatus;
                    const isSelected = selectedVoterId === v.id;
                    
                    // Color Logic
                    let fillColor = "#9CA3AF"; // Gray pending
                    if (status === 'contacted') fillColor = "#10B981"; // Green
                    else if (status === 'not_home') fillColor = "#F59E0B"; // Amber
                    else if (status === 'refused') fillColor = "#EF4444"; // Red

                    const marker = new google.maps.Marker({
                        position: v.geom,
                        map: mapInstance.current,
                        label: {
                            text: (index + 1).toString(),
                            color: "white",
                            fontSize: "10px",
                            fontWeight: "bold"
                        },
                        icon: {
                            path: google.maps.SymbolPath.CIRCLE,
                            scale: isSelected ? 12 : 10,
                            fillColor: fillColor,
                            fillOpacity: 1,
                            strokeWeight: 2,
                            strokeColor: isSelected ? "#4F46E5" : "#FFFFFF",
                        }
                    });

                    marker.addListener('click', () => {
                        setSelectedVoterId(v.id);
                        mapInstance.current.panTo(v.geom);
                    });

                    markersRef.current.push(marker);
                    bounds.extend(v.geom);
                }
            });

            if (activeVoters.length > 0) {
                mapInstance.current.fitBounds(bounds);
            }
        }
    }, [selectedListId, viewMode, activeVoters, selectedVoterId]);


    const handleRecordInteraction = async (resultCode: InteractionResultCode, supportLevel?: number, notes?: string) => {
        if (!selectedVoterId || !selectedListId || !currentUser || !currentOrg) return;

        setSyncState('syncing');

        const assignment = myAssignments.find(a => a.listId === selectedListId);

        const payload: InteractionCreate = {
            client_interaction_uuid: crypto.randomUUID(), 
            org_id: currentOrg.id,
            voter_id: selectedVoterId,
            assignment_id: assignment?.id,
            occurred_at: new Date().toISOString(),
            channel: 'canvass',
            result_code: resultCode,
            notes,
            survey_responses: supportLevel ? { support_level: supportLevel } : undefined
        };

        try {
            await client.logInteraction(payload);
            await refreshData();
            setSyncState('synced');
            setSelectedVoterId(null);
        } catch (e) {
            console.error("Sync failed", e);
            setSyncState('error');
        }
    };

    const VoterItem: React.FC<{ voter: Voter, index: number }> = ({ voter, index }) => (
        <div 
            onClick={() => setSelectedVoterId(voter.id)}
            className={`p-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${selectedVoterId === voter.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
        >
            <div className="flex-1 flex items-center">
                 <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs font-bold flex items-center justify-center mr-3">
                    {index + 1}
                </span>
                <div>
                    <div className="flex items-center">
                        <h3 className="text-sm font-bold text-gray-900">{voter.firstName} {voter.lastName}</h3>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            voter.party === 'Democrat' ? 'bg-blue-100 text-blue-700' : 
                            voter.party === 'Republican' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                            {voter.party ? voter.party[0] : 'U'}
                        </span>
                    </div>
                    <p className="text-xs text-gray-500">{voter.address}</p>
                </div>
            </div>
            <div className="flex items-center space-x-2">
                {voter.lastInteractionStatus ? (
                     <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                        voter.lastInteractionStatus === 'contacted' ? 'bg-green-100 text-green-700' :
                        voter.lastInteractionStatus === 'not_home' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                        {voter.lastInteractionStatus.replace('_', ' ')}
                    </span>
                ) : (
                    <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                )}
            </div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
            <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex-shrink-0">
                <div className="flex items-center space-x-3">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white">
                        <MapIcon className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Field Workspace</h1>
                        <div className="flex items-center space-x-2 mt-0.5">
                            {syncState === 'synced' && <span className="flex items-center text-xs text-green-600 font-medium"><CheckIcon className="h-3 w-3 mr-1" /> Synced</span>}
                            {syncState === 'syncing' && <span className="flex items-center text-xs text-indigo-600 font-medium animate-pulse"><CloudArrowUpIcon className="h-3 w-3 mr-1" /> Syncing...</span>}
                             {syncState === 'error' && <span className="flex items-center text-xs text-red-600 font-medium"><ExclamationTriangleIcon className="h-3 w-3 mr-1" /> Error</span>}
                        </div>
                    </div>
                </div>
                {selectedListId && (
                    <button onClick={() => { setSelectedListId(null); setSelectedVoterId(null); }} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                        Exit List
                    </button>
                )}
            </div>

            {!selectedListId ? (
                <div className="grid grid-cols-1 gap-4 overflow-y-auto">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-1">My Assigned Lists</h2>
                    {myLists.length > 0 ? myLists.map(list => (
                        <div key={list.id} onClick={() => setSelectedListId(list.id)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-400 cursor-pointer transition-all group flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="bg-gray-50 p-3 rounded-full group-hover:bg-indigo-50 transition-colors">
                                    <ListBulletIcon className="h-6 w-6 text-gray-400 group-hover:text-indigo-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800 text-lg">{list.name}</h3>
                                    <p className="text-sm text-gray-500">{list.voterIds.length} households</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">Open Turf</span>
                            </div>
                        </div>
                    )) : (
                        <div className="bg-white p-12 text-center rounded-xl border-2 border-dashed border-gray-200">
                             <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                             <p className="text-gray-500 font-medium">No turf assigned yet.</p>
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
                        <h2 className="font-bold text-gray-700">{activeList?.name}</h2>
                        <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                             <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                <ListBulletIcon className="h-4 w-4 mr-1" /> List
                             </button>
                             <button onClick={() => setViewMode('map')} className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center ${viewMode === 'map' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                                <MapIcon className="h-4 w-4 mr-1" /> Map
                             </button>
                        </div>
                    </div>

                    <div className="flex-1 flex min-h-0 relative">
                        {/* Voter Selection Panel */}
                        <div className={`flex-1 overflow-y-auto border-r border-gray-100 ${selectedVoterId ? 'hidden md:block' : 'block'}`}>
                            {viewMode === 'list' ? (
                                <div className="divide-y divide-gray-50">
                                    {activeVoters.map((voter, idx) => <VoterItem key={voter.id} voter={voter} index={idx} />)}
                                </div>
                            ) : (
                                <div ref={mapRef} className="w-full h-full bg-gray-100" />
                            )}
                        </div>

                        {/* Interaction Recording Panel */}
                        {selectedVoterId && (
                             <div className="absolute inset-0 md:static md:flex-1 bg-white z-20 flex flex-col">
                                <div className="p-6 h-full flex flex-col overflow-y-auto">
                                    <div className="mb-6 flex items-start justify-between flex-shrink-0">
                                        <div>
                                            <h2 className="text-2xl font-black text-gray-900">
                                                {voters.find(v => v.id === selectedVoterId)?.firstName} {voters.find(v => v.id === selectedVoterId)?.lastName}
                                            </h2>
                                            <p className="text-gray-500">{voters.find(v => v.id === selectedVoterId)?.address}</p>
                                        </div>
                                        <button onClick={() => setSelectedVoterId(null)} className="md:hidden text-indigo-600 font-bold text-sm bg-indigo-50 px-3 py-1 rounded-lg">&larr; Back</button>
                                    </div>

                                    {/* History Section */}
                                    {selectedVoterHistory.length > 0 && (
                                        <div className="mb-6 bg-amber-50 rounded-lg p-3 border border-amber-100 flex-shrink-0">
                                            <h3 className="text-xs font-bold text-amber-800 uppercase mb-2">Previous Interactions</h3>
                                            <div className="space-y-2 max-h-32 overflow-y-auto">
                                                {selectedVoterHistory.map(hist => (
                                                    <div key={hist.id} className="text-xs text-gray-700 bg-white p-2 rounded shadow-sm">
                                                        <div className="flex justify-between font-semibold">
                                                            <span className={hist.result_code === 'contacted' ? 'text-green-600' : 'text-amber-600'}>
                                                                {hist.result_code.replace('_', ' ').toUpperCase()}
                                                            </span>
                                                            <span className="text-gray-400">{new Date(hist.occurred_at).toLocaleDateString()}</span>
                                                        </div>
                                                        {hist.notes && <p className="italic mt-1 text-gray-500">"{hist.notes}"</p>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4 flex-1 pr-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            <button onClick={() => handleRecordInteraction('contacted', 5)} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-green-50 hover:border-green-400 transition-all text-green-600 group">
                                                <CheckCircleIcon className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-bold uppercase tracking-widest">At Home</span>
                                            </button>
                                            <button onClick={() => handleRecordInteraction('not_home')} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-amber-50 hover:border-amber-400 transition-all text-amber-600 group">
                                                <ClockIcon className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Not Home</span>
                                            </button>
                                            <button onClick={() => handleRecordInteraction('refused')} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-red-50 hover:border-red-400 transition-all text-red-600 group">
                                                <NoSymbolIcon className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Refused</span>
                                            </button>
                                            <button onClick={() => handleRecordInteraction('inaccessible')} className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border-2 border-gray-100 hover:border-gray-400 transition-all text-gray-500 group">
                                                <XCircleIcon className="h-8 w-8 mb-2 group-hover:scale-110 transition-transform" />
                                                <span className="text-xs font-bold uppercase tracking-widest">Inaccessible</span>
                                            </button>
                                        </div>

                                        <div className="pt-4 border-t border-gray-200">
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Field Notes</label>
                                            <div className="relative">
                                                <PencilSquareIcon className="absolute top-3 left-3 h-4 w-4 text-gray-400" />
                                                <textarea className="w-full pl-10 p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] text-sm" placeholder="Support level? Yard sign requested?"></textarea>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 flex space-x-3 flex-shrink-0">
                                        <button onClick={() => setSelectedVoterId(null)} className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition-colors">Skip</button>
                                        <button onClick={() => handleRecordInteraction('contacted', 3, "Recorded through portal")} className="flex-[2] py-3 px-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-md transition-colors">Save Entry</button>
                                    </div>
                                </div>
                             </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasserPortal;
