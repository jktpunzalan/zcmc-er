<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Patient extends Model
{
    protected $primaryKey = 'patient_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'patient_id',
        'his_id',
        'registry_uuid',
        'shrr_patient_id',
        'philsys_id',
        'philhealth_id',
        'first_name',
        'last_name',
        'middle_name',
        'sex',
        'birthday',
        'blood_type',
        'contact_number',
        'address',
        'emergency_contact_name',
        'emergency_contact_number',
        'insurance_provider',
        'insurance_number',
        'hie_synced_at'
    ];

    protected $casts = [
        'birthday' => 'date',
    ];

    public function erVisits(): HasMany
    {
        return $this->hasMany(ErVisit::class, 'patient_id', 'patient_id');
    }

    public function getFullNameAttribute(): string
    {
        return "{$this->first_name} {$this->middle_name} {$this->last_name}";
    }

    public function getAgeAttribute(): int
    {
        return $this->birthday->age;
    }
}
