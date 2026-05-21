<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PatientController;
use App\Http\Controllers\Api\HealthcareWorkerController;
use App\Http\Controllers\Api\ClinicalNoteController;
use App\Http\Controllers\Api\ErVisitController;
use App\Http\Controllers\Api\TriageController;
use App\Http\Controllers\Api\VitalSignController;
use App\Http\Controllers\Api\DiagnosticController;
use App\Http\Controllers\Api\HIEController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Authentication routes
Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);

    Route::post('/er-visits/{visitId}/clinical-notes', [ClinicalNoteController::class, 'store']);
    Route::put('/clinical-notes/{noteId}', [ClinicalNoteController::class, 'update']);

    // HIE Integration Routes (require authentication)
    Route::prefix('hie')->group(function () {
        Route::get('/health', [HIEController::class, 'health']);
        Route::post('/search-patient', [HIEController::class, 'searchPatient']);
        Route::post('/sync-patient', [HIEController::class, 'syncPatient']);
        Route::get('/patients/{patientId}/history', [HIEController::class, 'getPatientHistory']);
        Route::post('/patients/{patientId}/register', [HIEController::class, 'registerPatient']);
        Route::post('/er-visits/{visitId}/submit', [HIEController::class, 'submitErVisit']);
        Route::get('/retry-queue', [HIEController::class, 'retryQueue']);
        Route::post('/retry-queue/{queueId}/retry', [HIEController::class, 'retryFailedSubmission']);
    });
});

// Patient Management
Route::prefix('patients')->group(function () {
    Route::get('/', [PatientController::class, 'index']);
    Route::post('/', [PatientController::class, 'store']);
    Route::get('/{patientId}', [PatientController::class, 'show']);
    Route::put('/{patientId}', [PatientController::class, 'update']);
    Route::get('/his/{hisId}', [PatientController::class, 'getFromHIS']);
});

// Healthcare Worker Management
Route::prefix('healthcare-workers')->group(function () {
    Route::get('/', [HealthcareWorkerController::class, 'index']);
    Route::post('/', [HealthcareWorkerController::class, 'store']);
    Route::get('/physicians', [HealthcareWorkerController::class, 'getPhysicians']);
    Route::get('/nurses', [HealthcareWorkerController::class, 'getNurses']);
    Route::get('/{workerId}', [HealthcareWorkerController::class, 'show']);
    Route::put('/{workerId}', [HealthcareWorkerController::class, 'update']);
    Route::get('/hris/{hrisId}', [HealthcareWorkerController::class, 'getFromHRIS']);
});

// ER Visit Management
Route::prefix('er-visits')->group(function () {
    Route::get('/', [ErVisitController::class, 'index']);
    Route::post('/', [ErVisitController::class, 'store']);
    Route::get('/active', [ErVisitController::class, 'activeVisits']);
    Route::get('/dashboard', [ErVisitController::class, 'dashboard']);
    Route::get('/{visitId}', [ErVisitController::class, 'show']);
    Route::put('/{visitId}', [ErVisitController::class, 'update']);
});

// Triage Management
Route::prefix('triage')->group(function () {
    Route::post('/visits/{visitId}', [TriageController::class, 'store']);
    Route::put('/{triageId}', [TriageController::class, 'update']);
    Route::get('/waiting-list', [TriageController::class, 'waitingList']);
});

// Vital Signs
Route::prefix('vital-signs')->group(function () {
    Route::get('/visits/{visitId}', [VitalSignController::class, 'index']);
    Route::post('/visits/{visitId}', [VitalSignController::class, 'store']);
    Route::get('/visits/{visitId}/latest', [VitalSignController::class, 'latest']);
});

// Diagnostics
Route::prefix('diagnostics')->group(function () {
    Route::get('/visits/{visitId}', [DiagnosticController::class, 'index']);
    Route::post('/visits/{visitId}/orders', [DiagnosticController::class, 'createOrder']);
    Route::put('/orders/{orderId}', [DiagnosticController::class, 'updateOrder']);
    Route::post('/orders/{orderId}/results', [DiagnosticController::class, 'addResult']);
});
