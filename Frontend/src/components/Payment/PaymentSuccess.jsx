import { useEffect, useState } from 'react';
import { Link, useSearchParams, useLocation } from 'react-router-dom';
import api from '../../utils/api';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const sessionId = searchParams.get('session_id');

  const [verifying, setVerifying] = useState(!!sessionId);
  const [verificationError, setVerificationError] = useState('');
  const [orderDetails, setOrderDetails] = useState(location.state || null);

  useEffect(() => {
    // If Stripe payment (has session_id), verify it
    if (sessionId) {
      verifyStripePayment();
    }
  }, [sessionId]);

  const verifyStripePayment = async () => {
    try {
      setVerifying(true);
      const { data } = await api.post('/payment/stripe/verify', { sessionId });
      
      if (data.success) {
        setOrderDetails({
          orderId: data.order?.orderId || sessionId,
          productName: data.order?.productName || 'Your purchase'
        });
      } else {
        setVerificationError('Payment verification incomplete. Please check your orders.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationError(
        'We received your payment but verification is pending. Please check your email or contact support if needed.'
      );
    } finally {
      setVerifying(false);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Verifying Payment...
          </h2>
          <p className="text-gray-600">
            Please wait while we confirm your payment.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
          <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-600 mb-6">
          Your payment has been processed successfully. Thank you for your purchase!
        </p>

        {/* Order Details */}
        {orderDetails && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
            <h3 className="font-semibold text-gray-900 mb-2">Order Details:</h3>
            {orderDetails.productName && (
              <p className="text-sm text-gray-700 mb-1">
                <span className="font-medium">Product:</span> {orderDetails.productName}
              </p>
            )}
            {orderDetails.orderId && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">Order ID:</span> {orderDetails.orderId}
              </p>
            )}
          </div>
        )}

        {/* Verification Error */}
        {verificationError && (
          <div 
            role="alert"
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left"
          >
            <div className="flex items-start">
              <svg className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-yellow-800">{verificationError}</p>
            </div>
          </div>
        )}

        {/* Confirmation Email Notice */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-800">
            📧 A confirmation email has been sent to your registered email address.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Link
            to="/payment/orders"
            className="block w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            View My Orders
          </Link>
          <Link
            to="/products"
            className="block w-full py-3 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition"
          >
            Continue Shopping
          </Link>
          <Link
            to="/profile"
            className="block w-full py-2 px-4 text-blue-600 hover:text-blue-700 transition text-sm"
          >
            Go to Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;