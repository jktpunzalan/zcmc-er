<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\HIE\HIECoordinator;
use App\Models\Patient;
use App\Models\ErVisit;
use Illuminate\Support\Facades\DB;

class HIEProcessRetryQueueCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hie:process-retry-queue 
                            {--limit=10 : Number of items to process}
                            {--type= : Process only specific type (patient_registration, visit_submission)}
                            {--clear-completed : Clear completed items from queue}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process failed HIE submissions in the retry queue';

    protected HIECoordinator $coordinator;

    /**
     * Create a new command instance.
     */
    public function __construct(HIECoordinator $coordinator)
    {
        parent::__construct();
        $this->coordinator = $coordinator;
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        if ($this->option('clear-completed')) {
            return $this->clearCompleted();
        }

        $query = DB::table('hie_retry_queue')
            ->where('status', 'failed')
            ->orderBy('created_at', 'asc')
            ->limit($this->option('limit'));

        if ($type = $this->option('type')) {
            $query->where('type', $type);
        }

        $items = $query->get();

        if ($items->isEmpty()) {
            $this->info('No failed items in retry queue');
            return 0;
        }

        $this->info("Processing {$items->count()} items from retry queue...");
        $bar = $this->output->createProgressBar($items->count());

        $success = 0;
        $failed = 0;

        foreach ($items as $item) {
            $bar->advance();
            
            try {
                $this->processItem($item);
                
                // Mark as completed
                DB::table('hie_retry_queue')
                    ->where('id', $item->id)
                    ->update([
                        'status' => 'completed',
                        'updated_at' => now()
                    ]);
                
                $success++;
                
            } catch (\Exception $e) {
                // Update retry attempt
                DB::table('hie_retry_queue')
                    ->where('id', $item->id)
                    ->update([
                        'attempts' => $item->attempts + 1,
                        'last_attempt_at' => now(),
                        'last_error' => $e->getMessage(),
                        'status' => $item->attempts >= 5 ? 'abandoned' : 'failed',
                        'updated_at' => now()
                    ]);
                
                $failed++;
                
                $this->line('');
                $this->warn("Failed to process item {$item->id}: {$e->getMessage()}");
            }
        }

        $bar->finish();
        $this->line('');
        
        $this->info("Processing complete:");
        $this->line("  Successful: {$success}");
        $this->line("  Failed: {$failed}");

        // Show queue status
        $this->showQueueStatus();

        return $failed > 0 ? 1 : 0;
    }

    protected function processItem($item): void
    {
        $data = json_decode($item->data, true);

        switch ($item->type) {
            case 'patient_registration':
                $patient = Patient::find($data['patient_id'] ?? null);
                if (!$patient) {
                    throw new \Exception("Patient not found: " . ($data['patient_id'] ?? 'unknown'));
                }
                $this->coordinator->registerPatient($patient);
                break;

            case 'visit_submission':
                $visit = ErVisit::with('patient')->find($data['visit_id'] ?? null);
                if (!$visit) {
                    throw new \Exception("Visit not found: " . ($data['visit_id'] ?? 'unknown'));
                }
                $this->coordinator->submitErVisit($visit);
                break;

            default:
                throw new \Exception("Unknown item type: {$item->type}");
        }
    }

    protected function clearCompleted(): int
    {
        $deleted = DB::table('hie_retry_queue')
            ->where('status', 'completed')
            ->delete();

        $this->info("Cleared {$deleted} completed items from retry queue");
        
        $this->showQueueStatus();
        
        return 0;
    }

    protected function showQueueStatus(): void
    {
        $stats = DB::table('hie_retry_queue')
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get();

        $this->line('');
        $this->info('Queue Status:');
        foreach ($stats as $stat) {
            $color = match($stat->status) {
                'completed' => 'green',
                'pending' => 'yellow',
                'failed' => 'red',
                'abandoned' => 'magenta',
                default => 'white'
            };
            $this->line("  <fg={$color}>{$stat->status}: {$stat->count}</>");
        }
    }
}
