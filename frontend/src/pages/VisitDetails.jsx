import React, { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  User, 
  Clock, 
  Activity,
  AlertCircle,
  FileText,
  Heart,
  Pill,
  Stethoscope,
  ChevronRight,
  Bed
} from 'lucide-react';

const VisitDetails = () => {
  const { visitId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [showPreviousConsultations, setShowPreviousConsultations] = useState(false);
  const [activeNoteType, setActiveNoteType] = useState('Physician');
  const [editingNote, setEditingNote] = useState(null);
  const [noteForm, setNoteForm] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  const { data: visit, isLoading } = useQuery(
    ['visit-details', visitId],
    () => api.get(`/er-visits/${visitId}`).then(res => res.data),
    { refetchInterval: 30000 }
  );

  const { data: patientHistory, isLoading: isHistoryLoading } = useQuery(
    ['patient-history', visit?.patient_id],
    () => api.get(`/hie/patients/${visit?.patient_id}/history`).then(res => res.data),
    {
      enabled: !!visit?.patient_id && user?.role === 'Emergency_Physician',
      staleTime: 5 * 60 * 1000,
    }
  );

  const noteMutation = useMutation(({ noteId, payload }) => {
    if (noteId) {
      return api.put(`/clinical-notes/${noteId}`, payload);
    }
    return api.post(`/er-visits/${visitId}/clinical-notes`, payload);
  }, {
    onSuccess: () => {
      queryClient.invalidateQueries(['visit-details', visitId]);
      setIsNoteModalOpen(false);
      setEditingNote(null);
      setNoteForm({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });
    }
  });

  const physicianNotes = useMemo(() => (
    visit?.clinical_notes?.filter(note => note.note_type === 'Physician') || []
  ), [visit]);

  const nursingNotes = useMemo(() => (
    visit?.clinical_notes?.filter(note => note.note_type === 'Nursing') || []
  ), [visit]);

  const latestVitals = useMemo(() => {
    if (!visit?.vital_signs?.length) return null;
    return [...visit.vital_signs].sort((a, b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0];
  }, [visit]);

  const latestDiagnostic = useMemo(() => {
    if (!visit?.diagnostic_orders?.length) return null;
    return [...visit.diagnostic_orders].sort((a, b) => new Date(b.ordered_at) - new Date(a.ordered_at))[0];
  }, [visit]);

  const openNoteModal = (noteType, note = null) => {
    setActiveNoteType(noteType);
    setEditingNote(note);
    if (note) {
      setNoteForm({
        subjective: note.subjective || '',
        objective: note.objective || '',
        assessment: note.assessment || '',
        plan: note.plan || ''
      });
    } else {
      setNoteForm({
        subjective: '',
        objective: '',
        assessment: '',
        plan: ''
      });
    }
    setIsNoteModalOpen(true);
  };

  const handleNoteSubmit = (e) => {
    e.preventDefault();
    if (!visit || !user) return;

    const payload = {
      note_type: activeNoteType,
      subjective: noteForm.subjective,
      objective: noteForm.objective,
      assessment: noteForm.assessment,
      plan: noteForm.plan,
      created_by: user.worker_id
    };

    noteMutation.mutate({
      noteId: editingNote?.note_id,
      payload
    });
  };

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
      case 'Discharged': return 'bg-green-100 text-green-800';
      case 'Admitted': return 'bg-orange-100 text-orange-800';
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

  if (!visit) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Visit Not Found</h3>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ER Visit Details</h1>
              <p className="mt-2 text-sm text-gray-600">
                Complete information for visit #{visitId.substring(0, 8)}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                to={`/visits/${visitId}/vitals`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Record Vitals
              </Link>
              <Link
                to={`/visits/${visitId}/diagnostics`}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
              >
                Order Diagnostics
              </Link>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Compact Context Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-xl p-4 border border-slate-200">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Patient Snapshot</p>
              <div className="grid grid-cols-5 gap-4 items-start">
                <div className="col-span-3">
                  <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                    {visit.patient?.first_name} {visit.patient?.last_name}
                  </h3>
                  <p className="mt-2 text-sm text-gray-700">
                    <span className="text-xs uppercase tracking-wide text-gray-500 mr-2">Patient ID</span>
                    <span className="font-semibold">{visit.patient?.patient_id}</span>
                  </p>
                </div>
                <div className="col-span-2 space-y-2 text-sm text-gray-700">
                  <p>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">Age</span>
                    <span className="font-semibold">{visit.patient?.age ? `${visit.patient.age} yrs` : '—'}</span>
                  </p>
                  <p>
                    <span className="text-xs uppercase tracking-wide text-gray-500 block">Sex</span>
                    <span className="font-semibold">{visit.patient?.sex || '—'}</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-xl p-4 border border-blue-200">
              <p className="text-xs uppercase tracking-wide text-blue-500 mb-2">Most Recent Vitals</p>
              {latestVitals ? (
                <div className="space-y-1 text-sm text-gray-800">
                  <p className="font-semibold text-gray-900 text-sm">{new Date(latestVitals.recorded_at).toLocaleString()}</p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    {latestVitals.bp_systolic && (
                      <span>BP: <strong>{latestVitals.bp_systolic}/{latestVitals.bp_diastolic}</strong></span>
                    )}
                    {latestVitals.heart_rate && (
                      <span>HR: <strong>{latestVitals.heart_rate}</strong></span>
                    )}
                    {latestVitals.temperature && (
                      <span>Temp: <strong>{latestVitals.temperature}°C</strong></span>
                    )}
                    {latestVitals.oxygen_saturation && (
                      <span>O₂: <strong>{latestVitals.oxygen_saturation}%</strong></span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No vitals recorded yet.</p>
              )}
            </div>

            <div className="bg-white shadow rounded-xl p-4 border border-amber-200">
              <p className="text-xs uppercase tracking-wide text-amber-600 mb-2">Chief Complaint</p>
              <p className="text-sm text-gray-800 leading-snug whitespace-pre-wrap">
                {visit.chief_complaint || 'Not documented'}
              </p>
            </div>

            <div className="bg-white shadow rounded-xl p-4 border border-indigo-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wide text-indigo-600">Diagnostics</p>
                <span className="text-[11px] font-medium text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                  {visit.diagnostic_orders?.length || 0} orders
                </span>
              </div>
              {latestDiagnostic ? (
                <div className="space-y-1 text-sm text-gray-800">
                  <p className="font-semibold text-gray-900 text-sm truncate" title={latestDiagnostic.order_description}>
                    {latestDiagnostic.order_description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {latestDiagnostic.order_type} • {new Date(latestDiagnostic.ordered_at).toLocaleTimeString()}
                  </p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    latestDiagnostic.status === 'Completed' ? 'bg-green-100 text-green-700' :
                    latestDiagnostic.status === 'In_Progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {latestDiagnostic.status?.replace('_', ' ') || 'Pending'}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No diagnostics ordered yet.</p>
              )}
            </div>
          </div>

          {/* Physician Notes - Primary Section */}
          <section className="bg-white shadow-lg rounded-2xl p-6 border border-blue-100">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <p className="text-xs uppercase tracking-wider text-blue-500 font-semibold mb-1">Primary Focus</p>
                <h2 className="text-2xl font-semibold text-gray-900">Physician SOAP Notes</h2>
                <p className="text-sm text-gray-500">Core clinical documentation for this ER encounter.</p>
              </div>
              {user?.role === 'Emergency_Physician' && (
                <button
                  onClick={() => openNoteModal('Physician')}
                  className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow"
                >
                  Add Physician Note
                </button>
              )}
            </div>
            {physicianNotes.length > 0 ? (
              <div className="space-y-6">
                {physicianNotes.map((note) => (
                  <div key={note.note_id} className="border border-blue-100 rounded-2xl p-6 bg-gradient-to-br from-white via-blue-50 to-white shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 pb-4 border-b border-blue-100">
                        <div>
                          <p className="text-base font-semibold text-gray-900">Physician Note</p>
                          <p className="text-xs text-gray-500">By Dr. {note.created_by?.first_name} {note.created_by?.last_name}</p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <p className="text-xs text-gray-500">{new Date(note.created_at).toLocaleString()}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openNoteModal('Physician', note)}
                              className="px-3 py-1 text-xs font-medium rounded-md border border-blue-200 text-blue-700 hover:bg-blue-100"
                            >
                              Edit Note
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm">
                          <div className="flex items-center mb-3">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold">S</span>
                            <h3 className="ml-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Subjective</h3>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                            {note.subjective || 'No subjective notes recorded.'}
                          </p>
                        </div>

                        <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm">
                          <div className="flex items-center mb-3">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold">O</span>
                            <h3 className="ml-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Objective</h3>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                            {note.objective || 'No objective findings recorded.'}
                          </p>
                        </div>

                        <div className="bg-white rounded-xl border border-yellow-100 p-4 shadow-sm">
                          <div className="flex items-center mb-3">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-yellow-100 text-yellow-700 font-bold">A</span>
                            <h3 className="ml-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Assessment</h3>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                            {note.assessment || 'No assessment recorded.'}
                          </p>
                        </div>

                        <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
                          <div className="flex items-center mb-3">
                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold">P</span>
                            <h3 className="ml-3 text-sm font-semibold text-gray-900 uppercase tracking-wide">Plan</h3>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                            {note.plan || 'No plan recorded.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-blue-200 rounded-2xl bg-blue-50">
                <p className="text-sm text-blue-700 font-medium">No physician SOAP notes recorded yet.</p>
                {user?.role === 'Emergency_Physician' && (
                  <button
                    onClick={() => openNoteModal('Physician')}
                    className="mt-4 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Physician Note
                  </button>
                )}
              </div>
            )}
          </section>

          {/* Nursing Notes - Secondary Section */}
          <section className="bg-white shadow rounded-2xl p-6 border border-emerald-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-500 font-semibold mb-1">Collaborative Care</p>
                <h2 className="text-xl font-semibold text-gray-900">Nursing SOAP Notes</h2>
                <p className="text-[11px] text-gray-500">Snapshot of nursing documentation supporting the physician&apos;s plan.</p>
              </div>
              {user?.role === 'ER_Nurse' && (
                <button
                  onClick={() => openNoteModal('Nursing')}
                  className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-[11px] font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Add Nursing Note
                </button>
              )}
            </div>

            {nursingNotes.length > 0 ? (
              <div className="space-y-4">
                {nursingNotes.map((note) => (
                  <div key={note.note_id} className="border border-emerald-100 rounded-xl p-4 bg-gradient-to-br from-white to-emerald-50">
                    <div className="flex items-center justify-between mb-3 text-[11px] text-gray-500">
                      <span>Nurse {note.created_by?.first_name} {note.created_by?.last_name}</span>
                      <span>{new Date(note.created_at).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-gray-700">
                      <div>
                        <p className="font-semibold text-emerald-700">S</p>
                        <p className="mt-1 whitespace-pre-wrap">{note.subjective || '—'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-700">O</p>
                        <p className="mt-1 whitespace-pre-wrap">{note.objective || '—'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-700">A</p>
                        <p className="mt-1 whitespace-pre-wrap">{note.assessment || '—'}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-emerald-700">P</p>
                        <p className="mt-1 whitespace-pre-wrap">{note.plan || '—'}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => openNoteModal('Nursing', note)}
                        className="px-3 py-1 text-[11px] font-medium rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      >
                        Edit Note
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No nursing notes recorded yet</p>
            )}
          </section>

          {/* Supporting Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
            <div className="bg-white shadow rounded-lg p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Patient Information</h2>
              <div className="space-y-3">
                <div className="flex items-start">
                  <User className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {visit.patient?.first_name} {visit.patient?.middle_name} {visit.patient?.last_name}
                    </p>
                    <p className="text-[11px] text-gray-500">Patient ID: {visit.patient?.patient_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-500">Sex</p>
                    <p className="font-medium">{visit.patient?.sex}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Age</p>
                    <p className="font-medium">{visit.patient?.age || 'N/A'} years</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Blood Type</p>
                    <p className="font-medium">{visit.patient?.blood_type || 'Unknown'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Contact</p>
                    <p className="font-medium">{visit.patient?.contact_number || 'N/A'}</p>
                  </div>
                </div>

                {visit.patient?.emergency_contact_name && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">Emergency Contact</p>
                    <p className="text-sm font-medium">{visit.patient.emergency_contact_name}</p>
                    <p className="text-[11px] text-gray-500">{visit.patient.emergency_contact_number}</p>
                  </div>
                )}

                {visit.patient?.insurance_provider && (
                  <div className="pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-1">Insurance</p>
                    <p className="text-sm font-medium">{visit.patient.insurance_provider}</p>
                    <p className="text-[11px] text-gray-500">{visit.patient.insurance_number}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3">Visit Status</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Status</p>
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(visit.status)}`}>
                    {visit.status.replace('_', ' ')}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Arrival</p>
                  <p className="text-sm font-medium">{new Date(visit.arrival_time).toLocaleString()}</p>
                  <p className="text-[11px] text-gray-500">Mode: {visit.arrival_mode.replace('_', ' ')}</p>
                </div>

                {visit.assigned_bed && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Assigned Bed</p>
                    <div className="flex items-center">
                      <Bed className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm font-medium">{visit.assigned_bed}</span>
                    </div>
                  </div>
                )}

                {visit.attending_physician && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Attending Physician</p>
                    <p className="text-sm font-medium">
                      Dr. {visit.attending_physician.first_name} {visit.attending_physician.last_name}
                    </p>
                  </div>
                )}

                {visit.primary_nurse && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Primary Nurse</p>
                    <p className="text-sm font-medium">
                      {visit.primary_nurse.first_name} {visit.primary_nurse.last_name}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Previous Consultations - Physician Only */}
            {user?.role === 'Emergency_Physician' && visit?.patient ? (
              <div className="bg-white shadow rounded-lg p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-gray-900">Previous Consultations</h2>
                  <button
                    onClick={() => setShowPreviousConsultations(!showPreviousConsultations)}
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  >
                    {showPreviousConsultations ? 'Hide' : 'View'}
                  </button>
                </div>
                {showPreviousConsultations ? (
                  <div className="space-y-3">
                    {isHistoryLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                        <p className="ml-2 text-xs text-gray-600">Loading...</p>
                      </div>
                    ) : patientHistory?.data?.summary ? (
                      <div className="space-y-3 max-h-96 overflow-y-auto">
                        {patientHistory.data.summary.encounters?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">SHRR Encounters</p>
                            {patientHistory.data.summary.encounters.slice(0, 3).map((encounter, idx) => (
                              <div key={idx} className="border border-indigo-100 rounded p-2 bg-indigo-50 mb-2">
                                <p className="text-xs font-medium text-gray-900">
                                  {encounter.type?.text || encounter.class?.display || 'Encounter'}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {encounter.period?.start ? new Date(encounter.period.start).toLocaleDateString() : 'Date not recorded'}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {patientHistory.data.local_visits?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-700 mb-2">Local ER Visits</p>
                            {patientHistory.data.local_visits.slice(0, 3).map((localVisit) => (
                              <div key={localVisit.visit_id} className="border border-gray-200 rounded p-2 bg-gray-50 mb-2">
                                <p className="text-xs font-medium text-gray-900">{localVisit.chief_complaint}</p>
                                <p className="text-[11px] text-gray-500">
                                  {new Date(localVisit.arrival_time).toLocaleDateString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">No history available</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">Click &quot;View&quot; to see patient history from SHRR</p>
                )}
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg p-5">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Chief Complaint</h2>
                <p className="text-sm text-gray-700">{visit.chief_complaint}</p>
              </div>
            )}

            {visit.triage_assessment && (
              <div className="bg-white shadow rounded-lg p-5 md:col-span-2">
                <h2 className="text-base font-semibold text-gray-900 mb-3">Triage Snapshot</h2>
                <div className="flex flex-wrap gap-2 mb-3 text-[11px]">
                  <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getTriageColor(visit.triage_assessment.triage_level)}`}>
                    {visit.triage_assessment.triage_level}
                  </span>
                  {visit.triage_assessment.pain_scale !== null && (
                    <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                      Pain {visit.triage_assessment.pain_scale}/10
                    </span>
                  )}
                  {visit.triage_assessment.is_infectious && (
                    <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-600">
                      Infectious Precautions
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-xs text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Triage Time</span>
                    <span className="font-medium">{new Date(visit.triage_assessment.triage_time).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Triage Nurse</span>
                    <span className="font-semibold">
                      {visit.triage_assessment.triage_nurse?.first_name} {visit.triage_assessment.triage_nurse?.last_name}
                    </span>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-xs text-gray-700">
                  <p className="text-gray-500 uppercase tracking-wide text-[11px]">Presenting Symptoms</p>
                  <p>{visit.triage_assessment.presenting_symptoms}</p>
                  {visit.triage_assessment.pain_assessment && (
                    <div>
                      <p className="text-gray-500 pt-2 uppercase tracking-wide text-[11px]">Pain Assessment</p>
                      <p>{visit.triage_assessment.pain_assessment}</p>
                    </div>
                  )}
                  {visit.triage_assessment.allergies && (
                    <div>
                      <p className="text-gray-500 pt-2 uppercase tracking-wide text-[11px]">Allergies</p>
                      <p>{visit.triage_assessment.allergies}</p>
                    </div>
                  )}
                  {visit.triage_assessment.current_medications && (
                    <div>
                      <p className="text-gray-500 pt-2 uppercase tracking-wide text-[11px]">Current Medications</p>
                      <p>{visit.triage_assessment.current_medications}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white shadow rounded-lg p-5 md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Recent Vitals</h2>
                <Link
                  to={`/visits/${visitId}/vitals`}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                >
                  View All →
                </Link>
              </div>
              {visit.vital_signs && visit.vital_signs.length > 0 ? (
                <div className="space-y-3">
                  {visit.vital_signs.slice(0, 2).map((vitals) => (
                    <div key={vitals.vital_id} className="border rounded-lg p-3">
                      <p className="text-[11px] text-gray-500 mb-2">
                        {new Date(vitals.recorded_at).toLocaleString()} by {vitals.recorded_by?.first_name} {vitals.recorded_by?.last_name}
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {vitals.bp_systolic && (
                          <div>
                            <span className="text-gray-500">BP</span>{' '}
                            <span className="font-medium">{vitals.bp_systolic}/{vitals.bp_diastolic}</span>
                          </div>
                        )}
                        {vitals.heart_rate && (
                          <div>
                            <span className="text-gray-500">HR</span>{' '}
                            <span className="font-medium">{vitals.heart_rate}</span>
                          </div>
                        )}
                        {vitals.temperature && (
                          <div>
                            <span className="text-gray-500">Temp</span>{' '}
                            <span className="font-medium">{vitals.temperature}°C</span>
                          </div>
                        )}
                        {vitals.oxygen_saturation && (
                          <div>
                            <span className="text-gray-500">O2</span>{' '}
                            <span className="font-medium">{vitals.oxygen_saturation}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No vital signs recorded yet</p>
              )}
            </div>

            <div className="bg-white shadow rounded-lg p-5 md:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-900">Diagnostics Overview</h2>
                <Link
                  to={`/visits/${visitId}/diagnostics`}
                  className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                >
                  View All →
                </Link>
              </div>
              {visit.diagnostic_orders && visit.diagnostic_orders.length > 0 ? (
                <div className="space-y-2">
                  {visit.diagnostic_orders.slice(0, 3).map((order) => (
                    <div key={order.order_id} className="flex items-center justify-between py-2 border-b">
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-gray-900">{order.order_description}</p>
                        <p className="text-[11px] text-gray-500">
                          {order.order_type} • {new Date(order.ordered_at).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-[11px] rounded-full ${
                        order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'In_Progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No diagnostic orders placed yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Note Modal */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 px-4 py-6 sm:px-6">
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl">
            <div className={`px-6 py-4 border-b ${activeNoteType === 'Physician' ? 'bg-blue-50 border-blue-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingNote ? 'Edit' : 'Add'} {activeNoteType} SOAP Note
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                Provide comprehensive {activeNoteType === 'Physician' ? 'clinical' : 'nursing'} documentation using the SOAP framework.
              </p>
            </div>

            <form onSubmit={handleNoteSubmit} className="px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subjective</label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={4}
                    value={noteForm.subjective}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, subjective: e.target.value }))}
                    placeholder="Patient-reported symptoms, complaints, and history"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Objective</label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={4}
                    value={noteForm.objective}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, objective: e.target.value }))}
                    placeholder="Observable findings, vital signs, test results"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assessment</label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={4}
                    value={noteForm.assessment}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, assessment: e.target.value }))}
                    placeholder="Clinical impressions, diagnoses, and response"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plan</label>
                  <textarea
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={4}
                    value={noteForm.plan}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, plan: e.target.value }))}
                    placeholder="Treatment plan, orders, follow-up actions"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsNoteModalOpen(false);
                    setEditingNote(null);
                    setNoteForm({ subjective: '', objective: '', assessment: '', plan: '' });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={noteMutation.isLoading}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${activeNoteType === 'Physician' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'} ${noteMutation.isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {noteMutation.isLoading ? 'Saving...' : editingNote ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default VisitDetails;
