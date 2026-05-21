<?php

namespace App\Services\HIE;

use App\Models\ErVisit;
use App\Models\Patient;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Exception;

class HIECoordinator
{
    protected PatientRegistryService $registryService;
    protected SHRRService $shrrService;

    public function __construct(
        PatientRegistryService $registryService,
        SHRRService $shrrService
    ) {
        $this->registryService = $registryService;
        $this->shrrService = $shrrService;
    }

    /**
     * Register patient in both HIE systems
     */
    public function registerPatient(Patient $patient): array
    {
        if (!config('hie.enabled')) {
            Log::info('HIE integration is disabled');
            return ['status' => 'disabled'];
        }

        DB::beginTransaction();
        
        try {
            // Step 1: Resolve patient in registry
            $registryResult = $this->registryService->resolvePatient($patient);
            
            // Step 2: Ensure patient exists in SHRR
            $shrrResult = $this->shrrService->ensurePatient($registryResult['patient_id']);
            
            // Update patient record with HIE identifiers
            $patient->update([
                'registry_uuid' => $registryResult['patient_id'],
                'shrr_patient_id' => $shrrResult['fhir_patient_id'],
                'hie_synced_at' => now()
            ]);
            
            DB::commit();
            
            Log::info('HIE: Patient registered successfully', [
                'patient_id' => $patient->patient_id,
                'registry_uuid' => $registryResult['patient_id'],
                'shrr_patient_id' => $shrrResult['fhir_patient_id']
            ]);
            
            return [
                'status' => 'success',
                'registry' => $registryResult,
                'shrr' => $shrrResult
            ];
            
        } catch (Exception $e) {
            DB::rollBack();
            
            Log::error('HIE: Patient registration failed', [
                'patient_id' => $patient->patient_id,
                'error' => $e->getMessage()
            ]);
            
            // Store for retry
            $this->queueForRetry('patient_registration', $patient);
            
            throw $e;
        }
    }

    /**
     * Submit ER visit data to HIE systems
     */
    public function submitErVisit(ErVisit $visit): array
    {
        if (!config('hie.enabled')) {
            Log::info('HIE integration is disabled');
            return ['status' => 'disabled'];
        }

        try {
            // Ensure patient is registered in HIE
            if (!$visit->patient->registry_uuid) {
                $this->registerPatient($visit->patient);
                $visit->patient->refresh();
            }
            
            // Submit clinical data to SHRR
            $result = $this->shrrService->submitErVisitBundle($visit);
            
            // Update visit with HIE submission status
            $visit->update([
                'hie_submitted' => true,
                'hie_submitted_at' => now(),
                'shrr_encounter_id' => $result['encounter_id'] ?? null
            ]);
            
            Log::info('HIE: ER visit submitted successfully', [
                'visit_id' => $visit->visit_id,
                'patient_id' => $visit->patient_id,
                'shrr_encounter_id' => $result['encounter_id'] ?? null
            ]);
            
            return $result;
            
        } catch (Exception $e) {
            Log::error('HIE: ER visit submission failed', [
                'visit_id' => $visit->visit_id,
                'error' => $e->getMessage()
            ]);
            
            // Store for retry
            $this->queueForRetry('visit_submission', $visit);
            
            throw $e;
        }
    }

    /**
     * Get comprehensive patient history from HIE
     */
    public function getPatientHistory(Patient $patient, array $options = []): array
    {
        if (!config('hie.enabled')) {
            return ['status' => 'disabled'];
        }

        try {
            $history = [
                'patient' => null,
                'summary' => null,
                'local_visits' => []
            ];
            
            // Get patient data from registry if UUID exists
            if ($patient->registry_uuid) {
                $history['patient'] = $this->registryService->getPatient($patient->registry_uuid);
                
                // Get clinical summary from SHRR
                $history['summary'] = $this->shrrService->getPatientSummary(
                    $patient->registry_uuid,
                    $options
                );
            }
            
            // Include local ER visits
            $history['local_visits'] = $patient->erVisits()
                ->with(['triageAssessment', 'vitalSigns', 'disposition'])
                ->latest('arrival_time')
                ->limit($options['local_limit'] ?? 10)
                ->get()
                ->toArray();
            
            return $history;
            
        } catch (Exception $e) {
            Log::error('HIE: Failed to get patient history', [
                'patient_id' => $patient->patient_id,
                'error' => $e->getMessage()
            ]);
            
            // Return local data only
            return [
                'patient' => null,
                'summary' => null,
                'local_visits' => $patient->erVisits()
                    ->latest('arrival_time')
                    ->limit(10)
                    ->get()
                    ->toArray(),
                'error' => 'HIE systems unavailable'
            ];
        }
    }

    /**
     * Search for patient across HIE systems
     */
    public function searchPatient(array $criteria): array
    {
        if (!config('hie.enabled')) {
            return [];
        }

        try {
            // Search in Patient Registry
            $registryResults = $this->registryService->searchPatients($criteria);
            
            // Map and enrich results with local data
            $results = [];
            foreach ($registryResults as $registryPatient) {
                $localPatient = Patient::where('registry_uuid', $registryPatient['patient_id'])->first();
                
                $results[] = [
                    'registry' => $registryPatient,
                    'local' => $localPatient ? $localPatient->toArray() : null,
                    'has_local_record' => $localPatient !== null
                ];
            }
            
            return $results;
            
        } catch (Exception $e) {
            Log::error('HIE: Patient search failed', [
                'criteria' => $criteria,
                'error' => $e->getMessage()
            ]);
            
            return [];
        }
    }

    /**
     * Sync patient data from HIE
     */
    public function syncPatientFromHIE(string $registryUuid): ?Patient
    {
        try {
            // Get patient from registry
            $registryData = $this->registryService->getPatient($registryUuid);
            
            // Find or create local patient
            $patient = Patient::firstOrNew(['registry_uuid' => $registryUuid]);
            
            // Update with registry data
            $patient->fill([
                'first_name' => $registryData['first_name'],
                'last_name' => $registryData['last_name'],
                'middle_name' => $registryData['middle_name'] ?? null,
                'sex' => $this->mapRegistrySex($registryData['sex']),
                'birthday' => $registryData['date_of_birth'],
                'contact_number' => $registryData['phone'] ?? null,
                'address' => $registryData['address_line'] ?? null,
                'philsys_id' => $registryData['philsys_id'] ?? null,
                'philhealth_id' => $registryData['philhealth_id'] ?? null,
                'hie_synced_at' => now()
            ]);
            
            if (!$patient->patient_id) {
                $patient->patient_id = $this->generatePatientId();
            }
            
            $patient->save();
            
            // Try to ensure patient exists in SHRR (optional)
            try {
                if (config('hie.shrr.base_url')) {
                    $shrrResult = $this->shrrService->ensurePatient($registryUuid);
                    if ($shrrResult && isset($shrrResult['fhir_patient_id'])) {
                        $patient->shrr_patient_id = $shrrResult['fhir_patient_id'];
                        $patient->save();
                    }
                }
            } catch (Exception $shrrError) {
                // Log but don't fail the sync
                Log::warning('HIE: Could not sync with SHRR during patient sync', [
                    'registry_uuid' => $registryUuid,
                    'error' => $shrrError->getMessage()
                ]);
            }
            
            Log::info('HIE: Patient synced from HIE', [
                'patient_id' => $patient->patient_id,
                'registry_uuid' => $registryUuid
            ]);
            
            return $patient;
            
        } catch (Exception $e) {
            Log::error('HIE: Failed to sync patient from HIE', [
                'registry_uuid' => $registryUuid,
                'error' => $e->getMessage()
            ]);
            
            return null;
        }
    }

    /**
     * Check HIE system health
     */
    public function healthCheck(): array
    {
        return [
            'patient_registry' => [
                'available' => $this->registryService->healthCheck(),
                'url' => config('hie.patient_registry.base_url')
            ],
            'shrr' => [
                'available' => $this->shrrService->healthCheck(),
                'url' => config('hie.shrr.base_url')
            ],
            'enabled' => config('hie.enabled')
        ];
    }

    /**
     * Queue failed operations for retry
     */
    protected function queueForRetry(string $type, $data): void
    {
        DB::table('hie_retry_queue')->insert([
            'type' => $type,
            'data' => json_encode($data),
            'attempts' => 0,
            'created_at' => now(),
            'updated_at' => now()
        ]);
    }

    /**
     * Map registry sex value to local format
     */
    protected function mapRegistrySex(string $sex): string
    {
        return match($sex) {
            'M' => 'Male',
            'F' => 'Female',
            default => 'Male' // Default value
        };
    }

    /**
     * Generate unique patient ID
     */
    protected function generatePatientId(): string
    {
        return 'ER' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
    }
}
