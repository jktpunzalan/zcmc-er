<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ErProcedure extends Model
{
    use HasUuids;
    
    protected $primaryKey = 'procedure_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'visit_id',
        'procedure_code',
        'procedure_name',
        'performed_at',
        'performed_by',
        'notes',
        'urgency'
    ];

    protected $casts = [
        'performed_at' => 'datetime'
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ErVisit::class, 'visit_id', 'visit_id');
    }

    public function performedBy(): BelongsTo
    {
        return $this->belongsTo(HealthcareWorker::class, 'performed_by', 'worker_id');
    }
}
