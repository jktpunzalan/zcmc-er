<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\HIE\HIECoordinator;

class HIEHealthCheckCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'hie:health-check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check the health status of HIE systems';

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
        $this->info('Checking HIE Systems Health...');
        
        $health = $this->coordinator->healthCheck();
        
        $this->line('');
        $this->info('HIE System Status:');
        $this->line('==================');
        
        // Check Patient Registry
        if ($health['patient_registry']['available']) {
            $this->line('✓ Patient Registry: <fg=green>ONLINE</>');
        } else {
            $this->line('✗ Patient Registry: <fg=red>OFFLINE</>');
        }
        $this->line('  URL: ' . $health['patient_registry']['url']);
        
        // Check SHRR
        if ($health['shrr']['available']) {
            $this->line('✓ SHRR: <fg=green>ONLINE</>');
        } else {
            $this->line('✗ SHRR: <fg=red>OFFLINE</>');
        }
        $this->line('  URL: ' . $health['shrr']['url']);
        
        // Overall status
        $this->line('');
        if ($health['enabled']) {
            $this->info('HIE Integration: ENABLED');
        } else {
            $this->warn('HIE Integration: DISABLED');
        }
        
        // Return appropriate exit code
        return ($health['patient_registry']['available'] && $health['shrr']['available']) ? 0 : 1;
    }
}
