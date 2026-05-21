import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import { 
  Heart, 
  Activity, 
  Thermometer,
  Droplet,
  Wind,
  TrendingUp,
  Clock,
  User
} from 'lucide-react';

const VitalSigns = () => {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();
  const [showForm, setShowForm] = useState(false);

  // Fetch visit details
  const { data: visit } = useQuery(
    ['visit-basic', visitId],
    () => api.get(`/er-visits/${visitId}`).then(res => res.data)
  );

  // Fetch vital signs history
  const { data: vitals, isLoading } = useQuery(
    ['vital-signs', visitId],
    () => api.get(`/vital-signs/visits/${visitId}`).then(res => res.data)
  );

  // Fetch healthcare workers
  const { data: workers } = useQuery(
    'healthcare-workers',
    () => api.get('/healthcare-workers').then(res => res.data.data)
  );

  // Create vital signs mutation
  const createVitals = useMutation(
    (data) => api.post(`/vital-signs/visits/${visitId}`, data),
    {
      onSuccess: () => {
        toast.success('Vital signs recorded successfully');
        queryClient.invalidateQueries(['vital-signs', visitId]);
        reset();
        setShowForm(false);
      },
      onError: () => {
        toast.error('Failed to record vital signs');
      }
    }
  );

  const onSubmit = (data) => {
    // Clean empty values
    Object.keys(data).forEach(key => {
      if (data[key] === '' || data[key] === null) {
        delete data[key];
      }
    });
    createVitals.mutate(data);
  };

  const getVitalStatus = (type, value) => {
    if (!value) return '';
    
    switch(type) {
      case 'bp_systolic':
        if (value > 140) return 'text-red-600';
        if (value < 90) return 'text-yellow-600';
        return 'text-green-600';
      case 'bp_diastolic':
        if (value > 90) return 'text-red-600';
        if (value < 60) return 'text-yellow-600';
        return 'text-green-600';
      case 'heart_rate':
        if (value > 100 || value < 60) return 'text-yellow-600';
        return 'text-green-600';
      case 'temperature':
        if (value > 37.5 || value < 36) return 'text-yellow-600';
        return 'text-green-600';
      case 'oxygen_saturation':
        if (value < 95) return 'text-red-600';
        if (value < 98) return 'text-yellow-600';
        return 'text-green-600';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/visits/${visitId}`)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Visit Details
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vital Signs</h1>
            {visit && (
              <p className="mt-2 text-sm text-gray-600">
                Patient: {visit.patient?.first_name} {visit.patient?.last_name} | 
                Visit: #{visitId.substring(0, 8)}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            {showForm ? 'Cancel' : 'Record New Vitals'}
          </button>
        </div>
      </div>

      {/* Recording Form */}
      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Record Vital Signs</h2>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Blood Pressure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Pressure (mmHg)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    {...register('bp_systolic')}
                    placeholder="Systolic"
                    min="0"
                    max="300"
                    className="w-1/2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <input
                    type="number"
                    {...register('bp_diastolic')}
                    placeholder="Diastolic"
                    min="0"
                    max="200"
                    className="w-1/2 rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Heart Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Heart Rate (bpm)
                </label>
                <input
                  type="number"
                  {...register('heart_rate')}
                  min="0"
                  max="300"
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Respiratory Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Respiratory Rate (breaths/min)
                </label>
                <input
                  type="number"
                  {...register('respiratory_rate')}
                  min="0"
                  max="100"
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('temperature')}
                  min="30"
                  max="45"
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Oxygen Saturation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oxygen Saturation (%)
                </label>
                <input
                  type="number"
                  {...register('oxygen_saturation')}
                  min="0"
                  max="100"
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              {/* Blood Glucose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Blood Glucose (mg/dL)
                </label>
                <input
                  type="number"
                  step="0.1"
                  {...register('blood_glucose')}
                  min="0"
                  max="1000"
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>

            {/* Recorded By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Recorded By*
              </label>
              <select
                {...register('recorded_by', { required: 'Please select who is recording' })}
                className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                required
              >
                <option value="">Select healthcare worker...</option>
                {workers?.map((worker) => (
                  <option key={worker.worker_id} value={worker.worker_id}>
                    {worker.first_name} {worker.last_name} - {worker.role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setShowForm(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createVitals.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createVitals.isLoading ? 'Recording...' : 'Record Vital Signs'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Latest Vital Signs */}
      {vitals && vitals.length > 0 && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Latest Vital Signs</h2>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-600">
                Recorded: {new Date(vitals[0].recorded_at).toLocaleString()}
              </span>
              <span className="text-sm text-gray-600">
                By: {vitals[0].recorded_by?.first_name} {vitals[0].recorded_by?.last_name}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {vitals[0].bp_systolic && (
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Heart className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Blood Pressure</p>
                  <p className={`text-lg font-bold ${getVitalStatus('bp_systolic', vitals[0].bp_systolic)}`}>
                    {vitals[0].bp_systolic}/{vitals[0].bp_diastolic}
                  </p>
                  <p className="text-xs text-gray-400">mmHg</p>
                </div>
              )}
              
              {vitals[0].heart_rate && (
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Activity className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Heart Rate</p>
                  <p className={`text-lg font-bold ${getVitalStatus('heart_rate', vitals[0].heart_rate)}`}>
                    {vitals[0].heart_rate}
                  </p>
                  <p className="text-xs text-gray-400">bpm</p>
                </div>
              )}
              
              {vitals[0].temperature && (
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Thermometer className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Temperature</p>
                  <p className={`text-lg font-bold ${getVitalStatus('temperature', vitals[0].temperature)}`}>
                    {vitals[0].temperature}
                  </p>
                  <p className="text-xs text-gray-400">°C</p>
                </div>
              )}
              
              {vitals[0].respiratory_rate && (
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Wind className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Resp. Rate</p>
                  <p className="text-lg font-bold text-gray-900">
                    {vitals[0].respiratory_rate}
                  </p>
                  <p className="text-xs text-gray-400">/min</p>
                </div>
              )}
              
              {vitals[0].oxygen_saturation && (
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <Droplet className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">O2 Sat</p>
                  <p className={`text-lg font-bold ${getVitalStatus('oxygen_saturation', vitals[0].oxygen_saturation)}`}>
                    {vitals[0].oxygen_saturation}
                  </p>
                  <p className="text-xs text-gray-400">%</p>
                </div>
              )}
              
              {vitals[0].blood_glucose && (
                <div className="text-center">
                  <div className="flex justify-center mb-1">
                    <TrendingUp className="h-5 w-5 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500">Glucose</p>
                  <p className="text-lg font-bold text-gray-900">
                    {vitals[0].blood_glucose}
                  </p>
                  <p className="text-xs text-gray-400">mg/dL</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historical Vital Signs */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Vital Signs History</h2>
        
        {vitals && vitals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    BP (mmHg)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    HR (bpm)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Temp (°C)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RR (/min)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    O2 (%)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Glucose
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recorded By
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vitals.map((vital, index) => (
                  <tr key={vital.vital_id} className={index === 0 ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <p className="font-medium">{new Date(vital.recorded_at).toLocaleDateString()}</p>
                        <p className="text-xs text-gray-500">{new Date(vital.recorded_at).toLocaleTimeString()}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {vital.bp_systolic ? (
                        <span className={getVitalStatus('bp_systolic', vital.bp_systolic)}>
                          {vital.bp_systolic}/{vital.bp_diastolic}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {vital.heart_rate ? (
                        <span className={getVitalStatus('heart_rate', vital.heart_rate)}>
                          {vital.heart_rate}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {vital.temperature ? (
                        <span className={getVitalStatus('temperature', vital.temperature)}>
                          {vital.temperature}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {vital.respiratory_rate || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {vital.oxygen_saturation ? (
                        <span className={getVitalStatus('oxygen_saturation', vital.oxygen_saturation)}>
                          {vital.oxygen_saturation}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {vital.blood_glucose || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {vital.recorded_by?.first_name} {vital.recorded_by?.last_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            No vital signs recorded for this visit yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default VitalSigns;
