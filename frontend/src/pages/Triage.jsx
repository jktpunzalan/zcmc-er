import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  Clock,
  User,
  Activity,
  ChevronRight,
  Thermometer,
  HeartPulse,
  Droplets,
  AlertTriangle,
  CheckCircle2,
  UserPlus,
  Search
} from 'lucide-react';

const getEmptyVitals = () => ({
  bp_systolic: '',
  bp_diastolic: '',
  heart_rate: '',
  respiratory_rate: '',
  temperature: '',
  oxygen_saturation: '',
  blood_glucose: ''
});

const Triage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [triageData, setTriageData] = useState({
    triage_level: '',
    presenting_symptoms: '',
    pain_assessment: '',
    pain_scale: '',
    is_infectious: false,
    allergies: '',
    triage_nurse_id: ''
  });
  const [vitalsData, setVitalsData] = useState(getEmptyVitals());
  const [hasManualLevel, setHasManualLevel] = useState(false);

  const userNurseId = useMemo(() => {
    if (user?.role === 'ER_Nurse' || user?.role === 'Triage_Nurse') {
      return user.worker_id || '';
    }
    return '';
  }, [user]);

  useEffect(() => {
    if (userNurseId) {
      setTriageData((prev) => ({
        ...prev,
        triage_nurse_id: prev.triage_nurse_id || userNurseId
      }));
    }
  }, [userNurseId]);

  useEffect(() => {
    if (selectedVisit) {
      setTriageData({
        triage_level: '',
        presenting_symptoms: selectedVisit.chief_complaint || '',
        pain_assessment: '',
        pain_scale: '',
        is_infectious: false,
        allergies: '',
        triage_nurse_id: userNurseId || ''
      });
      setVitalsData(getEmptyVitals());
    } else {
      setTriageData({
        triage_level: '',
        presenting_symptoms: '',
        pain_assessment: '',
        pain_scale: '',
        is_infectious: false,
        allergies: '',
        triage_nurse_id: userNurseId || ''
      });
      setVitalsData(getEmptyVitals());
    }
    setHasManualLevel(false);
  }, [selectedVisit, userNurseId]);

  // Fetch waiting visits
  const { data: waitingVisits, isLoading } = useQuery(
    'waiting-visits',
    () => api.get('/er-visits/active').then(res => 
      res.data.filter(visit => visit.status === 'Waiting')
    ),
    { refetchInterval: 30000 }
  );

  const filteredVisits = useMemo(() => {
    if (!waitingVisits) return [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) return waitingVisits;
    return waitingVisits.filter((visit) => {
      const patientName = `${visit.patient?.first_name || ''} ${visit.patient?.last_name || ''}`.toLowerCase();
      const patientId = (visit.patient?.patient_id || '').toLowerCase();
      const complaint = (visit.chief_complaint || '').toLowerCase();
      return patientName.includes(term) || patientId.includes(term) || complaint.includes(term);
    });
  }, [waitingVisits, searchTerm]);

  // Fetch healthcare workers (nurses)
  const { data: nurses } = useQuery(
    'nurses',
    () => api.get('/healthcare-workers/nurses').then(res => res.data)
  );

  useEffect(() => {
    if (triageData.triage_nurse_id) return;
    const fallbackId = userNurseId || nurses?.[0]?.worker_id || '';
    if (fallbackId) {
      setTriageData((prev) => ({ ...prev, triage_nurse_id: fallbackId }));
    }
  }, [userNurseId, nurses, triageData.triage_nurse_id]);

  const triageSuggestion = useMemo(() => {
    const levelPriority = {
      '1-Resuscitation': 1,
      '2-Emergent': 2,
      '3-Urgent': 3,
      '4-Less_Urgent': 4,
      '5-Non_Urgent': 5
    };

    const toNumber = (value) => {
      const num = parseFloat(value);
      return Number.isFinite(num) ? num : null;
    };

    const systolic = toNumber(vitalsData.bp_systolic);
    const diastolic = toNumber(vitalsData.bp_diastolic);
    const heartRate = toNumber(vitalsData.heart_rate);
    const respRate = toNumber(vitalsData.respiratory_rate);
    const temperature = toNumber(vitalsData.temperature);
    const oxygen = toNumber(vitalsData.oxygen_saturation);
    const painScale = toNumber(triageData.pain_scale);
    const symptoms = (triageData.presenting_symptoms || '').toLowerCase();

    const hasVitalsInput = [systolic, diastolic, heartRate, respRate, temperature, oxygen, painScale]
      .some((value) => value !== null);

    if (!hasVitalsInput && !symptoms) {
      return { level: null, reasons: [] };
    }

    let currentPriority = 5;
    let reasons = [];

    const updateRecommendation = (targetLevel, reason) => {
      const priority = levelPriority[targetLevel];
      if (priority < currentPriority) {
        currentPriority = priority;
        reasons = [reason];
      } else if (priority === currentPriority) {
        reasons.push(reason);
      }
    };

    if (systolic !== null) {
      if (systolic < 80) updateRecommendation('1-Resuscitation', 'Systolic BP below 80 mmHg');
      else if (systolic < 90) updateRecommendation('2-Emergent', 'Systolic BP below 90 mmHg');
      else if (systolic < 100) updateRecommendation('3-Urgent', 'Systolic BP below 100 mmHg');
    }

    if (diastolic !== null) {
      if (diastolic < 50) updateRecommendation('2-Emergent', 'Diastolic BP below 50 mmHg');
    }

    if (oxygen !== null) {
      if (oxygen < 90) updateRecommendation('1-Resuscitation', 'Oxygen saturation below 90%');
      else if (oxygen < 95) updateRecommendation('2-Emergent', 'Oxygen saturation below 95%');
    }

    if (heartRate !== null) {
      if (heartRate < 40 || heartRate > 150) updateRecommendation('1-Resuscitation', 'Critical heart rate observed');
      else if (heartRate < 50 || heartRate > 120) updateRecommendation('2-Emergent', 'Significant heart rate deviation');
      else if (heartRate > 100) updateRecommendation('3-Urgent', 'Elevated heart rate');
    }

    if (respRate !== null) {
      if (respRate > 30 || respRate < 8) updateRecommendation('1-Resuscitation', 'Critical respiratory rate');
      else if (respRate > 24) updateRecommendation('2-Emergent', 'High respiratory rate');
      else if (respRate > 20) updateRecommendation('3-Urgent', 'Elevated respiratory rate');
    }

    if (temperature !== null) {
      if (temperature >= 40 || temperature <= 35) updateRecommendation('1-Resuscitation', 'Extreme temperature recorded');
      else if (temperature >= 38.5) updateRecommendation('2-Emergent', 'High fever detected');
      else if (temperature >= 37.5) updateRecommendation('3-Urgent', 'Fever present');
    }

    if (painScale !== null) {
      if (painScale >= 8) updateRecommendation('2-Emergent', 'Severe pain reported');
      else if (painScale >= 5) updateRecommendation('3-Urgent', 'Moderate pain reported');
    }

    if (symptoms) {
      const criticalKeywords = ['cardiac arrest', 'unresponsive', 'no pulse', 'not breathing', 'seizure'];
      const highRiskKeywords = ['chest pain', 'stroke', 'shortness of breath', 'difficulty breathing', 'massive bleeding'];
      const urgentKeywords = ['abdominal pain', 'headache', 'dizziness', 'trauma', 'fracture', 'bleeding', 'vomiting'];

      if (criticalKeywords.some((keyword) => symptoms.includes(keyword))) {
        updateRecommendation('1-Resuscitation', 'Critical presentation noted');
      } else if (highRiskKeywords.some((keyword) => symptoms.includes(keyword))) {
        updateRecommendation('2-Emergent', 'High-risk presenting symptoms');
      } else if (urgentKeywords.some((keyword) => symptoms.includes(keyword))) {
        updateRecommendation('3-Urgent', 'Urgent presenting symptoms');
      }
    }

    const priorityToLevel = Object.entries(levelPriority).reduce((acc, [key, value]) => {
      acc[value] = key;
      return acc;
    }, {});

    const recommendedLevel = priorityToLevel[currentPriority] || '5-Non_Urgent';

    if (reasons.length === 0) {
      reasons.push('Vitals within expected ranges.');
    }

    return { level: recommendedLevel, reasons };
  }, [vitalsData, triageData.pain_scale, triageData.presenting_symptoms]);

  useEffect(() => {
    if (!hasManualLevel && triageSuggestion.level && triageSuggestion.level !== triageData.triage_level) {
      setTriageData((prev) => ({ ...prev, triage_level: triageSuggestion.level }));
    }
  }, [triageSuggestion.level, hasManualLevel, triageData.triage_level]);

  const assignedNurse = useMemo(() => {
    if (!triageData.triage_nurse_id) return null;
    if (user?.worker_id === triageData.triage_nurse_id) {
      return user?.healthcare_worker || {
        first_name: user?.name?.split(' ')?.[0] || 'You',
        last_name: user?.name?.split(' ')?.slice(1).join(' ')
      };
    }
    return nurses?.find((nurse) => nurse.worker_id === triageData.triage_nurse_id) || null;
  }, [triageData.triage_nurse_id, user, nurses]);

  // Latest vitals snapshot for selected visit
  const {
    data: latestVitals,
    isFetching: loadingLatestVitals,
    refetch: refetchLatestVitals
  } = useQuery(
    ['latest-vitals', selectedVisit?.visit_id],
    () => api
      .get(`/vital-signs/visits/${selectedVisit.visit_id}/latest`)
      .then(res => res.data)
      .catch((error) => {
        if (error.response?.status === 404) {
          return null;
        }
        throw error;
      }),
    {
      enabled: !!selectedVisit,
      retry: false
    }
  );

  // Record vital signs mutation
  const recordVitals = useMutation(
    ({ visitId, data }) => api.post(`/vital-signs/visits/${visitId}`, data),
    {
      onSuccess: (_response, variables) => {
        toast.success('Vital signs recorded');
        setVitalsData(getEmptyVitals());
        queryClient.invalidateQueries(['latest-vitals', variables.visitId]);
        refetchLatestVitals();
      },
      onError: () => {
        toast.error('Failed to record vital signs');
      }
    }
  );

  // Create triage assessment mutation
  const createTriage = useMutation(
    ({ visitId, data }) => api.post(`/triage/visits/${visitId}`, data),
    {
      onSuccess: () => {
        toast.success('Triage assessment completed');
        queryClient.invalidateQueries('waiting-visits');
        setSelectedVisit(null);
        setTriageData({
          triage_level: '',
          presenting_symptoms: '',
          pain_assessment: '',
          pain_scale: '',
          is_infectious: false,
          allergies: '',
          triage_nurse_id: ''
        });
      },
      onError: () => {
        toast.error('Failed to complete triage assessment');
      }
    }
  );

  const handleTriageSubmit = (e) => {
    e.preventDefault();
    if (!selectedVisit) {
      toast.error('Please select a patient first');
      return;
    }
    createTriage.mutate({ visitId: selectedVisit.visit_id, data: triageData });
  };

  const getTriageColor = (level) => {
    switch(level) {
      case '1-Resuscitation': return 'border-red-600 bg-red-50';
      case '2-Emergent': return 'border-orange-500 bg-orange-50';
      case '3-Urgent': return 'border-yellow-500 bg-yellow-50';
      case '4-Less_Urgent': return 'border-green-500 bg-green-50';
      case '5-Non_Urgent': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300';
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
        <h1 className="text-3xl font-bold text-gray-900">Triage Assessment</h1>
        <p className="mt-2 text-sm text-gray-600">Assess and prioritize patients based on medical urgency</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 items-start">
        {/* Left Column: Queue & Quick Actions */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Waiting Patients</h2>
                <p className="text-xs text-gray-500">Status: {waitingVisits?.length || 0} in queue</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {waitingVisits?.length || 0}
              </span>
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by name, ID, or complaint"
                />
              </div>
            </div>
            <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
              {filteredVisits.map((visit) => (
                <button
                  key={visit.visit_id}
                  onClick={() => setSelectedVisit(visit)}
                  className={`w-full text-left px-4 py-4 hover:bg-gray-50 transition-colors ${
                    selectedVisit?.visit_id === visit.visit_id ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">
                          {visit.patient?.first_name} {visit.patient?.last_name}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {visit.chief_complaint}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span className="inline-flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Waiting: {getWaitTime(visit.arrival_time)}
                        </span>
                        {visit.triage_assessment?.triage_level && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                            {visit.triage_assessment.triage_level}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </button>
              ))}
              {waitingVisits && waitingVisits.length > 0 && filteredVisits.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No patients match “{searchTerm}”.
                </div>
              )}
              {(!waitingVisits || waitingVisits.length === 0) && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  No patients waiting for triage
                </div>
              )}
            </div>
            <div className="px-4 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => navigate('/register')}
                className="w-full inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow"
              >
                <UserPlus className="h-4 w-4 mr-2" /> Register New Patient
              </button>
            </div>
          </div>

          {selectedVisit && (
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Latest Vitals Snapshot</h3>
              {loadingLatestVitals ? (
                <p className="text-xs text-gray-500">Fetching vitals...</p>
              ) : latestVitals ? (
                <div className="space-y-3 text-sm text-gray-800">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Recorded {new Date(latestVitals.recorded_at).toLocaleTimeString()}</span>
                    <span>By {latestVitals.recorded_by?.first_name} {latestVitals.recorded_by?.last_name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    {latestVitals.bp_systolic && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-red-500" />
                        <span className="font-semibold">BP {latestVitals.bp_systolic}/{latestVitals.bp_diastolic}</span>
                      </div>
                    )}
                    {latestVitals.heart_rate && (
                      <div className="flex items-center gap-2">
                        <HeartPulse className="h-4 w-4 text-pink-500" />
                        <span className="font-semibold">HR {latestVitals.heart_rate}</span>
                      </div>
                    )}
                    {latestVitals.temperature && (
                      <div className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-orange-500" />
                        <span className="font-semibold">Temp {latestVitals.temperature}°C</span>
                      </div>
                    )}
                    {latestVitals.oxygen_saturation && (
                      <div className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold">O₂ {latestVitals.oxygen_saturation}%</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500">No vitals recorded yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Assessment Workbench */}
        <div className="xl:col-span-3">
          {selectedVisit ? (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Triage Assessment Form</h2>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Patient:</span>{' '}
                    <span className="font-medium">
                      {selectedVisit.patient?.first_name} {selectedVisit.patient?.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Age:</span>{' '}
                    <span className="font-medium">{selectedVisit.patient?.age || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Sex:</span>{' '}
                    <span className="font-medium">{selectedVisit.patient?.sex}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Arrival:</span>{' '}
                    <span className="font-medium">
                      {new Date(selectedVisit.arrival_time).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Decision Support Banner */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="col-span-1 lg:col-span-2 border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-700">Decision Support Tips</p>
                        <ul className="mt-2 space-y-1 text-xs text-blue-700">
                          <li>• Level 1 if airway, breathing, or circulation is compromised.</li>
                          <li>• Consider Level 2 for severe pain (&gt;7/10) or high-risk presentation.</li>
                          <li>• Fever with hypotension or altered mentation suggests urgent escalation.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1 border border-amber-200 rounded-lg p-4 bg-amber-50">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-700">High-Risk Flags</p>
                        <ul className="mt-2 space-y-1 text-xs text-amber-700">
                          <li>• O₂ saturation &lt; 95%</li>
                          <li>• Temp &gt; 38.5°C or &lt; 35°C</li>
                          <li>• Heart rate &gt; 120 bpm or &lt; 50 bpm</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-2">
                  <span className="text-gray-500 text-sm">Chief Complaint:</span>
                  <p className="font-medium text-gray-900">{selectedVisit.chief_complaint}</p>
                </div>
              </div>

              <form onSubmit={handleTriageSubmit} className="space-y-6">
                {/* Vital Signs Entry */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Record Vital Signs</h3>
                    <span className="text-xs text-gray-500">Auto-tags nurse as recorder</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">BP Systolic</label>
                      <input
                        type="number"
                        value={vitalsData.bp_systolic}
                        onChange={(e) => setVitalsData({ ...vitalsData, bp_systolic: e.target.value })}
                        className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">BP Diastolic</label>
                      <input
                        type="number"
                        value={vitalsData.bp_diastolic}
                        onChange={(e) => setVitalsData({ ...vitalsData, bp_diastolic: e.target.value })}
                        className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Heart Rate</label>
                      <input
                        type="number"
                        value={vitalsData.heart_rate}
                        onChange={(e) => setVitalsData({ ...vitalsData, heart_rate: e.target.value })}
                        className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Respiratory Rate</label>
                      <input
                        type="number"
                        value={vitalsData.respiratory_rate}
                        onChange={(e) => setVitalsData({ ...vitalsData, respiratory_rate: e.target.value })}
                        className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Temperature (°C)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitalsData.temperature}
                        onChange={(e) => setVitalsData({ ...vitalsData, temperature: e.target.value })}
                        className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Oxygen Saturation</label>
                      <input
                        type="number"
                        value={vitalsData.oxygen_saturation}
                        onChange={(e) => setVitalsData({ ...vitalsData, oxygen_saturation: e.target.value })}
                        className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Blood Glucose</label>
                      <input
                        type="number"
                        step="0.1"
                        value={vitalsData.blood_glucose}
                        onChange={(e) => setVitalsData({ ...vitalsData, blood_glucose: e.target.value })}
                        className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedVisit) return;
                        if (!userNurseId) {
                          toast.error('Only triage-capable nurses can log vitals.');
                          return;
                        }
                        recordVitals.mutate({
                          visitId: selectedVisit.visit_id,
                          data: {
                            ...vitalsData,
                            recorded_by: userNurseId
                          }
                        });
                      }}
                      disabled={recordVitals.isLoading}
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-60"
                    >
                      {recordVitals.isLoading ? 'Saving Vitals...' : 'Save Vitals Snapshot'}
                    </button>
                  </div>
                </div>

                {/* Presenting Symptoms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Presenting Symptoms*
                  </label>
                  <textarea
                    value={triageData.presenting_symptoms}
                    onChange={(e) => setTriageData({ ...triageData, presenting_symptoms: e.target.value })}
                    rows={3}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe the patient's presenting symptoms..."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pain Scale (0-10)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={triageData.pain_scale}
                      onChange={(e) => setTriageData({ ...triageData, pain_scale: e.target.value })}
                      className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Infectious Concerns
                    </label>
                    <div className="mt-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          checked={triageData.is_infectious}
                          onChange={(e) => setTriageData({ ...triageData, is_infectious: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Patient may have infectious condition
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {triageSuggestion.level && (
                  <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-blue-700">
                          Suggested Triage Level: <span className="uppercase">{triageSuggestion.level.replace('_', ' ')}</span>
                        </p>
                        <ul className="mt-2 space-y-1 text-xs text-blue-700 list-disc list-inside">
                          {triageSuggestion.reasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Triage Level*
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { value: '1-Resuscitation', label: 'Level 1: Resuscitation', desc: 'Immediate' },
                      { value: '2-Emergent', label: 'Level 2: Emergent', desc: '10 minutes' },
                      { value: '3-Urgent', label: 'Level 3: Urgent', desc: '30 minutes' },
                      { value: '4-Less_Urgent', label: 'Level 4: Less Urgent', desc: '60 minutes' },
                      { value: '5-Non_Urgent', label: 'Level 5: Non-Urgent', desc: '120 minutes' }
                    ].map((level) => (
                      <label
                        key={level.value}
                        className={`relative flex cursor-pointer rounded-lg border p-3 transition-shadow ${
                          triageData.triage_level === level.value ? getTriageColor(level.value) : 'border-gray-300'
                        } ${triageSuggestion.level === level.value ? 'ring-2 ring-blue-400' : ''}`}
                      >
                        <input
                          type="radio"
                          name="triage_level"
                          value={level.value}
                          checked={triageData.triage_level === level.value}
                          onChange={(e) => {
                            setHasManualLevel(true);
                            setTriageData({ ...triageData, triage_level: e.target.value });
                          }}
                          className="sr-only"
                        />
                        <div className="flex-1">
                          <span className="block text-sm font-medium text-gray-900">
                            {level.label}
                          </span>
                          <span className="block text-xs text-gray-500">
                            Target: {level.desc}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assigned Triage Nurse (optional override)
                  </label>
                  <div className="space-y-2">
                    {assignedNurse ? (
                      <p className="text-sm text-gray-600">
                        Current: <span className="font-semibold text-gray-900">{assignedNurse.first_name} {assignedNurse.last_name}</span>
                      </p>
                    ) : (
                      <p className="text-sm text-amber-600">No nurse auto-assigned yet.</p>
                    )}
                    <select
                      value={triageData.triage_nurse_id}
                      onChange={(e) => setTriageData({ ...triageData, triage_nurse_id: e.target.value })}
                      className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">No nurse selected</option>
                      {nurses?.map((nurse) => (
                        <option key={nurse.worker_id} value={nurse.worker_id}>
                          {nurse.first_name} {nurse.last_name} - {nurse.license_no}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pain Assessment
                  </label>
                  <textarea
                    value={triageData.pain_assessment}
                    onChange={(e) => setTriageData({ ...triageData, pain_assessment: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Describe pain location, quality, onset, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Known Allergies
                  </label>
                  <textarea
                    value={triageData.allergies}
                    onChange={(e) => setTriageData({ ...triageData, allergies: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="List any known allergies..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Current Medications
                  </label>
                  <textarea
                    value={triageData.current_medications}
                    onChange={(e) => setTriageData({ ...triageData, current_medications: e.target.value })}
                    rows={2}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="List current medications..."
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={createTriage.isLoading || !triageData.triage_level || !triageData.triage_nurse_id}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createTriage.isLoading ? 'Completing Assessment...' : 'Complete Triage Assessment'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-8 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No Patient Selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a patient from the waiting list to begin triage assessment.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Triage;
