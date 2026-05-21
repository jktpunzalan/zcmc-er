<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\HIE\HIECoordinator;
use App\Models\Patient;

class HIESyncPatientCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hie:sync-patient 
                            {patient_id? : The local patient ID to sync}
                            {--registry-uuid= : The registry UUID to sync from HIE}
                            {--all : Sync all patients with registry UUIDs}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync patient data from HIE systems';

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
        if ($this->option('all')) {
            return $this->syncAllPatients();
        }

        if ($registryUuid = $this->option('registry-uuid')) {
            return $this->syncFromRegistry($registryUuid);
        }

        if ($patientId = $this->argument('patient_id')) {
            return $this->syncSpecificPatient($patientId);
        }

        $this->error('Please provide a patient ID, registry UUID, or use --all flag');
        return 1;
    }

    protected function syncSpecificPatient(string $patientId): int
    {
        $patient = Patient::find($patientId);
        
        if (!$patient) {
            $this->error("Patient not found: {$patientId}");
            return 1;
        }

        if (!$patient->registry_uuid) {
            $this->warn("Patient {$patientId} has no registry UUID. Attempting registration...");
            
            try {
                $this->coordinator->registerPatient($patient);
                $patient->refresh();
                $this->info("Patient registered successfully with UUID: {$patient->registry_uuid}");
            } catch (\Exception $e) {
                $this->error("Failed to register patient: {$e->getMessage()}");
                return 1;
            }
        }

        try {
            $history = $this->coordinator->getPatientHistory($patient);
            
            $this->info("Patient synced successfully:");
            $this->line("  Patient ID: {$patient->patient_id}");
            $this->line("  Registry UUID: {$patient->registry_uuid}");
            $this->line("  Name: {$patient->full_name}");
            
            if (isset($history['summary']['total'])) {
                $this->line("  Clinical Records: {$history['summary']['total']}");
            }
            
            return 0;
        } catch (\Exception $e) {
            $this->error("Failed to sync patient: {$e->getMessage()}");
            return 1;
        }
    }

    protected function syncFromRegistry(string $registryUuid): int
    {
        $this->info("Syncing patient from registry UUID: {$registryUuid}");
        
        try {
            $patient = $this->coordinator->syncPatientFromHIE($registryUuid);
            
            if ($patient) {
                $this->info("Patient synced successfully:");
                $this->line("  Patient ID: {$patient->patient_id}");
                $this->line("  Name: {$patient->full_name}");
                $this->line("  Registry UUID: {$patient->registry_uuid}");
                return 0;
            } else {
                $this->error("Patient not found in HIE");
                return 1;
            }
        } catch (\Exception $e) {
            $this->error("Failed to sync patient: {$e->getMessage()}");
            return 1;
        }
    }

    protected function syncAllPatients(): int
    {
        $patients = Patient::whereNotNull('registry_uuid')->get();
        
        if ($patients->isEmpty()) {
            $this->warn("No patients found with registry UUIDs");
            return 0;
        }

        $this->info("Syncing {$patients->count()} patients...");
        $bar = $this->output->createProgressBar($patients->count());
        
        $success = 0;
        $failed = 0;
        
        foreach ($patients as $patient) {
            try {
                $this->coordinator->getPatientHistory($patient);
                $success++;
            } catch (\Exception $e) {
                $failed++;
                $this->line('');
                $this->warn("Failed to sync patient {$patient->patient_id}: {$e->getMessage()}");
            }
            
            $bar->advance();
        }
        
        $bar->finish();
        $this->line('');
        $this->info("Sync complete: {$success} successful, {$failed} failed");
        
        return $failed > 0 ? 1 : 0;
    }
}
