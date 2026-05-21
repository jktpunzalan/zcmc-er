<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VitalSign;
use App\Models\ErVisit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class VitalSignController extends Controller
{
    public function index($visitId): JsonResponse
    {
        $visit = ErVisit::findOrFail($visitId);
        $vitals = $visit->vitalSigns()->with('recordedBy')->orderBy('recorded_at', 'desc')->get();
        
        return response()->json($vitals);
    }

    public function store(Request $request, $visitId): JsonResponse
    {
        $visit = ErVisit::findOrFail($visitId);

        $validator = Validator::make($request->all(), [
            'bp_systolic' => 'nullable|integer|min:0|max:300',
            'bp_diastolic' => 'nullable|integer|min:0|max:200',
            'heart_rate' => 'nullable|integer|min:0|max:300',
            'respiratory_rate' => 'nullable|integer|min:0|max:100',
            'temperature' => 'nullable|numeric|min:30|max:45',
            'oxygen_saturation' => 'nullable|integer|min:0|max:100',
            'blood_glucose' => 'nullable|numeric|min:0|max:1000',
            'recorded_by' => 'required|exists:healthcare_workers,worker_id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $vitalData = $request->all();
        $vitalData['visit_id'] = $visitId;
        $vitalData['recorded_at'] = now();

        $vital = VitalSign::create($vitalData);

        return response()->json($vital->load('recordedBy'), 201);
    }

    public function latest($visitId): JsonResponse
    {
        $visit = ErVisit::findOrFail($visitId);
        $latestVital = $visit->vitalSigns()->with('recordedBy')->latest('recorded_at')->first();
        
        if (!$latestVital) {
            return response()->json(['message' => 'No vital signs recorded'], 404);
        }

        return response()->json($latestVital);
    }
}
