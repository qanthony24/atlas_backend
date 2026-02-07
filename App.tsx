
import React from 'react';
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import spec from './openapi.yaml'; // Vite handles yaml import as object usually, or we pass string

// Simple text fallback if yaml loader isn't configured in this environment
const LoadingPreview = () => (
    <div className="p-10 text-center">
        <h1 className="text-3xl font-bold mb-4">VoterField Backend Service</h1>
        <p className="text-gray-600">The backend code has been generated in <code>/backend</code>.</p>
        <p className="text-gray-500 mt-2">See <code>openapi.yaml</code> for the API Contract.</p>
    </div>
);

const App: React.FC = () => {
    // We attempt to load the Swagger UI to prove the contract exists (Step 1)
    return (
        <div className="h-screen flex flex-col">
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
                <div>
                    <h1 className="font-bold text-lg">VoterField Developer Portal</h1>
                    <p className="text-xs text-gray-400">Phase 2: Backend Implementation</p>
                </div>
                <div className="text-xs bg-indigo-600 px-3 py-1 rounded">
                    Status: Building
                </div>
            </div>
            <div className="flex-1 overflow-auto">
                <SwaggerUI url="/openapi.yaml" fallback={<LoadingPreview />} />
            </div>
        </div>
    );
};

export default App;
