<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class VitalSign extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'vital_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'visit_id',
        'recorded_at',
        'bp_systolic',
        'bp_diastolic',
        'heart_rate',
        'respiratory_rate',
        'temperature',
        'oxygen_saturation',
        'blood_glucose',
        'recorded_by'
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
        'temperature' => 'decimal:1',
        'blood_glucose' => 'decimal:1'
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ErVisit::class, 'visit_id', 'visit_id');
    }

    public function recordedBy(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'recorded_by', 'worker_id');
    }

    public function getBloodPressureAttribute(): string
    {
        return "{$this->bp_systolic}/{$this->bp_diastolic}";
    }

    public function getIsAbnormalAttribute(): bool
    {
        return $this->bp_systolic > 140 || $this->bp_diastolic > 90 ||
               $this->heart_rate > 100 || $this->heart_rate < 60 ||
               $this->temperature > 37.5 || $this->oxygen_saturation < 95;
    }
}
