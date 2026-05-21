<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ErVisit extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'visit_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'patient_id',
        'arrival_time',
        'departure_time',
        'arrival_mode',
        'visit_type',
        'status',
        'chief_complaint',
        'assigned_bed',
        'attending_physician_id',
        'primary_nurse_id',
        'shrr_encounter_id',
        'hie_submitted',
        'hie_submitted_at',
        'shrr_submitted_at'
    ];

    protected $casts = [
        'arrival_time' => 'datetime',
        'departure_time' => 'datetime',
    ];

    public function patient(): BelongsTo
    {
        return $this->belongsTo(Patient::class, 'patient_id', 'patient_id');
    }

    public function attendingPhysician(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'attending_physician_id', 'worker_id');
    }

    public function primaryNurse(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'primary_nurse_id', 'worker_id');
    }

    public function triageAssessment(): HasOne
    {
        return $this->hasOne(TriageAssessment::class, 'visit_id', 'visit_id');
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class, 'visit_id', 'visit_id');
    }

    public function procedures(): HasMany
    {
        return $this->hasMany(ErProcedure::class, 'visit_id', 'visit_id');
    }

    public function diagnosticOrders(): HasMany
    {
        return $this->hasMany(DiagnosticOrder::class, 'visit_id', 'visit_id');
    }

    public function medications(): HasMany
    {
        return $this->hasMany(ErMedication::class, 'visit_id', 'visit_id');
    }

    public function clinicalNotes(): HasMany
    {
        return $this->hasMany(ClinicalNote::class, 'visit_id', 'visit_id');
    }

    public function disposition(): HasOne
    {
        return $this->hasOne(ErDisposition::class, 'visit_id', 'visit_id');
    }

    public function billing(): HasOne
    {
        return $this->hasOne(ErBilling::class, 'visit_id', 'visit_id');
    }

    public function getWaitTimeAttribute()
    {
        if ($this->departure_time) {
            return $this->arrival_time->diffInMinutes($this->departure_time);
        }
        return $this->arrival_time->diffInMinutes(now());
    }
}
