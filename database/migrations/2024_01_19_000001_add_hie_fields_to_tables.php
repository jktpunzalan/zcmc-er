<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Add HIE fields to patients table
        Schema::table('patients', function (Blueprint $table) {
            $table->uuid('registry_uuid')->nullable()->after('patient_id')
                ->comment('Patient UUID from Patient Registry');
            $table->string('shrr_patient_id')->nullable()->after('registry_uuid')
                ->comment('FHIR Patient ID from SHRR');
            $table->string('philsys_id')->nullable()->after('his_id')
                ->comment('Philippine National ID');
            $table->string('philhealth_id')->nullable()->after('philsys_id')
                ->comment('PhilHealth ID');
            $table->timestamp('hie_synced_at')->nullable()
                ->comment('Last sync timestamp with HIE systems');
            
            $table->index('registry_uuid');
            $table->index('shrr_patient_id');
        });

        // Add HIE fields to er_visits table
        Schema::table('er_visits', function (Blueprint $table) {
            $table->string('shrr_encounter_id')->nullable()->after('visit_id')
                ->comment('FHIR Encounter ID from SHRR');
            $table->boolean('hie_submitted')->default(false)
                ->comment('Whether visit has been submitted to HIE');
            $table->timestamp('hie_submitted_at')->nullable()
                ->comment('Timestamp of HIE submission');
            $table->timestamp('shrr_submitted_at')->nullable()
                ->comment('Timestamp of SHRR submission');
            
            $table->index('shrr_encounter_id');
            $table->index('hie_submitted');
        });

        // Create HIE retry queue table
        Schema::create('hie_retry_queue', function (Blueprint $table) {
            $table->id();
            $table->string('type')->comment('Type of operation (patient_registration, visit_submission)');
            $table->json('data')->comment('Serialized data for retry');
            $table->integer('attempts')->default(0);
            $table->timestamp('last_attempt_at')->nullable();
            $table->text('last_error')->nullable();
            $table->string('status')->default('pending'); // pending, processing, failed, completed
            $table->timestamps();
            
            $table->index('type');
            $table->index('status');
            $table->index('created_at');
        });

        // Create HIE audit log table
        Schema::create('hie_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('service')->comment('Service name (patient_registry, shrr)');
            $table->string('operation')->comment('Operation performed');
            $table->string('patient_id')->nullable();
            $table->string('visit_id')->nullable();
            $table->string('correlation_id')->nullable();
            $table->integer('http_status')->nullable();
            $table->json('request_data')->nullable();
            $table->json('response_data')->nullable();
            $table->string('status'); // success, failed
            $table->text('error_message')->nullable();
            $table->integer('response_time_ms')->nullable();
            $table->timestamps();
            
            $table->index('service');
            $table->index('operation');
            $table->index('patient_id');
            $table->index('visit_id');
            $table->index('correlation_id');
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'registry_uuid',
                'shrr_patient_id',
                'philsys_id',
                'philhealth_id',
                'hie_synced_at'
            ]);
        });

        Schema::table('er_visits', function (Blueprint $table) {
            $table->dropColumn([
                'shrr_encounter_id',
                'hie_submitted',
                'hie_submitted_at',
                'shrr_submitted_at'
            ]);
        });

        Schema::dropIfExists('hie_retry_queue');
        Schema::dropIfExists('hie_audit_logs');
    }
};
