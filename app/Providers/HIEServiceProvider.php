<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\HIE\PatientRegistryService;
use App\Services\HIE\SHRRService;
use App\Services\HIE\HIECoordinator;

class HIEServiceProvider extends ServiceProvider
{
    /**
     * Register services.
     */
    public function register(): void
    {
        // Register PatientRegistryService as singleton
        $this->app->singleton(PatientRegistryService::class, function ($app) {
            return new PatientRegistryService();
        });

        // Register SHRRService as singleton
        $this->app->singleton(SHRRService::class, function ($app) {
            return new SHRRService($app->make(PatientRegistryService::class));
        });

        // Register HIECoordinator as singleton
        $this->app->singleton(HIECoordinator::class, function ($app) {
            return new HIECoordinator(
                $app->make(PatientRegistryService::class),
                $app->make(SHRRService::class)
            );
        });
    }

    /**
     * Bootstrap services.
     */
    public function boot(): void
    {
        // Publish configuration file
        $this->publishes([
            __DIR__.'/../../config/hie.php' => config_path('hie.php'),
        ], 'hie-config');

        // Register custom logging channel for HIE
        $this->app->make('config')->set('logging.channels.hie', [
            'driver' => 'daily',
            'path' => storage_path('logs/hie.log'),
            'level' => env('HIE_LOG_LEVEL', 'info'),
            'days' => 14,
        ]);
    }
}
