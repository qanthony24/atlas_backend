
import React, { useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { Voter } from '../types';
import { XMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';

interface AddVoterModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

const AddVoterModal: React.FC<AddVoterModalProps> = ({ onClose, onSuccess }) => {
    const context = useContext(AppContext);
    const [formData, setFormData] = useState<Partial<Voter>>({
        firstName: '',
        lastName: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        party: 'Unenrolled',
        phone: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (field: keyof Voter, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (error) setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.firstName || !formData.lastName || !formData.address) {
            setError('First Name, Last Name, and Address are required.');
            return;
        }

        if (!context) return;

        setSaving(true);
        try {
            await context.client.addVoter(formData);
            onSuccess();
        } catch (err: any) {
            console.error("Failed to add voter", err);
            setError(err.message || 'Failed to create voter record.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center">
                        <div className="p-2 bg-indigo-100 rounded-full mr-3">
                            <UserPlusIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">Add New Voter</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">First Name <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.firstName}
                                onChange={e => handleChange('firstName', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Last Name <span className="text-red-500">*</span></label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.lastName}
                                onChange={e => handleChange('lastName', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Street Address <span className="text-red-500">*</span></label>
                        <input 
                            type="text"
                            placeholder="123 Main St"
                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            value={formData.address}
                            onChange={e => handleChange('address', e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">City</label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.city}
                                onChange={e => handleChange('city', e.target.value)}
                            />
                        </div>
                        <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">State</label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.state}
                                onChange={e => handleChange('state', e.target.value)}
                            />
                        </div>
                         <div className="col-span-1">
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Zip</label>
                            <input 
                                type="text"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.zip}
                                onChange={e => handleChange('zip', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Party</label>
                            <select 
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.party}
                                onChange={e => handleChange('party', e.target.value)}
                            >
                                <option value="Unenrolled">Unenrolled</option>
                                <option value="Democrat">Democrat</option>
                                <option value="Republican">Republican</option>
                                <option value="Independent">Independent</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Phone (Optional)</label>
                            <input 
                                type="tel"
                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                value={formData.phone}
                                onChange={e => handleChange('phone', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium shadow-sm flex items-center"
                        >
                            {saving ? 'Adding...' : 'Add Voter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddVoterModal;
