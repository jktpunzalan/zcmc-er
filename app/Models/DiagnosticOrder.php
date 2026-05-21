<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class DiagnosticOrder extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'order_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'visit_id',
        'order_type',
        'order_code',
        'order_description',
        'priority',
        'ordered_by',
        'ordered_at',
        'status',
        'completed_at'
    ];

    protected $casts = [
        'ordered_at' => 'datetime',
        'completed_at' => 'datetime'
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ErVisit::class, 'visit_id', 'visit_id');
    }

    public function orderedBy(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'ordered_by', 'worker_id');
    }

    public function results(): HasMany
    {
        return $this->hasMany(DiagnosticResult::class, 'order_id', 'order_id');
    }
}
