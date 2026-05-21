import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import { UserPlus, Search, AlertCircle } from 'lucide-react';

const PatientRegistration = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [importingUuid, setImportingUuid] = useState(null);

  const trimmedSearch = searchQuery.trim();
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const { register: registerVisit, handleSubmit: handleVisitSubmit, formState: { errors: visitErrors } } = useForm();

  // Search patients
  const { data: localResults = [], isLoading: localSearching, refetch: refetchLocal } = useQuery(
    ['patient-search', trimmedSearch],
    async () => {
      if (trimmedSearch.length <= 2) return [];
      const response = await api.get(`/patients?search=${encodeURIComponent(trimmedSearch)}`);
      return response.data?.data ?? [];
    },
    {
      enabled: trimmedSearch.length > 2,
      keepPreviousData: false,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  const {
    data: registryResults = [],
    isLoading: registrySearching,
    error: registryError,
    refetch: refetchRegistry,
  } = useQuery(
    ['hie-patient-search', trimmedSearch],
    async () => {
      if (trimmedSearch.length <= 2) return [];
      const response = await api.post('/hie/search-patient', {
        query: trimmedSearch,
        limit: 10,
      });
      return response.data?.data ?? [];
    },
    {
      enabled: trimmedSearch.length > 2,
      keepPreviousData: false,
      staleTime: 0,
      cacheTime: 0,
      retry: false,
    }
  );

  useEffect(() => {
    if (registryError) {
      toast.error('Failed to search patient registry');
    }
  }, [registryError]);

  // Create new patient mutation
  const createPatient = useMutation(
    (data) => api.post('/patients', data),
    {
      onSuccess: (response) => {
        toast.success('Patient registered successfully');
        const patientData = response.data?.patient ?? response.data;
        setSelectedPatient(patientData);
        setShowNewPatientForm(false);
        reset();
        queryClient.invalidateQueries({ queryKey: ['patient-search'] });
      },
      onError: () => {
        toast.error('Failed to register patient');
      }
    }
  );

  const syncPatientFromHIE = useMutation(
    (registryUuid) => api.post('/hie/sync-patient', { registry_uuid: registryUuid }),
    {
      onMutate: (registryUuid) => {
        setImportingUuid(registryUuid);
      },
      onSuccess: (response) => {
        const patientData = response.data?.patient ?? response.data;
        setSelectedPatient(patientData);
        setShowNewPatientForm(false);
        toast.success('Patient synced from Patient Registry');
        queryClient.invalidateQueries(['patient-search']);
      },
      onError: () => {
        toast.error('Failed to sync patient from HIE');
      },
      onSettled: () => {
        setImportingUuid(null);
      }
    }
  );

  // Create ER visit mutation
  const createVisit = useMutation(
    (data) => api.post('/er-visits', data),
    {
      onSuccess: (response) => {
        toast.success('ER visit created successfully');
        navigate(`/visits/${response.data.visit_id}`);
      },
      onError: () => {
        toast.error('Failed to create ER visit');
      }
    }
  );

  const onSubmitPatient = (data) => {
    // Generate patient ID (in production, this would come from HIS)
    data.patient_id = 'PAT' + Date.now();
    createPatient.mutate(data);
  };

  const onSubmitVisit = (data) => {
    if (!selectedPatient) {
      toast.error('Please select a patient first');
      return;
    }
    data.patient_id = selectedPatient.patient_id;
    createVisit.mutate(data);
  };

  const handleSelectLocalPatient = (patient) => {
    setSelectedPatient(patient);
    setShowNewPatientForm(false);
  };

  const handleImportRegistryPatient = (registryUuid) => {
    syncPatientFromHIE.mutate(registryUuid);
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Patient Registration & ER Admission</h1>
        <p className="mt-2 text-sm text-gray-600">Register new patients or admit existing patients to the emergency room</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Patient Search/Registration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Step 1: Patient Information</h2>
          
          {/* Search existing patients */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Existing Patient
            </label>
            <div className="flex">
              <input
                type="text"
                className="flex-1 rounded-l-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter patient name, ID, or HIS ID"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search results */}
          {(localSearching || registrySearching) && <p className="text-sm text-gray-500">Searching...</p>}
          {trimmedSearch.length > 2 && !localSearching && !registrySearching && localResults.length === 0 && registryResults.length === 0 && (
            <p className="text-sm text-gray-500">No matches found locally or in the patient registry.</p>
          )}
          {(localResults.length > 0 || registryResults.length > 0) && (
            <div className="mb-6 border rounded-md divide-y">
              {localResults.map((patient) => (
                <button
                  key={patient.patient_id}
                  onClick={() => handleSelectLocalPatient(patient)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                    selectedPatient?.patient_id === patient.patient_id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {patient.first_name} {patient.last_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    ID: {patient.patient_id} | {patient.sex} | DOB: {patient.birthday}
                  </div>
                </button>
              ))}

              {registryResults.length > 0 && (
                <div className="bg-gray-50 px-4 py-2">
                  <p className="text-xs uppercase font-semibold text-gray-500 tracking-wide">
                    Patient Registry Matches
                  </p>
                </div>
              )}

              {registryResults.map((match) => (
                <div
                  key={match?.registry?.patient_id}
                  className="px-4 py-3 bg-white flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {match?.registry?.first_name} {match?.registry?.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        UUID: {match?.registry?.patient_id}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {match?.registry?.sex} | DOB: {match?.registry?.date_of_birth}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {match?.has_local_record && match?.local ? (
                        <button
                          onClick={() => handleSelectLocalPatient(match.local)}
                          className="text-xs font-medium text-blue-600 hover:text-blue-800"
                        >
                          View local record
                        </button>
                      ) : (
                        <button
                          onClick={() => handleImportRegistryPatient(match?.registry?.patient_id)}
                          disabled={importingUuid === match?.registry?.patient_id}
                          className="inline-flex items-center px-3 py-1.5 border border-blue-600 text-xs font-medium rounded-md text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                        >
                          {importingUuid === match?.registry?.patient_id ? 'Importing...' : 'Import patient'}
                        </button>
                      )}
                    </div>
                  </div>

                  {match?.registry?.matched_by && (
                    <p className="text-xs text-gray-400">
                      Matched by: {match.registry.matched_by}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* New patient registration toggle */}
          <button
            onClick={() => setShowNewPatientForm(!showNewPatientForm)}
            className="mb-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showNewPatientForm ? '← Back to search' : '+ Register new patient'}
          </button>

          {/* New patient form */}
          {showNewPatientForm && (
            <form onSubmit={handleSubmit(onSubmitPatient)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name*
                  </label>
                  <input
                    {...register('first_name', { required: 'First name is required' })}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name*
                  </label>
                  <input
                    {...register('last_name', { required: 'Last name is required' })}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  {...register('middle_name')}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sex*
                  </label>
                  <select
                    {...register('sex', { required: 'Sex is required' })}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Select...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {errors.sex && (
                    <p className="mt-1 text-sm text-red-600">{errors.sex.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth*
                  </label>
                  <input
                    type="date"
                    {...register('birthday', { required: 'Date of birth is required' })}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  {errors.birthday && (
                    <p className="mt-1 text-sm text-red-600">{errors.birthday.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number
                </label>
                <input
                  {...register('contact_number')}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  {...register('address')}
                  rows={2}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Name
                  </label>
                  <input
                    {...register('emergency_contact_name')}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Emergency Contact Number
                  </label>
                  <input
                    {...register('emergency_contact_number')}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={createPatient.isLoading}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createPatient.isLoading ? 'Registering...' : 'Register Patient'}
              </button>
            </form>
          )}

          {/* Selected patient display */}
          {selectedPatient && !showNewPatientForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-start">
                <UserPlus className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-900">Selected Patient</h3>
                  <div className="mt-1 text-sm text-blue-700">
                    <p>{selectedPatient.first_name} {selectedPatient.middle_name} {selectedPatient.last_name}</p>
                    <p>ID: {selectedPatient.patient_id} | {selectedPatient.sex} | Age: {selectedPatient.age || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ER Visit Registration */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Step 2: ER Visit Information</h2>
          
          {!selectedPatient ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Please select or register a patient first before creating an ER visit.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleVisitSubmit(onSubmitVisit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arrival Mode*
                </label>
                <select
                  {...registerVisit('arrival_mode', { required: 'Arrival mode is required' })}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select...</option>
                  <option value="Walk-in">Walk-in</option>
                  <option value="Ambulance">Ambulance</option>
                  <option value="Private_Vehicle">Private Vehicle</option>
                  <option value="Police">Police</option>
                  <option value="Other">Other</option>
                </select>
                {visitErrors.arrival_mode && (
                  <p className="mt-1 text-sm text-red-600">{visitErrors.arrival_mode.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Visit Type*
                </label>
                <select
                  {...registerVisit('visit_type', { required: 'Visit type is required' })}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select...</option>
                  <option value="Emergency">Emergency</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Non-Urgent">Non-Urgent</option>
                </select>
                {visitErrors.visit_type && (
                  <p className="mt-1 text-sm text-red-600">{visitErrors.visit_type.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Chief Complaint*
                </label>
                <textarea
                  {...registerVisit('chief_complaint', { 
                    required: 'Chief complaint is required',
                    maxLength: { value: 500, message: 'Maximum 500 characters' }
                  })}
                  rows={3}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Describe the primary reason for the ER visit..."
                />
                {visitErrors.chief_complaint && (
                  <p className="mt-1 text-sm text-red-600">{visitErrors.chief_complaint.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assigned Bed (Optional)
                </label>
                <input
                  {...registerVisit('assigned_bed')}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="e.g., ER-01, ER-02"
                />
              </div>

              <button
                type="submit"
                disabled={createVisit.isLoading}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {createVisit.isLoading ? 'Creating ER Visit...' : 'Create ER Visit'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientRegistration;
