<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiagnosticOrder;
use App\Models\DiagnosticResult;
use App\Models\ErVisit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class DiagnosticController extends Controller
{
    public function index($visitId): JsonResponse
    {
        $visit = ErVisit::findOrFail($visitId);
        $orders = $visit->diagnosticOrders()->with(['orderedBy', 'results'])->orderBy('ordered_at', 'desc')->get();
        
        return response()->json($orders);
    }

    public function createOrder(Request $request, $visitId): JsonResponse
    {
        $visit = ErVisit::findOrFail($visitId);

        $validator = Validator::make($request->all(), [
            'order_type' => 'required|in:Laboratory,Radiology,ECG,Other',
            'order_code' => 'nullable|string',
            'order_description' => 'required|string',
            'priority' => 'required|in:STAT,Urgent,Routine',
            'ordered_by' => 'required|exists:healthcare_workers,worker_id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $orderData = $request->all();
        $orderData['visit_id'] = $visitId;
        $orderData['ordered_at'] = now();
        $orderData['status'] = 'Ordered';

        $order = DiagnosticOrder::create($orderData);

        return response()->json($order->load('orderedBy'), 201);
    }

    public function updateOrder(Request $request, $orderId): JsonResponse
    {
        $order = DiagnosticOrder::findOrFail($orderId);

        $validator = Validator::make($request->all(), [
            'status' => 'sometimes|required|in:Ordered,In_Progress,Completed,Cancelled',
            'completed_at' => 'nullable|date_format:Y-m-d H:i:s'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $order->update($request->all());
        
        return response()->json($order->load(['orderedBy', 'results']));
    }

    public function addResult(Request $request, $orderId): JsonResponse
    {
        $order = DiagnosticOrder::findOrFail($orderId);

        $validator = Validator::make($request->all(), [
            'result_value' => 'required|string',
            'unit' => 'nullable|string',
            'reference_range' => 'nullable|string',
            'abnormal_flag' => 'nullable|in:Normal,Abnormal_High,Abnormal_Low,Critical',
            'verified_by' => 'nullable|exists:healthcare_workers,worker_id'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $resultData = $request->all();
        $resultData['order_id'] = $orderId;
        $resultData['resulted_at'] = now();

        $result = DiagnosticResult::create($resultData);

        // Update order status if not already completed
        if ($order->status !== 'Completed') {
            $order->update([
                'status' => 'Completed',
                'completed_at' => now()
            ]);
        }

        return response()->json($result->load('verifiedBy'), 201);
    }
}
