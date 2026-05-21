<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClinicalNote;
use App\Models\ErVisit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

class ClinicalNoteController extends Controller
{
    public function store(Request $request, string $visitId): JsonResponse
    {
        $visit = ErVisit::findOrFail($visitId);

        $validator = Validator::make($request->all(), [
            'note_type' => 'required|in:Physician,Nursing',
            'subjective' => 'nullable|string',
            'objective' => 'nullable|string',
            'assessment' => 'nullable|string',
            'plan' => 'nullable|string',
            'created_by' => 'required|exists:healthcare_workers,worker_id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $note = ClinicalNote::create([
            'note_id' => (string) Str::uuid(),
            'visit_id' => $visit->visit_id,
            'note_type' => $request->input('note_type'),
            'subjective' => $request->input('subjective'),
            'objective' => $request->input('objective'),
            'assessment' => $request->input('assessment'),
            'plan' => $request->input('plan'),
            'created_by' => $request->input('created_by'),
        ]);

        return response()->json($note->load('createdBy'), 201);
    }

    public function update(Request $request, string $noteId): JsonResponse
    {
        $note = ClinicalNote::findOrFail($noteId);

        $validator = Validator::make($request->all(), [
            'note_type' => 'sometimes|required|in:Physician,Nursing',
            'subjective' => 'nullable|string',
            'objective' => 'nullable|string',
            'assessment' => 'nullable|string',
            'plan' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors(),
            ], 422);
        }

        $note->fill($request->only([
            'note_type',
            'subjective',
            'objective',
            'assessment',
            'plan',
        ]));

        $note->save();

        return response()->json($note->load('createdBy'));
    }
}
