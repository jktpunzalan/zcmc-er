import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  Users, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  UserCheck,
  Bed,
  AlertCircle
} from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery('dashboard-stats', 
    () => api.get('/er-visits/dashboard').then(res => res.data),
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );

  const { data: activeVisits } = useQuery('active-visits',
    () => api.get('/er-visits/active').then(res => res.data),
    { refetchInterval: 30000 }
  );

  const getTriageColor = (level) => {
    switch(level) {
      case '1-Resuscitation': return 'bg-red-600 text-white';
      case '2-Emergent': return 'bg-orange-500 text-white';
      case '3-Urgent': return 'bg-yellow-500 text-white';
      case '4-Less_Urgent': return 'bg-green-500 text-white';
      case '5-Non_Urgent': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Room Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">Real-time overview of ER operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Today</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats?.total_today || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Waiting</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats?.waiting || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Activity className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">In Treatment</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats?.in_treatment || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Bed className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Beds Occupied</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats?.beds_occupied || 0}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Average Wait Time Alert */}
      {stats?.average_wait_time > 60 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Average wait time is currently <strong>{Math.round(stats.average_wait_time)} minutes</strong>. 
                Consider additional triage resources.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Visits Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Active Emergency Visits</h3>
          <Link to="/active-visits" className="text-sm text-blue-600 hover:text-blue-800">
            View all →
          </Link>
        </div>
        <div className="border-t border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chief Complaint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Triage Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Wait Time
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeVisits?.slice(0, 10).map((visit) => (
                  <tr key={visit.visit_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {visit.patient?.first_name} {visit.patient?.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {visit.patient?.sex} • Age {visit.patient?.age || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {visit.chief_complaint}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {visit.triage_assessment && (
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTriageColor(visit.triage_assessment.triage_level)}`}>
                          {visit.triage_assessment.triage_level.split('-')[0]}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(visit.status)}`}>
                        {visit.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(visit.arrival_time).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link to={`/visits/${visit.visit_id}`} className="text-blue-600 hover:text-blue-900">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
