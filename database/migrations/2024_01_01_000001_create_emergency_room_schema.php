<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Healthcare Workers (from HRIS)
        Schema::create('healthcare_workers', function (Blueprint $table) {
            $table->string('worker_id')->primary(); // HRIS ID
            $table->string('hris_id')->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('middle_name')->nullable();
            $table->enum('role', ['Emergency_Physician', 'ER_Nurse', 'Triage_Nurse', 'ER_Admin', 'Technician']);
            $table->string('license_no')->nullable();
            $table->string('specialization')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['last_name', 'first_name']);
        });

        // Patients (from HIS)
        Schema::create('patients', function (Blueprint $table) {
            $table->string('patient_id')->primary(); // HIS Patient ID
            $table->string('his_id')->nullable();
            $table->string('first_name');
            $table->string('last_name');
            $table->string('middle_name')->nullable();
            $table->enum('sex', ['Male', 'Female']);
            $table->date('birthday');
            $table->string('blood_type')->nullable();
            $table->string('contact_number')->nullable();
            $table->text('address')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_number')->nullable();
            $table->string('insurance_provider')->nullable();
            $table->string('insurance_number')->nullable();
            $table->timestamps();
            $table->index(['last_name', 'first_name']);
        });

        // Emergency Room Visits
        Schema::create('er_visits', function (Blueprint $table) {
            $table->uuid('visit_id')->primary();
            $table->string('patient_id');
            $table->datetime('arrival_time');
            $table->datetime('departure_time')->nullable();
            $table->enum('arrival_mode', ['Walk-in', 'Ambulance', 'Private_Vehicle', 'Police', 'Other']);
            $table->enum('visit_type', ['Emergency', 'Urgent', 'Non-Urgent']);
            $table->enum('status', ['Waiting', 'Triaged', 'In_Treatment', 'Under_Observation', 'Admitted', 'Discharged', 'Transferred', 'Left_AMA']);
            $table->string('chief_complaint', 500);
            $table->string('assigned_bed')->nullable();
            $table->string('attending_physician_id')->nullable();
            $table->string('primary_nurse_id')->nullable();
            $table->timestamps();
            
            $table->foreign('patient_id')->references('patient_id')->on('patients');
            $table->foreign('attending_physician_id')->references('worker_id')->on('healthcare_workers');
            $table->foreign('primary_nurse_id')->references('worker_id')->on('healthcare_workers');
            $table->index(['arrival_time', 'status']);
        });

        // Triage Assessment
        Schema::create('triage_assessments', function (Blueprint $table) {
            $table->uuid('triage_id')->primary();
            $table->uuid('visit_id');
            $table->datetime('triage_time');
            $table->enum('triage_level', ['1-Resuscitation', '2-Emergent', '3-Urgent', '4-Less_Urgent', '5-Non_Urgent']);
            $table->string('triage_nurse_id');
            $table->text('presenting_symptoms');
            $table->text('pain_assessment')->nullable();
            $table->integer('pain_scale')->nullable(); // 0-10
            $table->boolean('is_infectious')->default(false);
            $table->text('allergies')->nullable();
            $table->text('current_medications')->nullable();
            $table->timestamps();
            
            $table->foreign('visit_id')->references('visit_id')->on('er_visits');
            $table->foreign('triage_nurse_id')->references('worker_id')->on('healthcare_workers');
        });

        // Vital Signs
        Schema::create('vital_signs', function (Blueprint $table) {
            $table->uuid('vital_id')->primary();
            $table->uuid('visit_id');
            $table->datetime('recorded_at');
            $table->integer('bp_systolic')->nullable();
            $table->integer('bp_diastolic')->nullable();
            $table->integer('heart_rate')->nullable();
            $table->integer('respiratory_rate')->nullable();
            $table->decimal('temperature', 4, 1)->nullable();
            $table->integer('oxygen_saturation')->nullable();
            $table->decimal('blood_glucose', 5, 1)->nullable();
            $table->string('recorded_by');
            $table->timestamps();
            
            $table->foreign('visit_id')->references('visit_id')->on('er_visits');
            $table->foreign('recorded_by')->references('worker_id')->on('healthcare_workers');
            $table->index(['visit_id', 'recorded_at']);
        });

        // Emergency Procedures
        Schema::create('er_procedures', function (Blueprint $table) {
            $table->uuid('procedure_id')->primary();
            $table->uuid('visit_id');
            $table->string('procedure_code')->nullable();
            $table->string('procedure_name');
            $table->datetime('performed_at');
            $table->string('performed_by');
            $table->text('notes')->nullable();
            $table->enum('urgency', ['Immediate', 'Urgent', 'Non-Urgent']);
            $table->timestamps();
            
            $table->foreign('visit_id')->references('visit_id')->on('er_visits');
            $table->foreign('performed_by')->references('worker_id')->on('healthcare_workers');
        });

        // Diagnostic Orders
        Schema::create('diagnostic_orders', function (Blueprint $table) {
            $table->uuid('order_id')->primary();
            $table->uuid('visit_id');
            $table->enum('order_type', ['Laboratory', 'Radiology', 'ECG', 'Other']);
            $table->string('order_code')->nullable();
            $table->string('order_description');
            $table->enum('priority', ['STAT', 'Urgent', 'Routine']);
            $table->string('ordered_by');
            $table->datetime('ordered_at');
            $table->enum('status', ['Ordered', 'In_Progress', 'Completed', 'Cancelled']);
            $table->datetime('completed_at')->nullable();
            $table->timestamps();
            
            $table->foreign('visit_id')->references('visit_id')->on('er_visits');
            $table->foreign('ordered_by')->references('worker_id')->on('healthcare_workers');
        });

        // Diagnostic Results
        Schema::create('diagnostic_results', function (Blueprint $table) {
            $table->uuid('result_id')->primary();
            $table->uuid('order_id');
            $table->text('result_value');
            $table->string('unit')->nullable();
            $table->string('reference_range')->nullable();
            $table->enum('abnormal_flag', ['Normal', 'Abnormal_High', 'Abnormal_Low', 'Critical'])->nullable();
            $table->datetime('resulted_at');
            $table->string('verified_by')->nullable();
            $table->timestamps();
            
            $table->foreign('order_id')->references('order_id')->on('diagnostic_orders');
            $table->foreign('verified_by')->references('worker_id')->on('healthcare_workers');
        });

        // Medications Administered
        Schema::create('er_medications', function (Blueprint $table) {
            $table->uuid('medication_id')->primary();
            $table->uuid('visit_id');
            $table->string('drug_name');
            $table->string('dose');
            $table->string('route');
            $table->datetime('administered_at');
            $table->string('administered_by');
            $table->text('reaction')->nullable();
            $table->timestamps();
            
            $table->foreign('visit_id')->references('visit_id')->on('er_visits');
            $table->foreign('administered_by')->references('worker_id')->on('healthcare_workers');
        });

        // Clinical Notes
        Schema::create('clinical_notes', function (Blueprint $table) {
            $table->uuid('note_id')->primary();
            $table->uuid('visit_id');
            $table->enum('note_type', ['Physician', 'Nursing', 'Discharge', 'Progress']);
            $table->text('subjective')->nullable();
            $table->text('objective')->nullable();
            $table->text('assessment')->nullable();
            $table->text('plan')->nullable();
            $table->string('created_by');
            $table->timestamps();
            
            $table->foreign('visit_id')->references('visit_id')->on('er_visits');
            $table->foreign('created_by')->references('worker_id')->on('healthcare_workers');
        });

        // Disposition
        Schema::create('er_dispositions', function (Blueprint $table) {
            $table->uuid('disposition_id')->primary();
            $table->uuid('visit_id');
            $table->enum('disposition_type', ['Discharged_Home', 'Admitted_Ward', 'Admitted_ICU', 'Transferred', 'Left_AMA', 'Expired']);
            $table->string('admitting_department')->nullable();
            $table->string('transfer_facility')->nullable();
            $table->text('discharge_instructions')->nullable();
            $table->text('follow_up_instructions')->nullable();
            $table->datetime('disposition_time');
            $table->string('authorized_by');
            $table->timestamps();
            
            $table->foreign('visit_id')->references('visit_id')->on('er_visits')->onDelete('cascade');
            $table->foreign('authorized_by')->references('worker_id')->on('healthcare_workers');
        });

        // Billing/Insurance
        Schema::create('er_billing', function (Blueprint $table) {
            $table->uuid('billing_id')->primary();
            $table->uuid('visit_id');
            $table->decimal('total_charges', 10, 2)->default(0);
            $table->decimal('insurance_coverage', 10, 2)->default(0);
            $table->decimal('patient_responsibility', 10, 2)->default(0);
            $table->enum('payment_status', ['Pending', 'Partial', 'Paid', 'Insurance_Processing']);
            $table->timestamps();
            
            $table->foreign('visit_id')->references('visit_id')->on('er_visits');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('er_billing');
        Schema::dropIfExists('er_dispositions');
        Schema::dropIfExists('clinical_notes');
        Schema::dropIfExists('er_medications');
        Schema::dropIfExists('diagnostic_results');
        Schema::dropIfExists('diagnostic_orders');
        Schema::dropIfExists('er_procedures');
        Schema::dropIfExists('vital_signs');
        Schema::dropIfExists('triage_assessments');
        Schema::dropIfExists('er_visits');
        Schema::dropIfExists('patients');
        Schema::dropIfExists('healthcare_workers');
    }
};
