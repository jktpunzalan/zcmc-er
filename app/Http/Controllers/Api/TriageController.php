<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\TriageAssessment;
use App\Models\ErVisit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class TriageController extends Controller
{
    public function store(Request $request, $visitId): JsonResponse
    {
        $visit = ErVisit::findOrFail($visitId);

        if ($visit->triageAssessment) {
            return response()->json(['error' => 'Visit already has a triage assessment'], 400);
        }

        $validator = Validator::make($request->all(), [
            'triage_level' => 'required|in:1-Resuscitation,2-Emergent,3-Urgent,4-Less_Urgent,5-Non_Urgent',
            'triage_nurse_id' => 'required|exists:healthcare_workers,worker_id',
            'presenting_symptoms' => 'required|string',
            'pain_assessment' => 'nullable|string',
            'pain_scale' => 'nullable|integer|min:0|max:10',
            'is_infectious' => 'boolean',
            'allergies' => 'nullable|string',
            'current_medications' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $triageData = $request->all();
        $triageData['visit_id'] = $visitId;
        $triageData['triage_time'] = now();

        $triage = TriageAssessment::create($triageData);

        // Update visit status
        $visit->update(['status' => 'Triaged']);

        return response()->json($triage->load(['visit.patient', 'triageNurse']), 201);
    }

    public function update(Request $request, $triageId): JsonResponse
    {
        $triage = TriageAssessment::findOrFail($triageId);

        $validator = Validator::make($request->all(), [
            'triage_level' => 'sometimes|required|in:1-Resuscitation,2-Emergent,3-Urgent,4-Less_Urgent,5-Non_Urgent',
            'presenting_symptoms' => 'sometimes|required|string',
            'pain_assessment' => 'nullable|string',
            'pain_scale' => 'nullable|integer|min:0|max:10',
            'is_infectious' => 'boolean',
            'allergies' => 'nullable|string',
            'current_medications' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $triage->update($request->all());
        
        return response()->json($triage->load(['visit.patient', 'triageNurse']));
    }

    public function waitingList(): JsonResponse
    {
        $waitingVisits = ErVisit::with(['patient', 'triageAssessment'])
            ->where('status', 'Triaged')
            ->whereHas('triageAssessment')
            ->orderBy(function($query) {
                $query->select('triage_level')
                    ->from('triage_assessments')
                    ->whereColumn('triage_assessments.visit_id', 'er_visits.visit_id')
                    ->limit(1);
            })
            ->orderBy('arrival_time')
            ->get();

        return response()->json($waitingVisits);
    }
}
