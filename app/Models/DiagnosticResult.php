<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class DiagnosticResult extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'result_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'order_id',
        'result_value',
        'unit',
        'reference_range',
        'abnormal_flag',
        'resulted_at',
        'verified_by'
    ];

    protected $casts = [
        'resulted_at' => 'datetime'
    ];

    public function order(): BelongsTo
    {
        return $this->belongsTo(DiagnosticOrder::class, 'order_id', 'order_id');
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'verified_by', 'worker_id');
    }
}
