<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HealthcareWorker;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class HealthcareWorkerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = HealthcareWorker::query();

        if ($request->has('role')) {
            $query->where('role', $request->input('role'));
        }

        if ($request->has('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        if ($request->has('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('first_name', 'like', "%{$search}%")
                  ->orWhere('last_name', 'like', "%{$search}%")
                  ->orWhere('worker_id', 'like', "%{$search}%")
                  ->orWhere('license_no', 'like', "%{$search}%");
            });
        }

        $workers = $query->paginate(15);
        return response()->json($workers);
    }

    public function show($workerId): JsonResponse
    {
        $worker = HealthcareWorker::findOrFail($workerId);
        return response()->json($worker);
    }

    public function getFromHRIS($hrisId): JsonResponse
    {
        // This would integrate with the HRIS system
        // For now, returning a mock response
        return response()->json([
            'message' => 'HRIS integration endpoint',
            'hris_id' => $hrisId
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'worker_id' => 'required|string|unique:healthcare_workers,worker_id',
            'hris_id' => 'nullable|string',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'role' => 'required|in:Emergency_Physician,ER_Nurse,Triage_Nurse,ER_Admin,Technician',
            'license_no' => 'nullable|string',
            'specialization' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $worker = HealthcareWorker::create($request->all());
        return response()->json($worker, 201);
    }

    public function update(Request $request, $workerId): JsonResponse
    {
        $worker = HealthcareWorker::findOrFail($workerId);

        $validator = Validator::make($request->all(), [
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'middle_name' => 'nullable|string|max:255',
            'role' => 'sometimes|required|in:Emergency_Physician,ER_Nurse,Triage_Nurse,ER_Admin,Technician',
            'license_no' => 'nullable|string',
            'specialization' => 'nullable|string',
            'is_active' => 'boolean'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $worker->update($request->all());
        return response()->json($worker);
    }

    public function getPhysicians(): JsonResponse
    {
        $physicians = HealthcareWorker::where('role', 'Emergency_Physician')
            ->where('is_active', true)
            ->get();
        
        return response()->json($physicians);
    }

    public function getNurses(): JsonResponse
    {
        $nurses = HealthcareWorker::whereIn('role', ['ER_Nurse', 'Triage_Nurse'])
            ->where('is_active', true)
            ->get();
        
        return response()->json($nurses);
    }
}
