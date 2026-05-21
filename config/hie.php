<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Health Information Exchange Configuration
    |--------------------------------------------------------------------------
    |
    | This file configures the integration with Patient Registry and SHRR
    | HIE systems for the Emergency Room Point-of-Service application.
    |
    */

    'enabled' => env('HIE_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Patient Registry Configuration
    |--------------------------------------------------------------------------
    |
    | The Patient Registry is the Master Patient Index that resolves patient
    | identity across multiple systems using a canonical UUID.
    |
    */
    'patient_registry' => [
        'base_url' => env('PATIENT_REGISTRY_URL', 'http://localhost:8080/api/v1'),
        'token' => env('PATIENT_REGISTRY_TOKEN'),
        'correlation_prefix' => env('PATIENT_REGISTRY_CORRELATION_PREFIX', 'ER-ZCMC'),
        'timeout' => env('PATIENT_REGISTRY_TIMEOUT', 30),
        'rate_limits' => [
            'resolve' => 30, // per minute
            'search' => 10,  // per minute
        ],
        'cache_ttl' => 3600, // 1 hour for patient UUID cache
    ],

    /*
    |--------------------------------------------------------------------------
    | SHRR (Shared Health Record Repository) Configuration
    |--------------------------------------------------------------------------
    |
    | SHRR is the FHIR-based clinical data repository that stores all
    | clinical encounters, observations, conditions, and medications.
    |
    */
    'shrr' => [
        'base_url' => env('SHRR_BASE_URL', 'http://localhost:8080/api/v1'),
        'token' => env('SHRR_TOKEN'),
        'timeout' => env('SHRR_TIMEOUT', 30),
        'rate_limits' => [
            'ensure' => 60,   // per minute
            'bundle' => 60,   // per minute
            'summary' => 30,  // per minute
            'search' => 120,  // per minute
        ],
        'cache_ttl' => 600, // 10 minutes for FHIR patient ID cache
        'batch_size' => 20, // Maximum resources per bundle
    ],

    /*
    |--------------------------------------------------------------------------
    | Queue Configuration
    |--------------------------------------------------------------------------
    |
    | Configure how HIE submissions are queued and processed.
    |
    */
    'queue' => [
        'connection' => env('HIE_QUEUE_CONNECTION', 'database'),
        'queue' => env('HIE_QUEUE_NAME', 'hie'),
        'retry_after' => 300, // 5 minutes
        'max_attempts' => 3,
        'backoff' => [60, 120, 300], // Exponential backoff in seconds
    ],

    /*
    |--------------------------------------------------------------------------
    | FHIR Resource Mappings
    |--------------------------------------------------------------------------
    |
    | Map ER system concepts to FHIR resources.
    |
    */
    'fhir_mappings' => [
        'encounter_class' => [
            'Emergency' => 'EMER',
            'Urgent' => 'EMER',
            'Non-Urgent' => 'AMB',
        ],
        'triage_level' => [
            '1-Resuscitation' => [
                'code' => '1',
                'display' => 'Resuscitation',
                'system' => 'http://terminology.hl7.org/CodeSystem/v3-ActPriority',
            ],
            '2-Emergent' => [
                'code' => '2',
                'display' => 'Emergent',
                'system' => 'http://terminology.hl7.org/CodeSystem/v3-ActPriority',
            ],
            '3-Urgent' => [
                'code' => '3',
                'display' => 'Urgent',
                'system' => 'http://terminology.hl7.org/CodeSystem/v3-ActPriority',
            ],
            '4-Less_Urgent' => [
                'code' => '4',
                'display' => 'Less Urgent',
                'system' => 'http://terminology.hl7.org/CodeSystem/v3-ActPriority',
            ],
            '5-Non_Urgent' => [
                'code' => '5',
                'display' => 'Non-Urgent',
                'system' => 'http://terminology.hl7.org/CodeSystem/v3-ActPriority',
            ],
        ],
        'vital_signs' => [
            'blood_pressure_systolic' => [
                'code' => '8480-6',
                'display' => 'Systolic blood pressure',
                'system' => 'http://loinc.org',
            ],
            'blood_pressure_diastolic' => [
                'code' => '8462-4',
                'display' => 'Diastolic blood pressure',
                'system' => 'http://loinc.org',
            ],
            'heart_rate' => [
                'code' => '8867-4',
                'display' => 'Heart rate',
                'system' => 'http://loinc.org',
            ],
            'respiratory_rate' => [
                'code' => '9279-1',
                'display' => 'Respiratory rate',
                'system' => 'http://loinc.org',
            ],
            'temperature' => [
                'code' => '8310-5',
                'display' => 'Body temperature',
                'system' => 'http://loinc.org',
            ],
            'oxygen_saturation' => [
                'code' => '2708-6',
                'display' => 'Oxygen saturation',
                'system' => 'http://loinc.org',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Logging Configuration
    |--------------------------------------------------------------------------
    */
    'logging' => [
        'enabled' => env('HIE_LOGGING_ENABLED', true),
        'channel' => env('HIE_LOG_CHANNEL', 'hie'),
        'log_requests' => env('HIE_LOG_REQUESTS', true),
        'log_responses' => env('HIE_LOG_RESPONSES', false), // Be careful with PHI
    ],
];
