<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\HIE\HIECoordinator;
use App\Models\Patient;
use App\Models\ErVisit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class HIEController extends Controller
{
    protected HIECoordinator $coordinator;

    public function __construct(HIECoordinator $coordinator)
    {
        $this->coordinator = $coordinator;
    }

    /**
     * Get HIE system health status
     */
    public function health(): JsonResponse
    {
        $health = $this->coordinator->healthCheck();
        
        $overallStatus = ($health['patient_registry']['available'] && $health['shrr']['available'])
            ? 'healthy'
            : 'degraded';
        
        return response()->json([
            'status' => $overallStatus,
            'services' => $health,
            'timestamp' => now()->toIso8601String()
        ]);
    }

    /**
     * Search for patient across HIE systems
     */
    public function searchPatient(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'nullable|string',
            'last_name' => 'nullable|string',
            'date_of_birth' => 'nullable|date',
            'philsys_id' => 'nullable|string',
            'philhealth_id' => 'nullable|string',
            'phone' => 'nullable|string',
            'query' => 'nullable|string|max:255',
            'limit' => 'nullable|integer|min:1|max:50',
        ]);

        try {
            $criteria = collect($validated)
                ->only(['first_name', 'last_name', 'date_of_birth', 'philsys_id', 'philhealth_id', 'phone'])
                ->filter()
                ->toArray();

            if (!empty($validated['query'])) {
                $query = trim($validated['query']);

                // Quick heuristics to map generic query into structured criteria
                if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $query)) {
                    $criteria['date_of_birth'] = $query;
                } elseif (preg_match('/^[0-9\-]{10,}$/', $query)) {
                    // Likely a national identifier or phone number
                    if (str_contains($query, '-')) {
                        $criteria['philhealth_id'] = $query;
                    } elseif (strlen(preg_replace('/\D/', '', $query)) >= 10) {
                        $criteria['phone'] = $query;
                    }
                } else {
                    $parts = preg_split('/\s+/', $query);
                    if (count($parts) === 1) {
                        $criteria['first_name'] = $parts[0];
                    } else {
                        $criteria['first_name'] = array_shift($parts);
                        $criteria['last_name'] = implode(' ', $parts);
                    }
                }
            }

            if (empty($criteria)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'count' => 0
                ]);
            }

            if (!empty($validated['limit'])) {
                $criteria['limit'] = (int) $validated['limit'];
            }

            $results = $this->coordinator->searchPatient($criteria);
            
            return response()->json([
                'success' => true,
                'data' => $results,
                'count' => count($results)
            ]);
        } catch (\Exception $e) {
            Log::error('HIE API: Patient search failed', [
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to search HIE systems',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sync patient from HIE
     */
    public function syncPatient(Request $request): JsonResponse
    {
        $request->validate([
            'registry_uuid' => 'required|uuid'
        ]);

        try {
            $patient = $this->coordinator->syncPatientFromHIE($request->input('registry_uuid'));
            
            if ($patient) {
                return response()->json([
                    'success' => true,
                    'patient' => $patient,
                    'message' => 'Patient synced successfully'
                ]);
            }
            
            return response()->json([
                'success' => false,
                'error' => 'Patient not found in HIE'
            ], 404);
            
        } catch (\Exception $e) {
            Log::error('HIE API: Patient sync failed', [
                'registry_uuid' => $request->input('registry_uuid'),
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to sync patient from HIE',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get patient history from HIE
     */
    public function getPatientHistory($patientId): JsonResponse
    {
        try {
            $patient = Patient::findOrFail($patientId);
            
            $history = $this->coordinator->getPatientHistory($patient, [
                'encounters' => 10,
                'observations' => 20,
                'conditions' => 10,
                'local_limit' => 5
            ]);
            
            return response()->json([
                'success' => true,
                'data' => $history
            ]);
            
        } catch (\Exception $e) {
            Log::error('HIE API: Failed to get patient history', [
                'patient_id' => $patientId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to retrieve patient history',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Submit ER visit to HIE manually
     */
    public function submitErVisit($visitId): JsonResponse
    {
        try {
            $visit = ErVisit::with('patient')->findOrFail($visitId);
            
            // Check if already submitted
            if ($visit->hie_submitted) {
                return response()->json([
                    'success' => false,
                    'message' => 'Visit already submitted to HIE',
                    'submitted_at' => $visit->hie_submitted_at
                ], 400);
            }
            
            $result = $this->coordinator->submitErVisit($visit);
            
            return response()->json([
                'success' => true,
                'message' => 'ER visit submitted to HIE successfully',
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            Log::error('HIE API: Failed to submit ER visit', [
                'visit_id' => $visitId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to submit ER visit to HIE',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Register patient with HIE
     */
    public function registerPatient($patientId): JsonResponse
    {
        try {
            $patient = Patient::findOrFail($patientId);
            
            // Check if already registered
            if ($patient->registry_uuid) {
                return response()->json([
                    'success' => false,
                    'message' => 'Patient already registered in HIE',
                    'registry_uuid' => $patient->registry_uuid,
                    'synced_at' => $patient->hie_synced_at
                ], 400);
            }
            
            $result = $this->coordinator->registerPatient($patient);
            
            return response()->json([
                'success' => true,
                'message' => 'Patient registered with HIE successfully',
                'data' => $result
            ]);
            
        } catch (\Exception $e) {
            Log::error('HIE API: Failed to register patient', [
                'patient_id' => $patientId,
                'error' => $e->getMessage()
            ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to register patient with HIE',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get retry queue status
     */
    public function retryQueue(): JsonResponse
    {
        $queue = \DB::table('hie_retry_queue')
            ->select('type', 'status', \DB::raw('count(*) as count'))
            ->groupBy('type', 'status')
            ->get();
        
        $recent = \DB::table('hie_retry_queue')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();
        
        return response()->json([
            'summary' => $queue,
            'recent' => $recent
        ]);
    }

    /**
     * Retry failed HIE submission
     */
    public function retryFailedSubmission($queueId): JsonResponse
    {
        $item = \DB::table('hie_retry_queue')->find($queueId);
        
        if (!$item) {
            return response()->json([
                'success' => false,
                'error' => 'Queue item not found'
            ], 404);
        }
        
        if ($item->status !== 'failed') {
            return response()->json([
                'success' => false,
                'error' => 'Only failed items can be retried'
            ], 400);
        }
        
        try {
            $data = json_decode($item->data, true);
            
            if ($item->type === 'patient_registration') {
                $patient = Patient::find($data['patient_id']);
                if ($patient) {
                    $this->coordinator->registerPatient($patient);
                }
            } elseif ($item->type === 'visit_submission') {
                $visit = ErVisit::with('patient')->find($data['visit_id']);
                if ($visit) {
                    $this->coordinator->submitErVisit($visit);
                }
            }
            
            // Mark as completed
            \DB::table('hie_retry_queue')
                ->where('id', $queueId)
                ->update([
                    'status' => 'completed',
                    'updated_at' => now()
                ]);
            
            return response()->json([
                'success' => true,
                'message' => 'Retry successful'
            ]);
            
        } catch (\Exception $e) {
            // Update retry attempt
            \DB::table('hie_retry_queue')
                ->where('id', $queueId)
                ->update([
                    'attempts' => $item->attempts + 1,
                    'last_attempt_at' => now(),
                    'last_error' => $e->getMessage(),
                    'updated_at' => now()
                ]);
            
            return response()->json([
                'success' => false,
                'error' => 'Retry failed',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
