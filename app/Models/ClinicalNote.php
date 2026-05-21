<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ClinicalNote extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'note_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'visit_id',
        'note_type',
        'subjective',
        'objective',
        'assessment',
        'plan',
        'created_by'
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ErVisit::class, 'visit_id', 'visit_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'created_by', 'worker_id');
    }
}
