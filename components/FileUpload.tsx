
import React, { useState, useContext } from 'react';
import { AppContext } from './AppContext';
import { Voter, MappedHeaders, JobStatus } from '../types';
import { parseCSVLine, cleanLouisianaHeader } from '../utils/csvParser';
import { SparklesIcon, ExclamationTriangleIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

interface FileUploadProps {
    onClose: () => void;
    onComplete?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onClose, onComplete }) => {
    const context = useContext(AppContext);
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [mappedHeaders, setMappedHeaders] = useState<MappedHeaders>({});
    const [step, setStep] = useState(1);
    
    // Async Job State
    const [uploading, setUploading] = useState(false);
    const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
    const [jobId, setJobId] = useState<string | null>(null);
    
    const [previewRaw, setPreviewRaw] = useState<string[]>([]);
    const [smartMatchCount, setSmartMatchCount] = useState(0);

    const voterFields: (keyof Voter)[] = [
        'externalId', 
        'firstName', 'middleName', 'lastName', 'suffix',
        'age', 'gender', 'race', 'phone',
        'address', 'unit', 'city', 'state', 'zip', 'party'
    ];

    const runSmartMapping = (cleanedHeaders: string[]) => {
        const newMapping: MappedHeaders = {};
        let matched = 0;

        cleanedHeaders.forEach(header => {
            const h = header.toUpperCase().replace(/[^A-Z0-9]/g, '');
            let field: keyof Voter | null = null;

            if (['REGNUMBER', 'VOTERID', 'STATEID', 'VANID', 'EXTERNALID', 'ID', 'LALISTID'].includes(h)) field = 'externalId';
            else if (['FIRSTNAME', 'NAMEFIRST', 'FNAME', 'FIRST'].includes(h)) field = 'firstName';
            else if (['LASTNAME', 'NAMELAST', 'LNAME', 'LAST'].includes(h)) field = 'lastName';
            else if (['MIDDLENAME', 'NAMEMID', 'MNAME', 'MID', 'MI'].includes(h)) field = 'middleName';
            else if (['SUFFIX', 'NAMESUFFIX', 'SFX'].includes(h)) field = 'suffix';
            else if (['AGE', 'BIRTHYEAR', 'DOB'].includes(h)) field = 'age';
            else if (['GENDER', 'SEX'].includes(h)) field = 'gender';
            else if (['RACE', 'ETHNICITY'].includes(h)) field = 'race';
            else if (h.includes('PHONE') || h.includes('MOBILE') || h.includes('CELL')) field = 'phone';
            else if (['ADDRESS', 'RESADDRESS1', 'STREETADDRESS', 'ADDR1', 'RESIDENCEADDRESS', 'STREET', 'ADDRESS1'].includes(h)) field = 'address';
            else if (['UNIT', 'APT', 'APARTMENT', 'SUITE', 'ADDRESS2', 'RESADDRESS2', 'ADDR2', 'RESADDRESSLINE2'].includes(h)) field = 'unit';
            else if (['CITY', 'RESCITY', 'RESIDENCECITY'].includes(h)) field = 'city';
            else if (['STATE', 'RESSTATE', 'ST'].includes(h)) field = 'state';
            else if (['ZIP', 'ZIPCODE', 'RESZIP', 'POSTALCODE', 'ZIP5'].includes(h)) field = 'zip';
            else if (['PARTY', 'PARTYID', 'POLITICALPARTY', 'PARTYAFFILIATION'].includes(h)) field = 'party';

            if (field) {
                newMapping[header] = field;
                matched++;
            }
        });

        setMappedHeaders(newMapping);
        setSmartMatchCount(matched);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const uploadedFile = e.target.files[0];
            setFile(uploadedFile);

            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
                
                if (lines.length > 0) {
                    const rawHeaders = parseCSVLine(lines[0]);
                    setPreviewRaw(rawHeaders);
                    
                    const cleanedHeaders = rawHeaders.map(cleanLouisianaHeader);
                    setHeaders(cleanedHeaders);
                    
                    runSmartMapping(cleanedHeaders);
                    setStep(2);
                }
            };
            reader.readAsText(uploadedFile);
        }
    };

    const handleMappingChange = (csvHeader: string, voterField: keyof Voter | '') => {
        setMappedHeaders(prev => ({ ...prev, [csvHeader]: voterField }));
    };

    const pollJob = async (id: string) => {
        if (!context) return;
        
        try {
            const job = await context.client.getJob(id);
            setJobStatus(job.status);
            
            if (job.status === 'completed') {
                setUploading(false);
                if (onComplete) onComplete();
                // Don't auto close immediately so user sees success state
            } else if (job.status === 'failed') {
                setUploading(false);
                alert(`Import failed: ${job.error}`);
            } else {
                // Keep polling
                setTimeout(() => pollJob(id), 1000);
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    };

    const handleImport = async () => {
        if (!context) return;
        setUploading(true);
        setJobStatus('pending');
        
        // Mock creating voters based on schema (In real app, we'd upload the CSV)
        const mockImportedVoters: Partial<Voter>[] = Array.from({length: 25}).map((_, i) => ({
             firstName: `Imported${i}`,
             lastName: `User`,
             age: 30 + i,
             gender: i % 2 === 0 ? 'F' : 'M',
             phone: '555-0000',
             address: `100${i} Mock Lane`,
             city: `New Orleans`,
             state: 'LA',
             party: `Democrat`,
             externalId: `IMP-${Date.now()}-${i}`
        }));
        
        try {
            // Kick off Async Job
            const job = await context.client.importVoters(mockImportedVoters);
            setJobId(job.id);
            setJobStatus('pending');
            // Start Polling
            pollJob(job.id);
        } catch (e) {
            alert("Failed to start import job");
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-3xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold">Voter Importer</h2>
                    <div className="flex items-center space-x-2">
                         <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${step === 1 ? 'bg-indigo-600' : 'bg-green-500'}`}></div>
                            <span className="text-xs font-semibold text-gray-500">Upload</span>
                        </div>
                        <div className="w-8 h-0.5 bg-gray-200"></div>
                        <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${step === 2 ? (jobStatus === 'completed' ? 'bg-green-500' : 'bg-indigo-600') : 'bg-gray-300'}`}></div>
                            <span className={`text-xs font-semibold ${step === 2 ? 'text-gray-800' : 'text-gray-400'}`}>Map & Process</span>
                        </div>
                    </div>
                </div>

                {jobStatus === 'completed' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                            <CheckCircleIcon className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Import Successful!</h3>
                        <p className="text-gray-600 mb-8">Your voters have been added to the universe and indexed for search.</p>
                        <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium">Close & View Voters</button>
                    </div>
                ) : jobStatus === 'failed' ? (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="h-20 w-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <XCircleIcon className="h-10 w-10 text-red-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-800 mb-2">Import Failed</h3>
                        <p className="text-gray-600 mb-8">Something went wrong processing your file.</p>
                        <button onClick={() => { setJobStatus(null); setUploading(false); }} className="px-6 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 font-medium">Try Again</button>
                    </div>
                ) : (
                    <>
                    {step === 1 && (
                        <div className="flex-1 flex flex-col justify-center">
                            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-700 mb-4">
                                <strong>Note:</strong> Supports Louisiana-style exports. Headers like "REG_NUMBER,N,10,0" are automatically cleaned.
                            </div>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
                                <p className="mb-4 text-gray-600">Drag and drop your CSV file here, or click to browse.</p>
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label htmlFor="file-upload" className="cursor-pointer px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                                    Browse Files
                                </label>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {uploading ? (
                                <div className="flex-1 flex flex-col items-center justify-center">
                                    <ClockIcon className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
                                    <h3 className="text-xl font-bold text-gray-800">Processing Import Job</h3>
                                    <p className="text-gray-500 mt-2">Job ID: {jobId}</p>
                                    <p className="text-sm text-gray-400 mt-1">Status: {jobStatus?.toUpperCase()}...</p>
                                    <div className="w-64 bg-gray-200 rounded-full h-2.5 mt-4">
                                        <div className="bg-indigo-600 h-2.5 rounded-full w-2/3 animate-pulse"></div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex-shrink-0 mb-4">
                                        {smartMatchCount > 0 ? (
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center">
                                                <SparklesIcon className="h-5 w-5 text-green-600 mr-2" />
                                                <span className="text-sm text-green-800 font-medium">
                                                    Smart Match active! We automatically paired {smartMatchCount} fields. Please review below.
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center">
                                                <ExclamationTriangleIcon className="h-5 w-5 text-gray-400 mr-2" />
                                                <span className="text-sm text-gray-600">
                                                    We couldn't automatically match columns. Please map them manually.
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pr-4">
                                        <span className="w-5/12">CSV Column</span>
                                        <span className="w-1/12 text-center"></span>
                                        <span className="w-6/12">App Field</span>
                                    </div>

                                    <div className="flex-1 overflow-y-auto border-t border-b border-gray-100 py-4 pr-2">
                                        {headers.map((header, idx) => {
                                            const isMapped = !!mappedHeaders[header];
                                            return (
                                                <div key={idx} className={`grid grid-cols-12 gap-4 items-center mb-3 p-2 rounded-md transition-colors ${isMapped ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                                                    <div className="col-span-5">
                                                        <p className={`font-medium truncate ${isMapped ? 'text-blue-800' : 'text-gray-700'}`} title={header}>
                                                            {header}
                                                            {isMapped && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800">Mapped</span>}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 truncate mt-0.5">Sample: {previewRaw[idx]}</p>
                                                    </div>
                                                    <div className="col-span-1 text-center text-gray-400">
                                                        &rarr;
                                                    </div>
                                                    <div className="col-span-6">
                                                        <select 
                                                            onChange={(e) => handleMappingChange(header, e.target.value as keyof Voter | '')}
                                                            className={`w-full p-2 border rounded-md text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm ${isMapped ? 'border-blue-300 bg-white text-blue-900 font-semibold' : 'border-gray-300 text-gray-600'}`}
                                                            value={mappedHeaders[header] || ''}
                                                        >
                                                            <option value="">-- Ignore Column --</option>
                                                            <optgroup label="Identification">
                                                                <option value="externalId">Voter ID (External)</option>
                                                            </optgroup>
                                                            <optgroup label="Name">
                                                                <option value="firstName">First Name</option>
                                                                <option value="middleName">Middle Name</option>
                                                                <option value="lastName">Last Name</option>
                                                                <option value="suffix">Suffix</option>
                                                            </optgroup>
                                                            <optgroup label="Demographics">
                                                                <option value="age">Age</option>
                                                                <option value="gender">Gender</option>
                                                                <option value="race">Race</option>
                                                                <option value="party">Party</option>
                                                            </optgroup>
                                                            <optgroup label="Contact & Address">
                                                                <option value="phone">Phone Number</option>
                                                                <option value="address">Street Address</option>
                                                                <option value="unit">Unit / Apt</option>
                                                                <option value="city">City</option>
                                                                <option value="state">State</option>
                                                                <option value="zip">Zip Code</option>
                                                            </optgroup>
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end space-x-4 flex-shrink-0 pt-4 border-t border-gray-100">
                        {!uploading && (
                            <>
                            <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium shadow-sm">Cancel</button>
                            {step === 2 && (
                                <button 
                                    onClick={handleImport} 
                                    className={`px-6 py-2 text-white rounded-md font-medium flex items-center shadow-md transition-all bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg`}
                                >
                                    Start Import Job
                                </button>
                            )}
                            </>
                        )}
                    </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default FileUpload;
