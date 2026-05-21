<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class TriageAssessment extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'triage_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'visit_id',
        'triage_time',
        'triage_level',
        'triage_nurse_id',
        'presenting_symptoms',
        'pain_assessment',
        'pain_scale',
        'is_infectious',
        'allergies',
        'current_medications'
    ];

    protected $casts = [
        'triage_time' => 'datetime',
        'is_infectious' => 'boolean',
        'pain_scale' => 'integer'
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ErVisit::class, 'visit_id', 'visit_id');
    }

    public function triageNurse(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'triage_nurse_id', 'worker_id');
    }

    public function getTriagePriorityAttribute(): string
    {
        return match($this->triage_level) {
            '1-Resuscitation' => 'Immediate',
            '2-Emergent' => '10 minutes',
            '3-Urgent' => '30 minutes',
            '4-Less_Urgent' => '60 minutes',
            '5-Non_Urgent' => '120 minutes',
            default => 'Unknown'
        };
    }
}
