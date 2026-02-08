
import React, { useState, useContext, useMemo } from 'react';
import { Voter } from '../types';
import { AppContext } from './AppContext';
import { XMarkIcon, PencilSquareIcon, CheckIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';

interface VoterDetailModalProps {
    voter: Voter;
    onClose: () => void;
}

const VoterDetailModal: React.FC<VoterDetailModalProps> = ({ voter, onClose }) => {
    const context = useContext(AppContext);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<Voter>>({ ...voter });
    const [saving, setSaving] = useState(false);

    if (!context) return null;
    const { client, interactions, refreshData, canvassers } = context;

    // Get interactions specific to this voter for the history timeline
    const history = useMemo(() => {
        return interactions
            .filter(i => i.voter_id === voter.id)
            .sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());
    }, [interactions, voter.id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await client.updateVoter(voter.id, formData);
            await refreshData();
            setIsEditing(false);
        } catch (e) {
            console.error("Failed to update voter", e);
            alert("Failed to save changes");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field: keyof Voter, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">
                            {isEditing ? 'Edit Voter Profile' : `${voter.firstName} ${voter.lastName}`}
                        </h2>
                        <p className="text-sm text-gray-400">ID: {voter.externalId}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        {!isEditing ? (
                            <button onClick={() => setIsEditing(true)} className="flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium">
                                <PencilSquareIcon className="h-4 w-4 mr-2" /> Edit
                            </button>
                        ) : (
                            <button onClick={handleSave} disabled={saving} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium">
                                {saving ? 'Saving...' : <><CheckIcon className="h-4 w-4 mr-2" /> Save</>}
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Left Column: Demographics & Info */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Basic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {isEditing ? (
                                        <>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                                                <input className="w-full p-2 border rounded" value={formData.firstName || ''} onChange={e => handleChange('firstName', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                                                <input className="w-full p-2 border rounded" value={formData.lastName || ''} onChange={e => handleChange('lastName', e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Age</label>
                                                <input className="w-full p-2 border rounded" type="number" value={formData.age || ''} onChange={e => handleChange('age', parseInt(e.target.value))} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Gender</label>
                                                <select className="w-full p-2 border rounded" value={formData.gender || ''} onChange={e => handleChange('gender', e.target.value)}>
                                                    <option value="M">Male</option>
                                                    <option value="F">Female</option>
                                                    <option value="NB">Non-Binary</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Party</label>
                                                <select className="w-full p-2 border rounded" value={formData.party || ''} onChange={e => handleChange('party', e.target.value)}>
                                                    <option value="Democrat">Democrat</option>
                                                    <option value="Republican">Republican</option>
                                                    <option value="Independent">Independent</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Phone</label>
                                                <input className="w-full p-2 border rounded" value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} />
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <span className="block text-xs text-gray-400">Full Name</span>
                                                <span className="font-medium text-gray-800">{voter.firstName} {voter.middleName} {voter.lastName} {voter.suffix}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Party</span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${voter.party === 'Democrat' ? 'bg-blue-100 text-blue-800' : voter.party === 'Republican' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                                                    {voter.party || 'Unenrolled'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Age / Gender</span>
                                                <span className="font-medium text-gray-800">{voter.age || 'N/A'} / {voter.gender || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Race</span>
                                                <span className="font-medium text-gray-800">{voter.race || 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-xs text-gray-400">Phone</span>
                                                <span className="font-medium text-gray-800">{voter.phone || 'N/A'}</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Address</h3>
                                {isEditing ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        <input className="w-full p-2 border rounded" placeholder="Address Line 1" value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} />
                                        <div className="grid grid-cols-3 gap-3">
                                            <input className="p-2 border rounded" placeholder="City" value={formData.city || ''} onChange={e => handleChange('city', e.target.value)} />
                                            <input className="p-2 border rounded" placeholder="State" value={formData.state || ''} onChange={e => handleChange('state', e.target.value)} />
                                            <input className="p-2 border rounded" placeholder="Zip" value={formData.zip || ''} onChange={e => handleChange('zip', e.target.value)} />
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="font-medium text-gray-800">{voter.address} {voter.unit}</p>
                                        <p className="text-gray-600">{voter.city}, {voter.state} {voter.zip}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Column: Interaction History */}
                        <div className="lg:col-span-1 border-l border-gray-100 pl-0 lg:pl-8">
                            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center">
                                <ClockIcon className="h-4 w-4 mr-2" />
                                Campaign History
                            </h3>
                            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                {history.length > 0 ? history.map(interaction => {
                                    const canvasser = canvassers.find(c => c.id === interaction.user_id);
                                    return (
                                        <div key={interaction.id} className="relative pl-8 group">
                                            <div className="flex flex-col sm:flex-row items-start mb-1 group-last:before:hidden before:absolute before:left-2 before:h-full before:px-px before:bg-slate-200 sm:before:ml-[0.5rem] before:self-start before:-translate-x-1/2 before:translate-y-3 after:absolute after:left-2 after:w-2 after:h-2 after:bg-indigo-600 after:border-4 after:box-content after:border-slate-50 after:rounded-full after:-translate-x-1/2 after:translate-y-1.5">
                                                <time className="sm:absolute left-0 translate-y-0.5 inline-flex items-center justify-center text-xs font-semibold uppercase w-20 h-6 mb-3 sm:mb-0 text-indigo-600 bg-indigo-100 rounded-full">
                                                    {new Date(interaction.occurred_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </time>
                                                <div className="text-xs font-normal text-slate-500 sm:ml-24">
                                                    {new Date(interaction.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-sm sm:ml-20">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                                        interaction.result_code === 'contacted' ? 'bg-green-100 text-green-700' : 
                                                        interaction.result_code === 'not_home' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {interaction.result_code.replace('_', ' ')}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 flex items-center">
                                                        <UserIcon className="h-3 w-3 mr-1" />
                                                        {canvasser?.name || 'Unknown'}
                                                    </span>
                                                </div>
                                                {interaction.notes && (
                                                    <p className="text-xs text-gray-600 italic mt-2">
                                                        "{interaction.notes}"
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="pl-8 text-sm text-gray-400 italic">No history recorded yet.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoterDetailModal;
