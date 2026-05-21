import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../services/api';
import { 
  FileText,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Microscope,
  Camera,
  Heart,
  Activity
} from 'lucide-react';

const Diagnostics = () => {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset } = useForm();
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showResultForm, setShowResultForm] = useState(false);

  // Fetch visit details
  const { data: visit } = useQuery(
    ['visit-basic', visitId],
    () => api.get(`/er-visits/${visitId}`).then(res => res.data)
  );

  // Fetch diagnostic orders
  const { data: orders, isLoading } = useQuery(
    ['diagnostic-orders', visitId],
    () => api.get(`/diagnostics/visits/${visitId}`).then(res => res.data)
  );

  // Fetch healthcare workers (physicians)
  const { data: physicians } = useQuery(
    'physicians',
    () => api.get('/healthcare-workers/physicians').then(res => res.data)
  );

  // Create diagnostic order mutation
  const createOrder = useMutation(
    (data) => api.post(`/diagnostics/visits/${visitId}/orders`, data),
    {
      onSuccess: () => {
        toast.success('Diagnostic order created successfully');
        queryClient.invalidateQueries(['diagnostic-orders', visitId]);
        reset();
        setShowOrderForm(false);
      },
      onError: () => {
        toast.error('Failed to create diagnostic order');
      }
    }
  );

  // Add result mutation
  const addResult = useMutation(
    ({ orderId, data }) => api.post(`/diagnostics/orders/${orderId}/results`, data),
    {
      onSuccess: () => {
        toast.success('Result added successfully');
        queryClient.invalidateQueries(['diagnostic-orders', visitId]);
        setSelectedOrder(null);
        setShowResultForm(false);
      },
      onError: () => {
        toast.error('Failed to add result');
      }
    }
  );

  const onSubmitOrder = (data) => {
    createOrder.mutate(data);
  };

  const onSubmitResult = (data) => {
    if (!selectedOrder) return;
    addResult.mutate({ orderId: selectedOrder.order_id, data });
  };

  const getOrderIcon = (type) => {
    switch(type) {
      case 'Laboratory': return <Microscope className="h-5 w-5" />;
      case 'Radiology': return <Camera className="h-5 w-5" />;
      case 'ECG': return <Heart className="h-5 w-5" />;
      default: return <FileText className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'STAT': return 'text-red-600 bg-red-50';
      case 'Urgent': return 'text-orange-600 bg-orange-50';
      case 'Routine': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'Completed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'In_Progress': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'Cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(`/visits/${visitId}`)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          ← Back to Visit Details
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Diagnostic Orders</h1>
            {visit && (
              <p className="mt-2 text-sm text-gray-600">
                Patient: {visit.patient?.first_name} {visit.patient?.last_name} | 
                Visit: #{visitId.substring(0, 8)}
              </p>
            )}
          </div>
          <button
            onClick={() => setShowOrderForm(!showOrderForm)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-1" />
            New Order
          </button>
        </div>
      </div>

      {/* New Order Form */}
      {showOrderForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Create Diagnostic Order</h2>
          
          <form onSubmit={handleSubmit(onSubmitOrder)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Type*
                </label>
                <select
                  {...register('order_type', { required: 'Order type is required' })}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select type...</option>
                  <option value="Laboratory">Laboratory</option>
                  <option value="Radiology">Radiology</option>
                  <option value="ECG">ECG</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority*
                </label>
                <select
                  {...register('priority', { required: 'Priority is required' })}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select priority...</option>
                  <option value="STAT">STAT (Immediate)</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Routine">Routine</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Code (Optional)
              </label>
              <input
                {...register('order_code')}
                className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="e.g., CBC, CXR, ECG12L"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Description*
              </label>
              <textarea
                {...register('order_description', { required: 'Description is required' })}
                rows={2}
                className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Describe the diagnostic test or procedure..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ordering Physician*
              </label>
              <select
                {...register('ordered_by', { required: 'Ordering physician is required' })}
                className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select physician...</option>
                {physicians?.map((physician) => (
                  <option key={physician.worker_id} value={physician.worker_id}>
                    Dr. {physician.first_name} {physician.last_name} - {physician.license_no}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  reset();
                  setShowOrderForm(false);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createOrder.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {createOrder.isLoading ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Orders List */}
      <div className="space-y-4">
        {orders && orders.length > 0 ? (
          orders.map((order) => (
            <div key={order.order_id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getOrderIcon(order.order_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900">
                          {order.order_description}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>{order.order_type}</span>
                        {order.order_code && <span>Code: {order.order_code}</span>}
                        <span>Ordered: {new Date(order.ordered_at).toLocaleString()}</span>
                        <span>By: Dr. {order.ordered_by?.first_name} {order.ordered_by?.last_name}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(order.status)}
                    <span className="text-sm text-gray-600">
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Results */}
                {order.results && order.results.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Results</h4>
                    <div className="space-y-2">
                      {order.results.map((result) => (
                        <div key={result.result_id} className="bg-gray-50 rounded-md p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {result.result_value}
                                {result.unit && ` ${result.unit}`}
                              </p>
                              {result.reference_range && (
                                <p className="text-xs text-gray-500">
                                  Reference: {result.reference_range}
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                Resulted: {new Date(result.resulted_at).toLocaleString()}
                                {result.verified_by && ` | Verified by: ${result.verified_by.first_name} ${result.verified_by.last_name}`}
                              </p>
                            </div>
                            {result.abnormal_flag && result.abnormal_flag !== 'Normal' && (
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                result.abnormal_flag === 'Critical' ? 'bg-red-100 text-red-800' :
                                result.abnormal_flag.includes('High') ? 'bg-orange-100 text-orange-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {result.abnormal_flag.replace('_', ' ')}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Result Button */}
                {order.status !== 'Completed' && order.status !== 'Cancelled' && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowResultForm(true);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      + Add Result
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No Diagnostic Orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              No diagnostic tests have been ordered for this visit yet.
            </p>
            <button
              onClick={() => setShowOrderForm(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create First Order
            </button>
          </div>
        )}
      </div>

      {/* Result Form Modal */}
      {showResultForm && selectedOrder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Add Result for: {selectedOrder.order_description}
            </h3>
            
            <form onSubmit={handleSubmit(onSubmitResult)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Result Value*
                </label>
                <textarea
                  {...register('result_value', { required: 'Result value is required' })}
                  rows={3}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter test result..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <input
                    {...register('unit')}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., mg/dL, %"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Range
                  </label>
                  <input
                    {...register('reference_range')}
                    className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="e.g., 70-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Abnormal Flag
                </label>
                <select
                  {...register('abnormal_flag')}
                  className="w-full rounded-md border-gray-300 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="">Select if applicable...</option>
                  <option value="Normal">Normal</option>
                  <option value="Abnormal_High">Abnormal High</option>
                  <option value="Abnormal_Low">Abnormal Low</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowResultForm(false);
                    setSelectedOrder(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addResult.isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {addResult.isLoading ? 'Adding...' : 'Add Result'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diagnostics;
