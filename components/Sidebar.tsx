
import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { 
    HomeIcon, 
    UsersIcon, 
    MapIcon, 
    ClipboardDocumentListIcon, 
    UserGroupIcon, 
    MapPinIcon,
    UserCircleIcon,
    ShieldCheckIcon,
    IdentificationIcon
} from '@heroicons/react/24/outline';
import { AppContext } from './AppContext';
import { UserRole } from '../types';

const Sidebar: React.FC = () => {
    const context = useContext(AppContext);
    if (!context || !context.currentUser) return null;
    const { currentUser, client, refreshData, currentOrg } = context;
    const userRole = currentUser.role;

    const navLinkClasses = "flex items-center mt-4 py-2 px-6 text-gray-500 hover:bg-gray-700 hover:bg-opacity-25 hover:text-gray-100 rounded-md transition-colors";
    const activeNavLinkClasses = "bg-gray-700 bg-opacity-25 text-gray-100";

    const handleRoleSwitch = async (role: UserRole) => {
        await client.switchRole(role);
        await refreshData();
    };

    return (
        <div className="hidden md:flex flex-col w-64 bg-gray-800">
            <div className="flex items-center justify-center h-16 bg-gray-900 border-b border-gray-700 flex-col">
                <span className="text-white font-bold uppercase text-lg tracking-wider">VoterField</span>
                <span className="text-[10px] text-gray-500">{currentOrg?.name}</span>
            </div>
            
            <div className="px-6 py-4 border-b border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-400 uppercase font-semibold mb-2">
                    <span>Current Role</span>
                    {userRole === 'admin' ? <ShieldCheckIcon className="h-4 w-4 text-green-500" /> : <IdentificationIcon className="h-4 w-4 text-blue-400" />}
                </div>
                <div className="flex bg-gray-700 rounded-lg p-1">
                    <button 
                        onClick={() => handleRoleSwitch('admin')}
                        className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${userRole === 'admin' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Admin
                    </button>
                    <button 
                        onClick={() => handleRoleSwitch('canvasser')}
                        className={`flex-1 py-1.5 px-2 text-xs font-medium rounded-md transition-all ${userRole === 'canvasser' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Canvasser
                    </button>
                </div>
                <p className="mt-2 text-[10px] text-gray-500 italic">
                    {userRole === 'admin' ? 'Viewing as Super Admin' : `Logged in as: ${currentUser.name}`}
                </p>
            </div>

            <div className="flex flex-col flex-1 overflow-y-auto">
                <nav className="flex-1 px-2 py-4 bg-gray-800">
                    <NavLink to="/dashboard" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                        <HomeIcon className="h-6 w-6 mr-3" />
                        Dashboard
                    </NavLink>

                    {userRole === 'admin' ? (
                        <>
                            <div className="mt-6 px-6 text-xs text-gray-500 uppercase font-bold tracking-wider">Campaign Ops</div>
                            <NavLink to="/voters" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <UsersIcon className="h-6 w-6 mr-3" />
                                Voter Universe
                            </NavLink>
                            <NavLink to="/turf" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapIcon className="h-6 w-6 mr-3" />
                                Turf Cutter
                            </NavLink>
                            <NavLink to="/assignments" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <ClipboardDocumentListIcon className="h-6 w-6 mr-3" />
                                List Assignments
                            </NavLink>
                            
                            <div className="mt-6 px-6 text-xs text-gray-500 uppercase font-bold tracking-wider">Field Management</div>
                            <NavLink to="/canvassers" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <UserGroupIcon className="h-6 w-6 mr-3" />
                                Canvassers
                            </NavLink>
                            <NavLink to="/live" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapPinIcon className="h-6 w-6 mr-3" />
                                Live Tracking
                            </NavLink>
                        </>
                    ) : (
                        <>
                            <div className="mt-6 px-6 text-xs text-gray-500 uppercase font-bold tracking-wider">My Work</div>
                            <NavLink to="/my-turf" className={({ isActive }) => isActive ? `${navLinkClasses} ${activeNavLinkClasses}` : navLinkClasses}>
                                <MapIcon className="h-6 w-6 mr-3" />
                                My Assigned Turf
                            </NavLink>
                        </>
                    )}
                </nav>
            </div>
            
            <div className="p-4 border-t border-gray-700 bg-gray-900 bg-opacity-50">
                <div className="flex items-center">
                    <UserCircleIcon className="h-8 w-8 text-gray-400 mr-3" />
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;
