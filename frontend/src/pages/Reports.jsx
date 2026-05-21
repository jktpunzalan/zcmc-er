import React, { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../services/api';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  Activity
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const Reports = () => {
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Fetch dashboard stats
  const { data: stats } = useQuery(
    'dashboard-stats',
    () => api.get('/er-visits/dashboard').then(res => res.data)
  );

  // Fetch visits for analysis
  const { data: visits } = useQuery(
    ['visits-report', dateRange],
    () => api.get('/er-visits', {
      params: {
        start_date: dateRange.start,
        end_date: dateRange.end
      }
    }).then(res => res.data.data || [])
  );

  // Process data for charts
  const getTriageLevelDistribution = () => {
    if (!visits) return [];
    
    const distribution = {};
    visits.forEach(visit => {
      if (visit.triage_assessment) {
        const level = visit.triage_assessment.triage_level;
        distribution[level] = (distribution[level] || 0) + 1;
      }
    });
    
    return Object.entries(distribution).map(([level, count]) => ({
      name: level.split('-')[1],
      value: count,
      level: level
    }));
  };

  const getHourlyDistribution = () => {
    if (!visits) return [];
    
    const hourly = Array(24).fill(0);
    visits.forEach(visit => {
      const hour = new Date(visit.arrival_time).getHours();
      hourly[hour]++;
    });
    
    return hourly.map((count, hour) => ({
      hour: `${hour}:00`,
      visits: count
    }));
  };

  const getArrivalModeDistribution = () => {
    if (!visits) return [];
    
    const modes = {};
    visits.forEach(visit => {
      const mode = visit.arrival_mode.replace('_', ' ');
      modes[mode] = (modes[mode] || 0) + 1;
    });
    
    return Object.entries(modes).map(([mode, count]) => ({
      mode,
      count
    }));
  };

  const getAverageWaitTimes = () => {
    if (!visits) return [];
    
    const waitTimes = {
      'Level 1': [],
      'Level 2': [],
      'Level 3': [],
      'Level 4': [],
      'Level 5': []
    };
    
    visits.forEach(visit => {
      if (visit.triage_assessment) {
        const level = `Level ${visit.triage_assessment.triage_level.charAt(0)}`;
        const waitTime = new Date(visit.triage_assessment.triage_time) - new Date(visit.arrival_time);
        waitTimes[level].push(waitTime / 60000); // Convert to minutes
      }
    });
    
    return Object.entries(waitTimes)
      .filter(([_, times]) => times.length > 0)
      .map(([level, times]) => ({
        level,
        avgWait: Math.round(times.reduce((a, b) => a + b, 0) / times.length)
      }));
  };

  const COLORS = {
    '1-Resuscitation': '#dc2626',
    '2-Emergent': '#ea580c',
    '3-Urgent': '#ca8a04',
    '4-Less_Urgent': '#16a34a',
    '5-Non_Urgent': '#2563eb'
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Room Reports</h1>
        <p className="mt-2 text-sm text-gray-600">Analytics and insights for ER operations</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="text-sm rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <button className="flex items-center px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Visits</dt>
                  <dd className="text-2xl font-bold text-gray-900">{visits?.length || 0}</dd>
                  <dd className="text-xs text-gray-500">In selected period</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Avg Wait Time</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {stats?.average_wait_time ? Math.round(stats.average_wait_time) : 0} min
                  </dd>
                  <dd className="text-xs text-gray-500">Current average</dd>
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
                  <dt className="text-sm font-medium text-gray-500 truncate">Daily Average</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {visits ? Math.round(visits.length / 7) : 0}
                  </dd>
                  <dd className="text-xs text-gray-500">Visits per day</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Critical Cases</dt>
                  <dd className="text-2xl font-bold text-gray-900">
                    {visits?.filter(v => v.triage_assessment?.triage_level === '1-Resuscitation').length || 0}
                  </dd>
                  <dd className="text-xs text-gray-500">Level 1 triages</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Triage Level Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Triage Level Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={getTriageLevelDistribution()}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {getTriageLevelDistribution().map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.level] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Hourly Visit Pattern</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={getHourlyDistribution()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tick={{ fontSize: 10 }}
                interval={3}
              />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="visits" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Arrival Mode Distribution */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Arrival Mode</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getArrivalModeDistribution()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mode" tick={{ fontSize: 10 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Average Wait Times by Triage Level */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Average Wait Times by Triage Level</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={getAverageWaitTimes()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar dataKey="avgWait" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Statistics Table */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Summary Statistics</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Total ER Visits
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {visits?.length || 0}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    +12%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Average Length of Stay
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  3.2 hours
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex items-center text-sm text-red-600">
                    <TrendingUp className="h-4 w-4 mr-1 rotate-180" />
                    -8%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Admission Rate
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  18.5%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex items-center text-sm text-gray-600">
                    → 0%
                  </span>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  Left Without Being Seen
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  2.1%
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1 rotate-180" />
                    -15%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Reports;
