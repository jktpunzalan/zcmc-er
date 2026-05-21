import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Clock, 
  User, 
  AlertCircle, 
  Activity,
  Filter,
  ChevronRight,
  Bed
} from 'lucide-react';

const ActiveVisits = () => {
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTriageLevel, setFilterTriageLevel] = useState('all');

  const { data: visits, isLoading } = useQuery(
    ['active-visits', filterStatus, filterTriageLevel],
    () => api.get('/er-visits/active').then(res => {
      let filtered = res.data;
      
      if (filterStatus !== 'all') {
        filtered = filtered.filter(v => v.status === filterStatus);
      }
      
      if (filterTriageLevel !== 'all') {
        filtered = filtered.filter(v => 
          v.triage_assessment?.triage_level === filterTriageLevel
        );
      }
      
      return filtered;
    }),
    { refetchInterval: 30000 }
  );

  const getTriageColor = (level) => {
    switch(level) {
      case '1-Resuscitation': return 'bg-red-100 text-red-800 border-red-200';
      case '2-Emergent': return 'bg-orange-100 text-orange-800 border-orange-200';
      case '3-Urgent': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case '4-Less_Urgent': return 'bg-green-100 text-green-800 border-green-200';
      case '5-Non_Urgent': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Waiting': return 'bg-yellow-100 text-yellow-800';
      case 'Triaged': return 'bg-blue-100 text-blue-800';
      case 'In_Treatment': return 'bg-purple-100 text-purple-800';
      case 'Under_Observation': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getWaitTime = (arrivalTime) => {
    const arrival = new Date(arrivalTime);
    const now = new Date();
    const diffMs = now - arrival;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins} min`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Active Emergency Visits</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor and manage all active ER patients
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <Filter className="h-5 w-5 text-gray-400 mr-2" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 mr-2">Status:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="Waiting">Waiting</option>
              <option value="Triaged">Triaged</option>
              <option value="In_Treatment">In Treatment</option>
              <option value="Under_Observation">Under Observation</option>
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 mr-2">Triage Level:</label>
            <select
              value={filterTriageLevel}
              onChange={(e) => setFilterTriageLevel(e.target.value)}
              className="text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Levels</option>
              <option value="1-Resuscitation">Level 1: Resuscitation</option>
              <option value="2-Emergent">Level 2: Emergent</option>
              <option value="3-Urgent">Level 3: Urgent</option>
              <option value="4-Less_Urgent">Level 4: Less Urgent</option>
              <option value="5-Non_Urgent">Level 5: Non-Urgent</option>
            </select>
          </div>

          <div className="ml-auto text-sm text-gray-500">
            Total: {visits?.length || 0} visits
          </div>
        </div>
      </div>

      {/* Visit Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {visits?.map((visit) => (
          <div
            key={visit.visit_id}
            className="bg-white shadow rounded-lg hover:shadow-lg transition-shadow"
          >
            {/* Card Header */}
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <User className="h-4 w-4 text-gray-400 mr-1" />
                    <span className="font-medium text-gray-900">
                      {visit.patient?.first_name} {visit.patient?.last_name}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {visit.patient?.sex} • Age {visit.patient?.age || 'N/A'} • 
                    ID: {visit.patient?.patient_id}
                  </div>
                </div>
                {visit.assigned_bed && (
                  <div className="flex items-center text-xs bg-gray-100 px-2 py-1 rounded">
                    <Bed className="h-3 w-3 mr-1" />
                    {visit.assigned_bed}
                  </div>
                )}
              </div>
            </div>

            {/* Card Body */}
            <div className="px-4 py-3">
              {/* Chief Complaint */}
              <div className="mb-3">
                <p className="text-sm text-gray-900 line-clamp-2">
                  {visit.chief_complaint}
                </p>
              </div>

              {/* Status and Triage */}
              <div className="flex items-center justify-between mb-3">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(visit.status)}`}>
                  {visit.status.replace('_', ' ')}
                </span>
                {visit.triage_assessment && (
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${getTriageColor(visit.triage_assessment.triage_level)}`}>
                    Level {visit.triage_assessment.triage_level.split('-')[0]}
                  </span>
                )}
              </div>

              {/* Time Info */}
              <div className="space-y-1 text-xs text-gray-500">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  Arrival: {new Date(visit.arrival_time).toLocaleTimeString()}
                </div>
                <div className="flex items-center">
                  <Activity className="h-3 w-3 mr-1" />
                  Duration: {getWaitTime(visit.arrival_time)}
                </div>
              </div>

              {/* Attending Staff */}
              {(visit.attending_physician || visit.primary_nurse) && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-xs">
                  {visit.attending_physician && (
                    <div>
                      <span className="text-gray-500">Physician:</span>{' '}
                      <span className="text-gray-700">
                        Dr. {visit.attending_physician.first_name} {visit.attending_physician.last_name}
                      </span>
                    </div>
                  )}
                  {visit.primary_nurse && (
                    <div>
                      <span className="text-gray-500">Nurse:</span>{' '}
                      <span className="text-gray-700">
                        {visit.primary_nurse.first_name} {visit.primary_nurse.last_name}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <Link
                to={`/visits/${visit.visit_id}`}
                className="flex items-center justify-between text-sm text-blue-600 hover:text-blue-800"
              >
                <span>View Details</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {(!visits || visits.length === 0) && (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No Active Visits</h3>
          <p className="mt-1 text-sm text-gray-500">
            There are no active emergency visits matching your filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default ActiveVisits;
