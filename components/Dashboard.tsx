
import React, { useContext } from 'react';
import { AppContext } from './AppContext';
import { ChartBarIcon, DocumentTextIcon, UserGroupIcon, CheckCircleIcon, TrophyIcon, RocketLaunchIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color?: string }> = ({ title, value, icon, color = 'bg-indigo-500' }) => (
    <div className="bg-white rounded-lg shadow-md p-6 flex items-center transition-transform hover:scale-[1.02]">
        <div className={`${color} rounded-full p-3 text-white`}>
            {icon}
        </div>
        <div className="ml-4">
            <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);


const Dashboard: React.FC = () => {
    const context = useContext(AppContext);
    if (!context || !context.currentUser) return null;

    const { voters, walkLists, canvassers, interactions, assignments, currentUser } = context;
    
    // Logic for Admin
    const globalCanvassedCount = interactions.filter(i => i.result_code === 'contacted').length;
    const globalCompletionPercentage = voters.length > 0 ? ((globalCanvassedCount / voters.length) * 100).toFixed(1) : 0;

    // Logic for Canvasser
    const myAssignmentIds = assignments.filter(a => a.canvasserId === currentUser.id).map(a => a.listId);
    const myAssignedLists = walkLists.filter(list => myAssignmentIds.includes(list.id));
    const myInteractions = interactions.filter(i => i.user_id === currentUser.id);
    const myCanvassedCount = myInteractions.filter(i => i.result_code === 'contacted').length;
    
    const totalVotersInMyLists = voters.filter(v => 
        myAssignedLists.some(list => list.voterIds.includes(v.id))
    ).length;
    const myCompletionPercentage = totalVotersInMyLists > 0 ? ((myCanvassedCount / totalVotersInMyLists) * 100).toFixed(1) : 0;

    if (currentUser.role === 'canvasser') {
        return (
            <div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">My Performance</h1>
                        <p className="mt-2 text-gray-600">Great job today! Here is your impact on the campaign.</p>
                    </div>
                    <Link to="/my-turf" className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow-sm font-medium">
                        <RocketLaunchIcon className="h-5 w-5 mr-2" />
                        Start Canvassing
                    </Link>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="My Assigned Lists" value={myAssignedLists.length} icon={<DocumentTextIcon className="h-8 w-8" />} color="bg-blue-500" />
                    <StatCard title="Total Doors Knocked" value={myInteractions.length} icon={<ChartBarIcon className="h-8 w-8" />} color="bg-amber-500" />
                    <StatCard title="Successful IDs" value={myCanvassedCount} icon={<TrophyIcon className="h-8 w-8" />} color="bg-green-500" />
                    <StatCard title="My Progress" value={`${myCompletionPercentage}%`} icon={<CheckCircleIcon className="h-8 w-8" />} color="bg-indigo-500" />
                </div>

                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <DocumentTextIcon className="h-5 w-5 mr-2 text-indigo-500" />
                            My Active Walk Lists
                        </h2>
                        <div className="mt-6 space-y-6">
                            {myAssignedLists.length > 0 ? myAssignedLists.map(list => {
                                const assignment = assignments.find(a => a.listId === list.id);
                                // Calculate progress for this list
                                const listVoterIds = list.voterIds;
                                const interactionsInList = myInteractions.filter(i => 
                                    assignment && i.assignment_id === assignment.id
                                ).length;
                                
                                const progress = listVoterIds.length > 0 ? Math.round((interactionsInList / listVoterIds.length) * 100) : 0;
                                return (
                                    <div key={list.id} className="group">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-base font-semibold text-gray-700">{list.name}</span>
                                            <span className="text-sm font-bold text-indigo-600">{progress}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-3">
                                            <div className="bg-indigo-500 h-3 rounded-full transition-all duration-700 shadow-inner" style={{ width: `${progress}%` }}></div>
                                        </div>
                                        <div className="mt-2 flex justify-between text-xs text-gray-400 font-medium">
                                            <span>{interactionsInList} of {list.voterIds.length} voters contacted</span>
                                            <Link to="/my-turf" className="text-indigo-500 hover:text-indigo-700">Open Map &rarr;</Link>
                                        </div>
                                    </div>
                                )
                            }) : (
                                <p className="text-gray-500 italic text-center py-10 border-2 border-dashed rounded-lg">No walk lists currently assigned to you.</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-amber-500">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                            <ChartBarIcon className="h-5 w-5 mr-2 text-amber-500" />
                            Recent Activity
                        </h2>
                        <div className="mt-6 overflow-hidden">
                             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                                {myInteractions.length > 0 ? myInteractions.slice().reverse().map(interaction => {
                                    const voter = voters.find(v => v.id === interaction.voter_id);
                                    return (
                                        <div key={interaction.id} className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-amber-50 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{voter ? `${voter.firstName} ${voter.lastName}` : 'Unknown Voter'}</p>
                                                    <p className="text-xs text-gray-500">{voter?.address}</p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-tighter ${
                                                    interaction.result_code === 'contacted' ? 'bg-green-100 text-green-700' :
                                                    interaction.result_code === 'not_home' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {interaction.result_code.replace('_', ' ')}
                                                </span>
                                            </div>
                                            {interaction.notes && <p className="mt-2 text-xs text-gray-600 italic">"{interaction.notes}"</p>}
                                        </div>
                                    )
                                }) : (
                                     <p className="text-gray-500 italic text-center py-10 border-2 border-dashed rounded-lg">No interactions recorded yet.</p>
                                )}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800">Campaign Overview</h1>
            <p className="mt-2 text-gray-600">Welcome, Administrator! Real-time operation stats across all regions.</p>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Voters" value={voters.length} icon={<UserGroupIcon className="h-8 w-8" />} />
                <StatCard title="Active Walk Lists" value={walkLists.length} icon={<DocumentTextIcon className="h-8 w-8" />} />
                <StatCard title="Doors Knocked" value={interactions.length} icon={<ChartBarIcon className="h-8 w-8" />} />
                <StatCard title="Total Progress" value={`${globalCompletionPercentage}%`} icon={<CheckCircleIcon className="h-8 w-8" />} />
            </div>

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wide">Live Interaction Stream</h2>
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    </div>
                     <div className="p-0">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-100">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Voter</th>
                              <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Outcome</th>
                              <th scope="col" className="px-6 py-3 text-left text-[10px] font-bold text-gray-500 uppercase">Field Rep</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {interactions.slice(-6).reverse().map(interaction => {
                                const voter = voters.find(v => v.id === interaction.voter_id);
                                const canvasser = canvassers.find(c => c.id === interaction.user_id);
                                return (
                                    <tr key={interaction.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{voter ? `${voter.firstName} ${voter.lastName}` : 'N/A'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs">
                                             <span className={`px-2 py-0.5 rounded-full font-medium ${
                                                interaction.result_code === 'contacted' ? 'bg-green-100 text-green-700' :
                                                interaction.result_code === 'not_home' ? 'bg-yellow-100 text-yellow-700' :
                                                interaction.result_code === 'refused' ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                                {interaction.result_code.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{canvasser ? canvasser.name : 'N/A'}</td>
                                    </tr>
                                )
                            })}
                          </tbody>
                        </table>
                        <div className="p-4 text-center border-t border-gray-200">
                            <Link to="/live" className="text-indigo-600 text-sm font-semibold hover:underline">View Live Map &rarr;</Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wide mb-6">Regional Turf Progress</h2>
                    <div className="space-y-6">
                        {walkLists.map(list => {
                            // Find interactions associated with this list via assignment
                            const assignment = assignments.find(a => a.listId === list.id);
                            // In real core, we might query based on list_id directly if interaction has it
                            const listInteractions = interactions.filter(i => 
                                assignment && i.assignment_id === assignment.id
                            ).length;
                            
                            const progress = list.voterIds.length > 0 ? Math.round((listInteractions / list.voterIds.length) * 100) : 0;
                            return (
                                <div key={list.id}>
                                    <div className="flex justify-between mb-2 items-center">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-800">{list.name}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{list.voterIds.length} Targeted Voters</span>
                                        </div>
                                        <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-2 py-1 rounded">{progress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2">
                                        <div className="bg-indigo-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
