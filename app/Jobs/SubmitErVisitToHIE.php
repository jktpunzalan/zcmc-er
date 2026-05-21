<?php

namespace App\Jobs;

use App\Models\ErVisit;
use App\Services\HIE\HIECoordinator;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Exception;

class SubmitErVisitToHIE implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public $tries = 3;
    public $backoff = [60, 120, 300]; // Exponential backoff
    
    protected ErVisit $visit;

    /**
     * Create a new job instance.
     */
    public function __construct(ErVisit $visit)
    {
        $this->visit = $visit;
        $this->queue = config('hie.queue.queue', 'hie');
    }

    /**
     * Execute the job.
     */
    public function handle(HIECoordinator $coordinator): void
    {
        try {
            // Skip if already submitted
            if ($this->visit->hie_submitted) {
                Log::info('HIE Job: Visit already submitted', [
                    'visit_id' => $this->visit->visit_id
                ]);
                return;
            }

            // Submit to HIE
            $result = $coordinator->submitErVisit($this->visit);
            
            Log::info('HIE Job: Visit submitted successfully', [
                'visit_id' => $this->visit->visit_id,
                'result' => $result
            ]);
            
        } catch (Exception $e) {
            Log::error('HIE Job: Submission failed', [
                'visit_id' => $this->visit->visit_id,
                'attempt' => $this->attempts(),
                'error' => $e->getMessage()
            ]);
            
            // If this is the last attempt, mark as failed in database
            if ($this->attempts() >= $this->tries) {
                $this->visit->update([
                    'hie_submitted' => false,
                    'hie_submitted_at' => now()
                ]);
                
                // Store in retry queue for manual intervention
                \DB::table('hie_retry_queue')->insert([
                    'type' => 'visit_submission',
                    'data' => json_encode([
                        'visit_id' => $this->visit->visit_id,
                        'patient_id' => $this->visit->patient_id
                    ]),
                    'attempts' => $this->attempts(),
                    'last_attempt_at' => now(),
                    'last_error' => $e->getMessage(),
                    'status' => 'failed',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }
            
            throw $e; // Re-throw to trigger retry
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(Exception $exception): void
    {
        Log::error('HIE Job: Final failure', [
            'visit_id' => $this->visit->visit_id,
            'exception' => $exception->getMessage()
        ]);
    }
}
