<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class ErBilling extends Model
{
    use HasUuids;
    
    protected $table = 'er_billing';
    protected $primaryKey = 'billing_id';
    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'visit_id',
        'total_charges',
        'insurance_coverage',
        'patient_responsibility',
        'payment_status'
    ];

    protected $casts = [
        'total_charges' => 'decimal:2',
        'insurance_coverage' => 'decimal:2',
        'patient_responsibility' => 'decimal:2'
    ];

    public function visit(): BelongsTo
    {
        return $this->belongsTo(ErVisit::class, 'visit_id', 'visit_id');
    }
}
