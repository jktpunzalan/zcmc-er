<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\HealthcareWorker;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required|string'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid credentials'
            ], 401);
        }

        $user = Auth::user();
        $token = $user->createToken('auth-token')->plainTextToken;

        // Find the associated healthcare worker based on email or name
        $healthcareWorker = null;
        if ($user->email === 'physician@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW001');
        } elseif ($user->email === 'nurse@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW002');
        } elseif ($user->email === 'triage@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW003');
        } elseif ($user->email === 'admin@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW004');
        } elseif ($user->email === 'tech@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW005');
        }

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'worker_id' => $healthcareWorker?->worker_id,
                'role' => $healthcareWorker?->role,
                'healthcare_worker' => $healthcareWorker
            ]
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully'
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        $user = $request->user();
        
        // Find the associated healthcare worker
        $healthcareWorker = null;
        if ($user->email === 'physician@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW001');
        } elseif ($user->email === 'nurse@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW002');
        } elseif ($user->email === 'triage@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW003');
        } elseif ($user->email === 'admin@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW004');
        } elseif ($user->email === 'tech@zcmc-er.com') {
            $healthcareWorker = HealthcareWorker::find('HW005');
        }

        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'worker_id' => $healthcareWorker?->worker_id,
            'role' => $healthcareWorker?->role,
            'healthcare_worker' => $healthcareWorker
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'worker_id' => 'required|exists:healthcare_workers,worker_id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        $healthcareWorker = HealthcareWorker::find($request->worker_id);

        return response()->json([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'worker_id' => $healthcareWorker?->worker_id,
                'role' => $healthcareWorker?->role,
                'healthcare_worker' => $healthcareWorker
            ]
        ], 201);
    }
}
