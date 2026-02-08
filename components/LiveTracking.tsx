
import React, { useContext, useEffect, useRef } from 'react';
import { AppContext } from './AppContext';
import { useGeolocation } from '../hooks/useGeolocation';

declare const google: any;

const LiveTracking: React.FC = () => {
    const context = useContext(AppContext);
    const { location, getLocation } = useGeolocation();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    
    useEffect(() => {
        getLocation();
    }, [getLocation]);

    // Initialize Map
    useEffect(() => {
        if (mapRef.current && !mapInstance.current && typeof google !== 'undefined') {
            mapInstance.current = new google.maps.Map(mapRef.current, {
                center: { lat: 40.730610, lng: -73.935242 }, // Default to NYC area
                zoom: 11,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                styles: [
                    { featureType: "poi", stylers: [{ visibility: "off" }] }
                ]
            });
        }
    }, []);

    if (!context) return null;
    const { interactions, voters, canvassers } = context;

    // Update Markers
    useEffect(() => {
        if (!mapInstance.current || typeof google === 'undefined') return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.setMap(null));
        markersRef.current = [];

        const bounds = new google.maps.LatLngBounds();
        let hasPoints = false;

        // 1. Plot Canvassers (Blue)
        canvassers.forEach(c => {
            if (c.location) {
                const marker = new google.maps.Marker({
                    position: c.location,
                    map: mapInstance.current,
                    title: c.name,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 8,
                        fillColor: "#3B82F6", // Blue-500
                        fillOpacity: 1,
                        strokeWeight: 2,
                        strokeColor: "#FFFFFF",
                    }
                });
                
                // Info Window
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="padding:4px; font-weight:bold;">${c.name}</div>`
                });
                marker.addListener("click", () => infoWindow.open(mapInstance.current, marker));

                markersRef.current.push(marker);
                bounds.extend(c.location);
                hasPoints = true;
            }
        });

        // 2. Plot Current User (Red Pulse)
        if (location) {
             const marker = new google.maps.Marker({
                position: location,
                map: mapInstance.current,
                title: "You",
                zIndex: 999,
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 10,
                    fillColor: "#EF4444", // Red-500
                    fillOpacity: 1,
                    strokeWeight: 3,
                    strokeColor: "#FFFFFF",
                }
            });
            markersRef.current.push(marker);
            bounds.extend(location);
            hasPoints = true;
        }

        // Fit bounds if we have points, otherwise stay at default
        if (hasPoints) {
            mapInstance.current.fitBounds(bounds);
            // Don't zoom in too close automatically
            const listener = google.maps.event.addListener(mapInstance.current, "idle", () => { 
                if (mapInstance.current.getZoom() > 15) mapInstance.current.setZoom(15); 
                google.maps.event.removeListener(listener); 
            });
        }

    }, [canvassers, location]);


    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            <h1 className="text-3xl font-semibold text-gray-800 flex-shrink-0 mb-6">Real-Time Monitoring</h1>
            
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0">
                {/* Live Map */}
                <div className="lg:col-span-2 bg-white rounded-lg shadow-md flex flex-col overflow-hidden relative">
                    <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-2 rounded-md shadow-sm border border-gray-200">
                        <h2 className="text-sm font-bold text-gray-700">Live Field View</h2>
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                            <div className="flex items-center"><span className="w-2 h-2 bg-blue-500 rounded-full mr-1"></span> Canvasser</div>
                            <div className="flex items-center"><span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span> You</div>
                        </div>
                    </div>
                    <div ref={mapRef} className="flex-1 w-full h-full bg-gray-100" />
                </div>

                {/* Live Interaction Feed */}
                <div className="bg-white p-6 rounded-lg shadow-md flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <h2 className="text-xl font-semibold text-gray-700">Live Feed</h2>
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                    </div>
                    <div className="space-y-4 overflow-y-auto flex-1 pr-2">
                        {interactions.slice().reverse().map(interaction => {
                            const voter = voters.find(v => v.id === interaction.voter_id);
                            const canvasser = canvassers.find(c => c.id === interaction.user_id);
                            return (
                                <div key={interaction.id} className="p-3 bg-gray-50 rounded-md border border-gray-200 transition-all hover:bg-gray-100">
                                    <div className="flex justify-between items-start">
                                        <p className="text-sm text-gray-800 font-bold">
                                            {canvasser?.name || 'Unknown'}
                                        </p>
                                        <span className="text-[10px] text-gray-400">Just now</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Recorded <span className={`font-bold uppercase ${
                                            interaction.result_code === 'contacted' ? 'text-green-600' : 
                                            interaction.result_code === 'not_home' ? 'text-amber-600' : 'text-red-600'
                                        }`}>{interaction.result_code.replace('_', ' ')}</span> 
                                        {' '}for {voter?.firstName} {voter?.lastName}
                                    </p>
                                    {interaction.notes && <p className="text-xs text-gray-500 mt-2 italic bg-white p-1.5 rounded border border-gray-100">"{interaction.notes}"</p>}
                                </div>
                            );
                        })}
                        {interactions.length === 0 && (
                            <p className="text-center text-gray-400 text-sm mt-10">Waiting for field activity...</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveTracking;
