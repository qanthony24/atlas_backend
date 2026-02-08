
import React, { useState, useContext, useRef, useEffect } from 'react';
import { AppContext } from './AppContext';
import { useGeolocation } from '../hooks/useGeolocation';
import { calculateDistance } from '../utils/geoUtils';
import { MapIcon } from '@heroicons/react/24/outline';

declare const google: any;

const TurfCutter: React.FC = () => {
    const context = useContext(AppContext);
    const [selectedVoters, setSelectedVoters] = useState<string[]>([]);
    const [filterParty, setFilterParty] = useState<string>('All');
    const [filterCity, setFilterCity] = useState<string>('All');
    const [listName, setListName] = useState('');
    
    // Geolocation state
    const { location, error, loading, getLocation } = useGeolocation();
    const [useProximity, setUseProximity] = useState(false);
    const [radius, setRadius] = useState(5); // km

    // Map State
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);

    if (!context) return null;
    const { voters, client, refreshData } = context;

    const filteredVoters = voters.filter(voter => {
        const partyMatch = filterParty === 'All' || voter.party === filterParty;
        const cityMatch = filterCity === 'All' || voter.city === filterCity;
        
        let proximityMatch = true;
        if (useProximity && location && voter.geom) {
            const distance = calculateDistance(location.lat, location.lng, voter.geom.lat, voter.geom.lng);
            proximityMatch = distance <= radius;
        }

        return partyMatch && cityMatch && proximityMatch;
    });

    // Initialize Map
    useEffect(() => {
        if (mapRef.current && !mapInstance.current && typeof google !== 'undefined') {
            mapInstance.current = new google.maps.Map(mapRef.current, {
                center: { lat: 40.7128, lng: -74.0060 },
                zoom: 12,
                mapTypeControl: false,
                styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }]
            });
        }
    }, []);

    // Update Map Markers based on filteredVoters
    useEffect(() => {
        if (!mapInstance.current || typeof google === 'undefined') return;

        // Clear markers
        markersRef.current.forEach(m => m.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;

        filteredVoters.forEach(voter => {
            if (voter.geom) {
                const isSelected = selectedVoters.includes(voter.id);
                const marker = new google.maps.Marker({
                    position: voter.geom,
                    map: mapInstance.current,
                    title: `${voter.firstName} ${voter.lastName}`,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: isSelected ? 6 : 4,
                        fillColor: isSelected ? "#4F46E5" : (voter.party === 'Democrat' ? '#3B82F6' : voter.party === 'Republican' ? '#EF4444' : '#9CA3AF'),
                        fillOpacity: 0.8,
                        strokeWeight: isSelected ? 2 : 1,
                        strokeColor: "#FFFFFF",
                    }
                });
                
                // Click to select
                marker.addListener("click", () => {
                    handleSelectVoter(voter.id);
                });

                markersRef.current.push(marker);
                bounds.extend(voter.geom);
                hasPoints = true;
            }
        });

        if (location) {
            // Draw circle for radius if enabled
            // (omitted for brevity, can add Circle object)
        }

        if (hasPoints) {
            mapInstance.current.fitBounds(bounds);
        }

    }, [filteredVoters, selectedVoters, location]);

    const handleSelectVoter = (voterId: string) => {
        setSelectedVoters(prev => 
            prev.includes(voterId) ? prev.filter(id => id !== voterId) : [...prev, voterId]
        );
    };
    
    const handleSaveList = async () => {
        if (!listName || selectedVoters.length === 0) {
            alert('Please provide a list name and select at least one voter.');
            return;
        }
        try {
            await client.createWalkList(listName, selectedVoters);
            await refreshData();
            setListName('');
            setSelectedVoters([]);
            alert('Walk list created successfully!');
        } catch (e) {
            console.error(e);
            alert("Error creating list");
        }
    };

    const handleUseLocation = () => {
        getLocation();
        setUseProximity(true);
    };

    const uniqueCities = ['All', ...Array.from(new Set(voters.map(v => v.city)))];
    const uniqueParties = ['All', ...Array.from(new Set(voters.map(v => v.party)))];

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            <h1 className="text-3xl font-semibold text-gray-800 flex-shrink-0">Turf Cutter</h1>
            <div className="mt-8 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
                {/* Visual Turf Cutter Map */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-md flex flex-col relative overflow-hidden">
                    <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-md shadow-sm border border-gray-200">
                        <p className="text-xs font-bold text-gray-600">{filteredVoters.length} Voters Found</p>
                        <p className="text-[10px] text-gray-400">{selectedVoters.length} Selected</p>
                    </div>
                    <div ref={mapRef} className="w-full h-full bg-gray-100" />
                </div>

                {/* Filter & Selection Panel */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col min-h-0 overflow-y-auto">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Filter-Based Cutter</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Party</label>
                            <select onChange={(e) => setFilterParty(e.target.value)} value={filterParty} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                {uniqueParties.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700">City</label>
                            <select onChange={(e) => setFilterCity(e.target.value)} value={filterCity} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                                {uniqueCities.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Geolocation Section */}
                    <div className="pt-4 mt-4 border-t border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Geolocation Tools</h3>
                        {!location || !useProximity ? (
                            <button 
                                onClick={handleUseLocation}
                                disabled={loading}
                                className="w-full flex justify-center items-center px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors"
                            >
                                <MapIcon className="h-5 w-5 mr-2" />
                                {loading ? 'Locating...' : 'Find Voters Near Me'}
                            </button>
                        ) : (
                            <div className="space-y-3 bg-indigo-50 p-3 rounded-md">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-indigo-800 font-semibold flex items-center">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                        Location Active
                                    </span>
                                    <button onClick={() => setUseProximity(false)} className="text-xs text-red-500 hover:text-red-700 underline">Clear Filter</button>
                                </div>
                                 <div>
                                    <div className="flex justify-between">
                                        <label className="block text-xs font-medium text-indigo-800">Radius</label>
                                        <span className="text-xs font-bold text-indigo-800">{radius} km</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="50" 
                                        value={radius} 
                                        onChange={(e) => setRadius(parseInt(e.target.value))}
                                        className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer mt-1"
                                    />
                                </div>
                            </div>
                        )}
                        {error && <p className="text-xs text-red-500 mt-2 bg-red-50 p-2 rounded">{error}</p>}
                    </div>

                    <div className="mt-6 flex-1 min-h-0 flex flex-col">
                        <h3 className="text-lg font-semibold text-gray-600">Results ({filteredVoters.length})</h3>
                        <div className="mt-2 flex-1 overflow-y-auto border rounded-md p-2 bg-gray-50">
                            {filteredVoters.length > 0 ? filteredVoters.map(voter => (
                                <div key={voter.id} className="flex items-center py-1 hover:bg-gray-100 p-1 rounded">
                                    <input type="checkbox" checked={selectedVoters.includes(voter.id)} onChange={() => handleSelectVoter(voter.id)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
                                    <label className="ml-3 text-sm text-gray-700 cursor-pointer w-full" onClick={() => handleSelectVoter(voter.id)}>
                                        <span className="font-medium">{voter.firstName} {voter.lastName}</span>
                                        <span className="text-xs text-gray-400 block">{voter.city} • {voter.party}</span>
                                    </label>
                                </div>
                            )) : (
                                <p className="text-sm text-gray-500 text-center py-4">No voters match the criteria.</p>
                            )}
                        </div>
                    </div>
                     <div className="mt-4 pt-4 border-t border-gray-200">
                         <input type="text" placeholder="New Walk List Name" value={listName} onChange={(e) => setListName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md" />
                         <button onClick={handleSaveList} className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 shadow-sm">Save List & Assign</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TurfCutter;
