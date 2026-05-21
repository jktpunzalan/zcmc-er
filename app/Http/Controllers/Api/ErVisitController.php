<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ErVisit;
use App\Models\Patient;
use App\Jobs\SubmitErVisitToHIE;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class ErVisitController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ErVisit::with(['patient', 'attendingPhysician', 'primaryNurse', 'triageAssessment']);

        if ($request->has('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->has('date')) {
            $date = $request->input('date');
            $query->whereDate('arrival_time', $date);
        }

        $visits = $query->orderBy('arrival_time', 'desc')->paginate(20);
        return response()->json($visits);
    }

    public function activeVisits(): JsonResponse
    {
        $activeStatuses = ['Waiting', 'Triaged', 'In_Treatment', 'Under_Observation'];
        
        $visits = ErVisit::with(['patient', 'triageAssessment', 'attendingPhysician'])
            ->whereIn('status', $activeStatuses)
            ->orderBy('arrival_time', 'asc')
            ->get();

        return response()->json($visits);
    }

    public function show($visitId): JsonResponse
    {
        $visit = ErVisit::with([
            'patient',
            'attendingPhysician',
            'primaryNurse',
            'triageAssessment.triageNurse',
            'vitalSigns.recordedBy',
            'procedures.performedBy',
            'diagnosticOrders.orderedBy',
            'diagnosticOrders.results',
            'medications.administeredBy',
            'clinicalNotes.createdBy',
            'disposition.authorizedBy',
            'billing'
        ])->findOrFail($visitId);

        return response()->json($visit);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|exists:patients,patient_id',
            'arrival_mode' => 'required|in:Walk-in,Ambulance,Private_Vehicle,Police,Other',
            'visit_type' => 'required|in:Emergency,Urgent,Non-Urgent',
            'chief_complaint' => 'required|string|max:500',
            'assigned_bed' => 'nullable|string',
            'attending_physician_id' => 'nullable|exists:healthcare_workers,worker_id',
            'primary_nurse_id' => 'nullable|exists:healthcare_workers,worker_id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $visitData = $request->all();
        $visitData['arrival_time'] = now();
        $visitData['status'] = 'Waiting';

        $visit = ErVisit::create($visitData);
        
        // Dispatch HIE submission job if enabled
        if (config('hie.enabled')) {
            SubmitErVisitToHIE::dispatch($visit)->delay(now()->addSeconds(10));
        }
        
        return response()->json($visit->load('patient'), 201);
    }

    public function update(Request $request, $visitId): JsonResponse
    {
        $visit = ErVisit::findOrFail($visitId);

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|required|in:Waiting,Triaged,In_Treatment,Under_Observation,Admitted,Discharged,Transferred,Left_AMA',
            'assigned_bed' => 'nullable|string',
            'attending_physician_id' => 'nullable|exists:healthcare_workers,worker_id',
            'primary_nurse_id' => 'nullable|exists:healthcare_workers,worker_id',
            'departure_time' => 'nullable|date_format:Y-m-d H:i:s'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $visit->update($request->all());
        
        return response()->json($visit->load(['patient', 'attendingPhysician', 'primaryNurse']));
    }

    public function dashboard(): JsonResponse
    {
        $stats = [
            'total_today' => ErVisit::whereDate('arrival_time', today())->count(),
            'waiting' => ErVisit::where('status', 'Waiting')->count(),
            'in_treatment' => ErVisit::where('status', 'In_Treatment')->count(),
            'triaged' => ErVisit::where('status', 'Triaged')->count(),
            'average_wait_time' => ErVisit::where('status', 'Waiting')
                ->whereDate('arrival_time', today())
                ->get()
                ->avg(function ($visit) {
                    return $visit->arrival_time->diffInMinutes(now());
                }),
            'beds_occupied' => ErVisit::whereNotNull('assigned_bed')
                ->whereIn('status', ['In_Treatment', 'Under_Observation'])
                ->count()
        ];

        return response()->json($stats);
    }
}
