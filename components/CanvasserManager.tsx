
import React, { useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { User } from '../types';

const CanvasserManager: React.FC = () => {
    const context = useContext(AppContext);
    const [showModal, setShowModal] = useState(false);
    const [newCanvasser, setNewCanvasser] = useState({ name: '', email: '', phone: '' });

    if (!context) return null;
    const { canvassers, client, refreshData } = context;

    const handleAddCanvasser = async () => {
        if (newCanvasser.name && newCanvasser.email) {
            try {
                await client.addCanvasser(newCanvasser);
                await refreshData();
                setShowModal(false);
                setNewCanvasser({ name: '', email: '', phone: '' });
            } catch (e) {
                alert("Failed to add user");
            }
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-semibold text-gray-800">Canvasser Management</h1>
                <button 
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                    Add Canvasser
                </button>
            </div>
            
            <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {canvassers.map(canvasser => (
                          <tr key={canvasser.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{canvasser.name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{canvasser.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{canvasser.phone}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <a href="#" className="text-indigo-600 hover:text-indigo-900">Edit</a>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
                    <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Add New Canvasser</h2>
                        <div className="space-y-4">
                            <input type="text" placeholder="Name" value={newCanvasser.name} onChange={e => setNewCanvasser({...newCanvasser, name: e.target.value})} className="w-full p-2 border rounded" />
                            <input type="email" placeholder="Email" value={newCanvasser.email} onChange={e => setNewCanvasser({...newCanvasser, email: e.target.value})} className="w-full p-2 border rounded" />
                            <input type="tel" placeholder="Phone" value={newCanvasser.phone} onChange={e => setNewCanvasser({...newCanvasser, phone: e.target.value})} className="w-full p-2 border rounded" />
                        </div>
                        <div className="mt-6 flex justify-end space-x-4">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                            <button onClick={handleAddCanvasser} className="px-4 py-2 bg-indigo-600 text-white rounded-md">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CanvasserManager;
