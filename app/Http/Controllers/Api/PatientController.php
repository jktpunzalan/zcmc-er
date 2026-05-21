<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Patient;
use App\Services\HIE\HIECoordinator;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class PatientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Patient::query();

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('patient_id', 'like', "%{$search}%")
                  ->orWhere('his_id', 'like', "%{$search}%");
            });
        }

        $patients = $query->paginate(15);
        return response()->json($patients);
    }

    public function show($patientId): JsonResponse
    {
        $patient = Patient::with(['erVisits' => function($query) {
            $query->latest('arrival_time')->take(5);
        }])->findOrFail($patientId);

        return response()->json($patient);
    }

    public function store(Request $request, HIECoordinator $hieCoordinator): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'patient_id' => 'required|string|unique:patients,patient_id',
            'his_id' => 'nullable|string',
            'philsys_id' => 'nullable|string',
            'philhealth_id' => 'nullable|string',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'sex' => 'required|in:Male,Female',
            'birthday' => 'required|date|before:today',
            'blood_type' => 'nullable|string',
            'contact_number' => 'nullable|string',
            'address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_number' => 'nullable|string',
            'insurance_provider' => 'nullable|string',
            'insurance_number' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $patient = Patient::create($request->all());
        
        // Register patient with HIE systems asynchronously
        try {
            if (config('hie.enabled')) {
                $hieResult = $hieCoordinator->registerPatient($patient);
                $patient->load('erVisits'); // Reload with HIE data
                
                return response()->json([
                    'patient' => $patient,
                    'hie_registration' => $hieResult
                ], 201);
            }
        } catch (\Exception $e) {
            Log::warning('HIE registration failed for new patient', [
                'patient_id' => $patient->patient_id,
                'error' => $e->getMessage()
            ]);
            // Continue without HIE registration - will be retried later
        }
        
        return response()->json($patient, 201);
    }

    public function update(Request $request, $patientId): JsonResponse
    {
        $patient = Patient::findOrFail($patientId);

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'sex' => 'sometimes|required|in:Male,Female',
            'birthday' => 'sometimes|required|date|before:today',
            'blood_type' => 'nullable|string',
            'contact_number' => 'nullable|string',
            'address' => 'nullable|string',
            'emergency_contact_name' => 'nullable|string',
            'emergency_contact_number' => 'nullable|string',
            'insurance_provider' => 'nullable|string',
            'insurance_number' => 'nullable|string'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $patient->update($request->all());
        return response()->json($patient);
    }

    public function getFromHIS($hisId): JsonResponse
    {
        // This would integrate with the Hospital Information System
        // For now, returning a mock response
        return response()->json([
            'message' => 'HIS integration endpoint',
            'his_id' => $hisId
        ]);
    }
}
