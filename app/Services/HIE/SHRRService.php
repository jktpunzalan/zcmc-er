<?php

namespace App\Services\HIE;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Models\ErVisit;
use App\Models\Patient;
use Exception;

class SHRRService
{
    protected string $baseUrl;
    protected ?string $token;
    protected int $timeout;
    protected PatientRegistryService $registryService;

    public function __construct(PatientRegistryService $registryService)
    {
        $this->baseUrl = rtrim(config('hie.shrr.base_url'), '/');
        $this->token = config('hie.shrr.token') ?: '';
        $this->timeout = config('hie.shrr.timeout', 30);
        $this->registryService = $registryService;
    }

    /**
     * Ensure patient exists in SHRR
     */
    public function ensurePatient(string $registryUuid): array
    {
        $cacheKey = "shrr_patient:{$registryUuid}";
        
        // Check cache first
        if ($cached = Cache::get($cacheKey)) {
            Log::info('SHRR: Using cached FHIR patient ID', [
                'registry_uuid' => $registryUuid,
                'fhir_patient_id' => $cached['fhir_patient_id']
            ]);
            return $cached;
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->token}",
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/patients/{$registryUuid}/ensure");

            if ($response->successful()) {
                $result = $response->json();
                
                // Cache the FHIR patient ID
                Cache::put($cacheKey, $result, config('hie.shrr.cache_ttl'));
                
                Log::info('SHRR: Patient ensured', [
                    'registry_uuid' => $registryUuid,
                    'fhir_patient_id' => $result['fhir_patient_id'],
                    'status' => $result['status']
                ]);

                return $result;
            }

            throw new Exception("SHRR API error: {$response->status()} - {$response->body()}");

        } catch (Exception $e) {
            Log::error('SHRR: Ensure patient failed', [
                'registry_uuid' => $registryUuid,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Submit FHIR bundle for an ER visit
     */
    public function submitErVisitBundle(ErVisit $visit): array
    {
        // Ensure patient has registry UUID
        if (!$visit->patient->registry_uuid) {
            $registryData = $this->registryService->resolvePatient($visit->patient);
            $visit->patient->registry_uuid = $registryData['patient_id'];
            $visit->patient->save();
        }

        // Ensure patient exists in SHRR
        $shrPatient = $this->ensurePatient($visit->patient->registry_uuid);
        
        // Build FHIR bundle
        $bundle = $this->buildErVisitBundle($visit, $shrPatient['fhir_patient_id']);

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->token}",
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/patients/{$visit->patient->registry_uuid}/bundle", [
                    'bundle' => $bundle
                ]);

            if ($response->successful()) {
                $result = $response->json();
                
                // Store SHRR reference
                $visit->shrr_encounter_id = $result['encounter_id'] ?? null;
                $visit->shrr_submitted_at = now();
                $visit->save();
                
                Log::info('SHRR: Bundle submitted successfully', [
                    'visit_id' => $visit->visit_id,
                    'registry_uuid' => $visit->patient->registry_uuid,
                    'resources_created' => count($bundle['entry'])
                ]);

                return $result;
            }

            throw new Exception("SHRR API error: {$response->status()} - {$response->body()}");

        } catch (Exception $e) {
            Log::error('SHRR: Bundle submission failed', [
                'visit_id' => $visit->visit_id,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Build FHIR bundle for ER visit
     */
    protected function buildErVisitBundle(ErVisit $visit, string $fhirPatientId): array
    {
        $bundle = [
            'resourceType' => 'Bundle',
            'type' => 'transaction',
            'entry' => []
        ];

        // Add Encounter resource
        $encounter = $this->buildEncounterResource($visit, $fhirPatientId);
        $bundle['entry'][] = [
            'resource' => $encounter,
            'request' => [
                'method' => 'POST',
                'url' => 'Encounter'
            ]
        ];

        // Add Triage Assessment as Observation
        if ($visit->triageAssessment) {
            $triageObs = $this->buildTriageObservation($visit->triageAssessment, $fhirPatientId);
            $bundle['entry'][] = [
                'resource' => $triageObs,
                'request' => [
                    'method' => 'POST',
                    'url' => 'Observation'
                ]
            ];
        }

        // Add Vital Signs
        foreach ($visit->vitalSigns as $vitalSign) {
            $vitalObs = $this->buildVitalSignObservation($vitalSign, $fhirPatientId);
            $bundle['entry'][] = [
                'resource' => $vitalObs,
                'request' => [
                    'method' => 'POST',
                    'url' => 'Observation'
                ]
            ];
        }

        // Add Chief Complaint as Condition
        if ($visit->chief_complaint) {
            $condition = $this->buildChiefComplaintCondition($visit, $fhirPatientId);
            $bundle['entry'][] = [
                'resource' => $condition,
                'request' => [
                    'method' => 'POST',
                    'url' => 'Condition'
                ]
            ];
        }

        // Add Clinical Notes
        foreach ($visit->clinicalNotes as $note) {
            $documentRef = $this->buildClinicalNoteDocument($note, $fhirPatientId);
            $bundle['entry'][] = [
                'resource' => $documentRef,
                'request' => [
                    'method' => 'POST',
                    'url' => 'DocumentReference'
                ]
            ];
        }

        return $bundle;
    }

    /**
     * Build FHIR Encounter resource
     */
    protected function buildEncounterResource(ErVisit $visit, string $fhirPatientId): array
    {
        $encounterClass = config("hie.fhir_mappings.encounter_class.{$visit->visit_type}", 'EMER');
        
        $encounter = [
            'resourceType' => 'Encounter',
            'status' => $this->mapVisitStatus($visit->status),
            'class' => [
                'system' => 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
                'code' => $encounterClass
            ],
            'subject' => [
                'reference' => "Patient/{$fhirPatientId}"
            ],
            'period' => [
                'start' => $visit->arrival_time->toIso8601String()
            ],
            'reasonCode' => [
                [
                    'text' => $visit->chief_complaint
                ]
            ]
        ];

        if ($visit->departure_time) {
            $encounter['period']['end'] = $visit->departure_time->toIso8601String();
        }

        // Add participants (physician and nurse)
        if ($visit->attendingPhysician) {
            $encounter['participant'][] = [
                'type' => [
                    [
                        'coding' => [
                            [
                                'system' => 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                                'code' => 'ATND',
                                'display' => 'attender'
                            ]
                        ]
                    ]
                ],
                'individual' => [
                    'display' => $visit->attendingPhysician->full_name
                ]
            ];
        }

        if ($visit->primaryNurse) {
            $encounter['participant'][] = [
                'type' => [
                    [
                        'coding' => [
                            [
                                'system' => 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                                'code' => 'PPRF',
                                'display' => 'primary performer'
                            ]
                        ]
                    ]
                ],
                'individual' => [
                    'display' => $visit->primaryNurse->full_name
                ]
            ];
        }

        // Add location (bed assignment)
        if ($visit->assigned_bed) {
            $encounter['location'][] = [
                'location' => [
                    'display' => "Emergency Room - Bed {$visit->assigned_bed}"
                ]
            ];
        }

        return $encounter;
    }

    /**
     * Build FHIR Observation for triage assessment
     */
    protected function buildTriageObservation($triage, string $fhirPatientId): array
    {
        $triageMapping = config("hie.fhir_mappings.triage_level.{$triage->triage_level}");
        
        return [
            'resourceType' => 'Observation',
            'status' => 'final',
            'category' => [
                [
                    'coding' => [
                        [
                            'system' => 'http://terminology.hl7.org/CodeSystem/observation-category',
                            'code' => 'exam',
                            'display' => 'Exam'
                        ]
                    ]
                ]
            ],
            'code' => [
                'coding' => [
                    [
                        'system' => 'http://loinc.org',
                        'code' => '75199-7',
                        'display' => 'Emergency department triage assessment'
                    ]
                ],
                'text' => 'Triage Assessment'
            ],
            'subject' => [
                'reference' => "Patient/{$fhirPatientId}"
            ],
            'effectiveDateTime' => $triage->triage_time->toIso8601String(),
            'valueCodeableConcept' => [
                'coding' => [
                    [
                        'system' => $triageMapping['system'],
                        'code' => $triageMapping['code'],
                        'display' => $triageMapping['display']
                    ]
                ]
            ],
            'component' => []
        ];
    }

    /**
     * Build FHIR Observation for vital sign
     */
    protected function buildVitalSignObservation($vitalSign, string $fhirPatientId): array
    {
        // This would map specific vital sign types to LOINC codes
        // Implementation would depend on your VitalSign model structure
        return [
            'resourceType' => 'Observation',
            'status' => 'final',
            'category' => [
                [
                    'coding' => [
                        [
                            'system' => 'http://terminology.hl7.org/CodeSystem/observation-category',
                            'code' => 'vital-signs',
                            'display' => 'Vital Signs'
                        ]
                    ]
                ]
            ],
            'subject' => [
                'reference' => "Patient/{$fhirPatientId}"
            ],
            'effectiveDateTime' => $vitalSign->recorded_at->toIso8601String()
        ];
    }

    /**
     * Build FHIR Condition for chief complaint
     */
    protected function buildChiefComplaintCondition(ErVisit $visit, string $fhirPatientId): array
    {
        return [
            'resourceType' => 'Condition',
            'clinicalStatus' => [
                'coding' => [
                    [
                        'system' => 'http://terminology.hl7.org/CodeSystem/condition-clinical',
                        'code' => 'active'
                    ]
                ]
            ],
            'verificationStatus' => [
                'coding' => [
                    [
                        'system' => 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
                        'code' => 'provisional'
                    ]
                ]
            ],
            'category' => [
                [
                    'coding' => [
                        [
                            'system' => 'http://terminology.hl7.org/CodeSystem/condition-category',
                            'code' => 'encounter-diagnosis'
                        ]
                    ]
                ]
            ],
            'subject' => [
                'reference' => "Patient/{$fhirPatientId}"
            ],
            'encounter' => [
                'reference' => "Encounter/{{encounter_id}}"
            ],
            'onsetDateTime' => $visit->arrival_time->toIso8601String(),
            'note' => [
                [
                    'text' => "Chief Complaint: {$visit->chief_complaint}"
                ]
            ]
        ];
    }

    /**
     * Build FHIR DocumentReference for clinical note
     */
    protected function buildClinicalNoteDocument($note, string $fhirPatientId): array
    {
        return [
            'resourceType' => 'DocumentReference',
            'status' => 'current',
            'type' => [
                'coding' => [
                    [
                        'system' => 'http://loinc.org',
                        'code' => '34133-9',
                        'display' => 'Summary of episode note'
                    ]
                ]
            ],
            'subject' => [
                'reference' => "Patient/{$fhirPatientId}"
            ],
            'date' => $note->created_at->toIso8601String(),
            'content' => [
                [
                    'attachment' => [
                        'contentType' => 'text/plain',
                        'data' => base64_encode($note->note_content)
                    ]
                ]
            ]
        ];
    }

    /**
     * Get patient summary from SHRR
     */
    public function getPatientSummary(string $registryUuid, array $limits = []): array
    {
        $defaultLimits = [
            'encounters' => 5,
            'observations' => 10,
            'conditions' => 10
        ];

        $limits = array_merge($defaultLimits, $limits);

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->token}",
                ])
                ->get("{$this->baseUrl}/patients/{$registryUuid}/summary", $limits);

            if ($response->successful()) {
                return $response->json();
            }

            throw new Exception("SHRR API error: {$response->status()}");

        } catch (Exception $e) {
            Log::error('SHRR: Get patient summary failed', [
                'registry_uuid' => $registryUuid,
                'error' => $e->getMessage()
            ]);
            
            throw $e;
        }
    }

    /**
     * Map visit status to FHIR encounter status
     */
    protected function mapVisitStatus(string $status): string
    {
        return match($status) {
            'Waiting', 'Triaged' => 'arrived',
            'In_Treatment', 'Under_Observation' => 'in-progress',
            'Admitted' => 'finished',
            'Discharged' => 'finished',
            'Transferred' => 'finished',
            'Left_AMA' => 'cancelled',
            default => 'unknown'
        };
    }

    /**
     * Check if service is available
     */
    public function healthCheck(): bool
    {
        try {
            $response = Http::timeout(5)
                ->get("{$this->baseUrl}/health");
            
            return $response->successful();
        } catch (Exception $e) {
            return false;
        }
    }
}
