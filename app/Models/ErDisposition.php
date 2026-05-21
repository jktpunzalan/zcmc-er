<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ErDisposition extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'disposition_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'visit_id',
        'disposition_type',
        'admitting_department',
        'transfer_facility',
        'discharge_instructions',
        'follow_up_instructions',
        'disposition_time',
        'authorized_by'
    ];

    protected $casts = [
        'disposition_time' => 'datetime'
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ErVisit::class, 'visit_id', 'visit_id');
    }

    public function authorizedBy(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'authorized_by', 'worker_id');
    }
}
