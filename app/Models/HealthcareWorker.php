<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HealthcareWorker extends Model
{
    protected $primaryKey = 'worker_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'worker_id',
        'hris_id',
        'first_name',
        'last_name',
        'middle_name',
        'role',
        'license_no',
        'specialization',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function erVisitsAsPhysician(): HasMany
    {
        return $this->hasMany(ErVisit::class, 'attending_physician_id', 'worker_id');
    }

    public function erVisitsAsNurse(): HasMany
    {
        return $this->hasMany(ErVisit::class, 'primary_nurse_id', 'worker_id');
    }

    public function triageAssessments(): HasMany
    {
        return $this->hasMany(TriageAssessment::class, 'triage_nurse_id', 'worker_id');
    }

    public function vitalSigns(): HasMany
    {
        return $this->hasMany(VitalSign::class, 'recorded_by', 'worker_id');
    }

    public function procedures(): HasMany
    {
        return $this->hasMany(ErProcedure::class, 'performed_by', 'worker_id');
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->middle_name} {$this->last_name}";
    }
}
