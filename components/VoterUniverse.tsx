
import React, { useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { Voter } from '../types';
import FileUpload from './FileUpload';
import VoterDetailModal from './VoterDetailModal';
import AddVoterModal from './AddVoterModal';
import { PlusIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

const VoterUniverse: React.FC = () => {
    const context = useContext(AppContext);
    const [showImporter, setShowImporter] = useState(false);
    const [showAddVoter, setShowAddVoter] = useState(false);
    const [selectedVoter, setSelectedVoter] = useState<Voter | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    if (!context) return null;
    const { voters, refreshData } = context;

    const filteredVoters = voters.filter(voter => 
        `${voter.firstName} ${voter.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        voter.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleImportComplete = async () => {
        await refreshData();
        setShowImporter(false);
    };

    const handleAddComplete = async () => {
        await refreshData();
        setShowAddVoter(false);
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-semibold text-gray-800">Voter Universe</h1>
                <div className="flex space-x-3">
                    <button 
                        onClick={() => setShowAddVoter(true)}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-medium"
                    >
                        <PlusIcon className="h-5 w-5 mr-2 text-gray-500" />
                        Add Voter
                    </button>
                    <button 
                        onClick={() => setShowImporter(true)}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 font-medium shadow-sm"
                    >
                        <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
                        Import CSV
                    </button>
                </div>
            </div>

            {showImporter && <FileUpload onClose={() => setShowImporter(false)} onComplete={handleImportComplete} />}
            {showAddVoter && <AddVoterModal onClose={() => setShowAddVoter(false)} onSuccess={handleAddComplete} />}
            {selectedVoter && <VoterDetailModal voter={selectedVoter} onClose={() => setSelectedVoter(null)} />}
            
            <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <input 
                        type="text"
                        placeholder="Search by name or address..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Demographics</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Address</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Party</th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredVoters.map((voter) => (
                          <tr 
                            key={voter.id} 
                            onClick={() => setSelectedVoter(voter)}
                            className="hover:bg-indigo-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{voter.firstName} {voter.middleName} {voter.lastName} {voter.suffix}</div>
                                <div className="text-xs text-gray-400">ID: {voter.externalId}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {voter.age && <span className="mr-2">{voter.age}yo</span>}
                                {voter.gender && <span className="mr-2">{voter.gender}</span>}
                                {voter.race && <span className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{voter.race}</span>}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div>{voter.address} {voter.unit}</div>
                                <div className="text-xs text-gray-400">{voter.city}, {voter.state} {voter.zip}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    voter.party === 'Democrat' ? 'bg-blue-100 text-blue-800' :
                                    voter.party === 'Republican' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {voter.party}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                    voter.lastInteractionStatus === 'contacted' ? 'bg-green-100 text-green-800' :
                                    voter.lastInteractionStatus === 'not_home' ? 'bg-yellow-100 text-yellow-800' :
                                    voter.lastInteractionStatus === 'refused' ? 'bg-red-100 text-red-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {voter.lastInteractionStatus ? voter.lastInteractionStatus.replace('_', ' ') : 'Pending'}
                                </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default VoterUniverse;
