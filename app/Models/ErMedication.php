<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ErMedication extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'medication_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'visit_id',
        'drug_name',
        'dose',
        'route',
        'administered_at',
        'administered_by',
        'reaction'
    ];

    protected $casts = [
        'administered_at' => 'datetime'
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ErVisit::class, 'visit_id', 'visit_id');
    }

    public function administeredBy(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'administered_by', 'worker_id');
    }
}
