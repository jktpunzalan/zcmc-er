# HIE Integration Documentation
## Emergency Room Point-of-Service Integration with Patient Registry and SHRR

### Overview

The ZCMC Emergency Room system is now integrated as a Point-of-Service (POS) application with two Health Information Exchange (HIE) systems:

1. **Patient Registry** - Master Patient Index for identity resolution
2. **SHRR (Shared Health Record Repository)** - FHIR-based clinical data repository

### Architecture

```
┌─────────────────────┐
│   Emergency Room    │
│   POS Application   │
└──────────┬──────────┘
           │
           ├─────────────────────────────┐
           │                             │
           ▼                             ▼
┌──────────────────────┐     ┌──────────────────────┐
│   Patient Registry   │     │        SHRR          │
│   (Identity Master)  │     │   (Clinical Data)    │
└──────────────────────┘     └──────────────────────┘
```

### Data Flow

1. **Patient Registration**
   - Patient arrives at ER
   - ER system collects demographics
   - System calls Patient Registry to resolve identity (find or create)
   - Registry returns canonical UUID
   - System ensures patient exists in SHRR
   - Patient data synced across all systems

2. **Clinical Data Submission**
   - ER visit created with clinical data (vitals, triage, notes)
   - System generates FHIR bundle
   - Bundle submitted to SHRR via patient's UUID
   - Clinical data becomes available to all authorized HIE participants

3. **Patient History Retrieval**
   - System queries SHRR for patient's clinical history
   - Returns previous encounters, observations, conditions
   - Displays comprehensive patient history in ER system

## Setup Instructions

### 1. Environment Configuration

Copy the HIE configuration template to your `.env` file:

```bash
cp .env.hie.example .env
```

Then update the following variables in your `.env`:

```env
# Enable HIE Integration
HIE_ENABLED=true

# Patient Registry Configuration
PATIENT_REGISTRY_URL=https://registry.hospital.ph/api/v1
PATIENT_REGISTRY_TOKEN=2|your-registry-pos-token-here
PATIENT_REGISTRY_CORRELATION_PREFIX=ER-ZCMC

# SHRR Configuration
SHRR_BASE_URL=https://shrr.hospital.ph/api/v1
SHRR_TOKEN=2|your-shrr-pos-token-here

# Queue Configuration
HIE_QUEUE_CONNECTION=database
HIE_QUEUE_NAME=hie
```

### 2. Database Migration

Run the HIE migrations to add required fields and tables:

```bash
php artisan migrate
```

This will add:
- HIE fields to `patients` table (registry_uuid, shrr_patient_id, etc.)
- HIE fields to `er_visits` table (shrr_encounter_id, hie_submitted, etc.)
- `hie_retry_queue` table for failed submissions
- `hie_audit_logs` table for tracking HIE operations

### 3. Register Service Provider

Add the HIE service provider to `config/app.php`:

```php
'providers' => [
    // ...
    App\Providers\HIEServiceProvider::class,
],
```

### 4. Queue Configuration

Configure Laravel queue workers to process HIE submissions:

```bash
# Start queue worker for HIE jobs
php artisan queue:work --queue=hie --tries=3
```

For production, use Supervisor to manage queue workers:

```ini
[program:hie-worker]
process_name=%(program_name)s_%(process_num)02d
command=php /path/to/artisan queue:work --queue=hie --sleep=3 --tries=3
autostart=true
autorestart=true
numprocs=2
redirect_stderr=true
stdout_logfile=/path/to/logs/hie-worker.log
```

## API Endpoints

### HIE Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hie/health` | Check HIE systems health status |
| POST | `/api/hie/search-patient` | Search for patient across HIE |
| POST | `/api/hie/sync-patient` | Sync patient from HIE |
| GET | `/api/hie/patients/{id}/history` | Get patient clinical history |
| POST | `/api/hie/patients/{id}/register` | Register patient with HIE |
| POST | `/api/hie/er-visits/{id}/submit` | Submit ER visit to HIE |
| GET | `/api/hie/retry-queue` | View retry queue status |
| POST | `/api/hie/retry-queue/{id}/retry` | Retry failed submission |

### Patient Registration with HIE

```bash
POST /api/patients
{
    "patient_id": "ER20240119001",
    "philsys_id": "1234-5678-9012-3456",
    "philhealth_id": "12-345678901-2",
    "first_name": "Juan",
    "last_name": "Dela Cruz",
    "middle_name": "Reyes",
    "sex": "Male",
    "birthday": "1990-01-15",
    "contact_number": "+639171234567",
    "address": "123 Rizal St, Manila"
}
```

Response includes HIE registration status:
```json
{
    "patient": {
        "patient_id": "ER20240119001",
        "registry_uuid": "550e8400-e29b-41d4-a716-446655440000",
        "shrr_patient_id": "123",
        // ... other fields
    },
    "hie_registration": {
        "status": "success",
        "registry": {
            "patient_id": "550e8400-e29b-41d4-a716-446655440000",
            "matched_by": "Priority A: PhilSys ID"
        },
        "shrr": {
            "fhir_patient_id": "123",
            "status": "exists"
        }
    }
}
```

## Console Commands

### Health Check

Check the status of HIE systems:

```bash
php artisan hie:health-check
```

Output:
```
HIE System Status:
==================
✓ Patient Registry: ONLINE
  URL: https://registry.hospital.ph/api/v1
✓ SHRR: ONLINE
  URL: https://shrr.hospital.ph/api/v1

HIE Integration: ENABLED
```

### Sync Patients

Sync patient data from HIE:

```bash
# Sync specific patient
php artisan hie:sync-patient ER20240119001

# Sync from registry UUID
php artisan hie:sync-patient --registry-uuid=550e8400-e29b-41d4-a716-446655440000

# Sync all patients with registry UUIDs
php artisan hie:sync-patient --all
```

### Process Retry Queue

Process failed HIE submissions:

```bash
# Process 10 failed items
php artisan hie:process-retry-queue

# Process specific type
php artisan hie:process-retry-queue --type=patient_registration

# Clear completed items
php artisan hie:process-retry-queue --clear-completed
```

## Workflow Examples

### 1. New Patient Registration

When a new patient arrives at the ER:

1. Register patient in local system
2. System automatically:
   - Resolves patient identity with Patient Registry
   - Creates/finds patient in SHRR
   - Stores HIE identifiers locally
3. Patient is ready for clinical data submission

### 2. ER Visit Submission

When an ER visit is created:

1. Visit saved locally
2. Background job queued for HIE submission
3. Job executes after 10 seconds:
   - Builds FHIR bundle with encounter, observations, conditions
   - Submits to SHRR via patient UUID
   - Updates visit with SHRR encounter ID
4. If submission fails:
   - Job retries with exponential backoff
   - After 3 failures, stored in retry queue

### 3. Patient History Retrieval

To view patient's complete medical history:

```bash
GET /api/hie/patients/{patientId}/history
```

Returns:
- Registry patient demographics
- SHRR clinical summary (encounters, observations, conditions)
- Local ER visits

## FHIR Resources Generated

The system generates the following FHIR resources:

### Encounter
- ER visit details
- Arrival/departure times
- Assigned physician and nurse
- Bed assignment

### Observation
- Triage assessment
- Vital signs (BP, heart rate, temperature, etc.)
- Pain scale

### Condition
- Chief complaint
- Diagnoses

### DocumentReference
- Clinical notes
- Nursing notes
- Physician notes

## Error Handling

### Automatic Retry

Failed HIE submissions are automatically retried:
- 1st retry: after 60 seconds
- 2nd retry: after 120 seconds
- 3rd retry: after 300 seconds

### Manual Retry

For persistent failures:

1. Check retry queue:
```bash
GET /api/hie/retry-queue
```

2. Retry specific item:
```bash
POST /api/hie/retry-queue/{queueId}/retry
```

3. Or use console command:
```bash
php artisan hie:process-retry-queue
```

### Logging

HIE operations are logged to `storage/logs/hie.log`:
- All API requests and responses
- Patient registrations
- Visit submissions
- Error details

## Monitoring

### Dashboard Metrics

Monitor HIE integration through:
- `/api/hie/health` - System health
- `/api/hie/retry-queue` - Failed submissions
- Log files - Detailed operation logs

### Recommended Monitoring

1. Set up alerts for:
   - HIE system offline > 5 minutes
   - Retry queue > 100 items
   - Failed submission rate > 10%

2. Regular checks:
   - Daily: Process retry queue
   - Weekly: Sync all patients
   - Monthly: Audit log review

## Troubleshooting

### Common Issues

#### 1. "Patient Registry Offline"
- Check network connectivity
- Verify API URL in `.env`
- Confirm token is valid

#### 2. "Multiple Patient Matches"
- Provide more identifying information
- Use PhilSys or PhilHealth ID for exact match
- Manual resolution through UI required

#### 3. "SHRR Bundle Validation Failed"
- Check FHIR resource format
- Ensure all required fields present
- Review error details in logs

#### 4. "Rate Limit Exceeded"
- Implement request throttling
- Adjust queue worker delay
- Contact HIE admin for limit increase

### Support Contacts

- **Emergency Room IT**: er-support@zcmc.local
- **Patient Registry Admin**: registry-admin@hospital.ph
- **SHRR Support**: shrr-support@hospital.ph
- **HIE Coordinator**: hie-coordinator@doh.gov.ph

## Security Considerations

1. **Token Security**
   - Never commit tokens to version control
   - Use environment variables
   - Rotate tokens regularly

2. **Data Privacy**
   - Patient identifiers are masked in logs
   - PHI not included in error messages
   - Audit logs track all HIE operations

3. **Network Security**
   - Use HTTPS for all HIE communications
   - Implement IP whitelisting if required
   - Monitor for suspicious activity

## Performance Optimization

1. **Caching**
   - Patient Registry UUIDs cached for 1 hour
   - SHRR patient IDs cached for 10 minutes
   - Clear cache if data inconsistencies

2. **Queue Processing**
   - Use multiple workers for high volume
   - Adjust retry delays based on load
   - Monitor queue length

3. **Batch Operations**
   - Submit multiple resources in single bundle
   - Use pagination for large result sets
   - Implement rate limiting on client side

## Future Enhancements

- [ ] Real-time HIE notifications via webhooks
- [ ] Bi-directional sync with SHRR
- [ ] Support for additional FHIR resources (MedicationRequest, Procedure)
- [ ] Advanced patient matching algorithms
- [ ] HIE analytics dashboard
- [ ] Automated data quality checks

## Version History

- **v1.0.0** (2024-01-19)
  - Initial HIE integration
  - Patient Registry connection
  - SHRR FHIR bundle submission
  - Basic retry mechanism

---

For additional support or questions, please contact the ZCMC IT Department.
