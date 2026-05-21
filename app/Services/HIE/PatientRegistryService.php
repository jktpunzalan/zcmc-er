<?php

namespace App\Services\HIE;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Models\Patient;
use Exception;

class PatientRegistryService
{
    protected string $baseUrl;
    protected ?string $token;
    protected string $correlationPrefix;
    protected int $timeout;

    public function __construct()
    {
        $this->baseUrl = rtrim(config('hie.patient_registry.base_url'), '/');
        $this->token = config('hie.patient_registry.token') ?: '';
        $this->correlationPrefix = config('hie.patient_registry.correlation_prefix');
        $this->timeout = config('hie.patient_registry.timeout', 30);
    }

    /**
     * Resolve patient in the registry - find existing or create new
     */
    public function resolvePatient(Patient $patient): array
    {
        $cacheKey = "patient_registry:{$patient->patient_id}";
        
        // Check cache first
        if ($cached = Cache::get($cacheKey)) {
            Log::info('Patient Registry: Using cached UUID', [
                'patient_id' => $patient->patient_id,
                'registry_uuid' => $cached['patient_id']
            ]);
            return $cached;
        }

        $correlationId = $this->generateCorrelationId();
        
        $data = [
            'first_name' => $patient->first_name,
            'middle_name' => $patient->middle_name,
            'last_name' => $patient->last_name,
            'date_of_birth' => $patient->birthday->format('Y-m-d'),
            'sex' => $this->mapSex($patient->sex),
            'phone' => $patient->contact_number,
            'address_line' => $patient->address,
        ];

        // Add national identifiers if available
        if ($patient->philsys_id) {
            $data['philsys_id'] = $patient->philsys_id;
        }
        
        if ($patient->philhealth_id) {
            $data['philhealth_id'] = $patient->philhealth_id;
        }

        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->token}",
                    'X-Correlation-ID' => $correlationId,
                    'Content-Type' => 'application/json',
                ])
                ->post("{$this->baseUrl}/patients/resolve", $data);

            if ($response->successful()) {
                $result = $response->json();
                
                // Handle multiple matches
                if ($response->status() === 409) {
                    Log::warning('Patient Registry: Multiple matches found', [
                        'patient_id' => $patient->patient_id,
                        'candidates' => $result['errors']['candidates'] ?? []
                    ]);
                    
                    throw new Exception('Multiple patient matches found. Manual resolution required.');
                }

                // Update local patient with registry UUID
                if (isset($result['data']['patient_id'])) {
                    $patient->registry_uuid = $result['data']['patient_id'];
                    $patient->save();
                    
                    // Cache the result
                    Cache::put($cacheKey, $result['data'], config('hie.patient_registry.cache_ttl'));
                    
                    Log::info('Patient Registry: Patient resolved', [
                        'patient_id' => $patient->patient_id,
                        'registry_uuid' => $result['data']['patient_id'],
                        'matched_by' => $result['matched_by'] ?? 'unknown'
                    ]);
                }

                return $result['data'];
            }

            throw new Exception("Patient Registry API error: {$response->status()} - {$response->body()}");

        } catch (Exception $e) {
            Log::error('Patient Registry: Resolution failed', [
                'patient_id' => $patient->patient_id,
                'error' => $e->getMessage(),
                'correlation_id' => $correlationId
            ]);
            
            throw $e;
        }
    }

    /**
     * Get patient details by UUID
     */
    public function getPatient(string $uuid): array
    {
        $correlationId = $this->generateCorrelationId();
        
        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->token}",
                    'X-Correlation-ID' => $correlationId,
                ])
                ->get("{$this->baseUrl}/patients/{$uuid}");

            if ($response->successful()) {
                return $response->json()['data'];
            }

            if ($response->status() === 404) {
                throw new Exception("Patient not found in registry: {$uuid}");
            }

            throw new Exception("Patient Registry API error: {$response->status()}");

        } catch (Exception $e) {
            Log::error('Patient Registry: Get patient failed', [
                'uuid' => $uuid,
                'error' => $e->getMessage(),
                'correlation_id' => $correlationId
            ]);
            
            throw $e;
        }
    }

    /**
     * Search for patients
     */
    public function searchPatients(array $criteria): array
    {
        $correlationId = $this->generateCorrelationId();
        
        try {
            $response = Http::timeout($this->timeout)
                ->withHeaders([
                    'Authorization' => "Bearer {$this->token}",
                    'X-Correlation-ID' => $correlationId,
                ])
                ->get("{$this->baseUrl}/patients/search", $criteria);

            if ($response->successful()) {
                return $response->json()['data'] ?? [];
            }

            throw new Exception("Patient Registry API error: {$response->status()}");

        } catch (Exception $e) {
            Log::error('Patient Registry: Search failed', [
                'criteria' => $criteria,
                'error' => $e->getMessage(),
                'correlation_id' => $correlationId
            ]);
            
            throw $e;
        }
    }

    /**
     * Handle rate limiting with exponential backoff
     */
    public function withRetry(callable $callback, int $maxRetries = 3)
    {
        $attempt = 0;
        $baseDelay = 1000; // 1 second
        
        while ($attempt < $maxRetries) {
            try {
                return $callback();
            } catch (Exception $e) {
                $attempt++;
                
                if ($attempt >= $maxRetries) {
                    throw $e;
                }
                
                // Check if it's a rate limit error
                if (str_contains($e->getMessage(), '429')) {
                    $delay = $baseDelay * pow(2, $attempt);
                    Log::info("Patient Registry: Rate limited, retrying after {$delay}ms", [
                        'attempt' => $attempt
                    ]);
                    usleep($delay * 1000);
                } else {
                    throw $e;
                }
            }
        }
    }

    /**
     * Map local sex values to registry format
     */
    protected function mapSex(string $sex): string
    {
        return match(strtolower($sex)) {
            'male' => 'M',
            'female' => 'F',
            default => 'Unknown'
        };
    }

    /**
     * Generate correlation ID for request tracking
     */
    protected function generateCorrelationId(): string
    {
        return sprintf(
            '%s-%s-%s',
            $this->correlationPrefix,
            date('Ymd'),
            uniqid()
        );
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
