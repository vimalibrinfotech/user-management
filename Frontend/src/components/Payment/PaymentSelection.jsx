import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const PaymentSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [selectedGateway, setSelectedGateway] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sample product - you can make this dynamic
  const product = {
    name: 'Premium Membership',
    description: 'Access to all premium features for 1 year',
    price: 999, // INR for Razorpay, will convert for Stripe
    priceUSD: 12 // USD for Stripe
  };

  const handleRazorpayPayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Create order
      const { data } = await api.post('/payment/razorpay/create-order', {
        amount: product.price,
        productName: product.name,
        productDescription: product.description
      });

      // Razorpay checkout options
      const options = {
        key: data.order.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'User Management System',
        description: product.description,
        order_id: data.order.id,
        handler: async function (response) {
          try {
            // Verify payment
            const verifyRes = await api.post('/payment/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              dbOrderId: data.dbOrderId
            });

            if (verifyRes.data.success) {
              navigate('/payment/success');
            } else {
              setError('Payment verification failed');
            }
          } catch (err) {
            setError('Payment verification failed');
            console.error(err);
          }
        },
        prefill: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          contact: user.phones[0] || ''
        },
        theme: {
          color: '#3B82F6'
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
            setError('Payment cancelled by user');
          }
        }
      };

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      rzp.open();
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Create Stripe checkout session
      const { data } = await api.post('/payment/stripe/create-checkout', {
        amount: product.priceUSD,
        productName: product.name,
        productDescription: product.description
      });

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (selectedGateway === 'razorpay') {
      handleRazorpayPayment();
    } else {
      handleStripePayment();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Product Card */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
            <h2 className="text-3xl font-bold text-white">{product.name}</h2>
            <p className="text-blue-100 mt-2">{product.description}</p>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Price Display */}
            <div className="mb-6 text-center">
              <div className="text-4xl font-bold text-gray-900">
                {selectedGateway === 'razorpay' ? '₹' : '$'}
                {selectedGateway === 'razorpay' ? product.price : product.priceUSD}
              </div>
              <p className="text-gray-500 mt-1">One-time payment</p>
            </div>

            {/* Payment Gateway Selection */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Select Payment Method
              </h3>

              <div className="space-y-3">
                {/* Razorpay Option */}
                <label
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    selectedGateway === 'razorpay'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="gateway"
                    value="razorpay"
                    checked={selectedGateway === 'razorpay'}
                    onChange={(e) => setSelectedGateway(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Razorpay</span>
                      <span className="text-sm text-gray-500">UPI, Cards, NetBanking</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Best for Indian payments • Multiple payment options
                    </p>
                  </div>
                  <svg className="w-12 h-12 ml-3" viewBox="0 0 120 120">
                    <rect fill="#072654" width="120" height="120" rx="15"/>
                    <path fill="#3395FF" d="M30 45h60v30H30z"/>
                  </svg>
                </label>

                {/* Stripe Option */}
                <label
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                    selectedGateway === 'stripe'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="gateway"
                    value="stripe"
                    checked={selectedGateway === 'stripe'}
                    onChange={(e) => setSelectedGateway(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">Stripe</span>
                      <span className="text-sm text-gray-500">International Cards</span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Secure international payments • Credit/Debit cards
                    </p>
                  </div>
                  <svg className="w-12 h-12 ml-3" viewBox="0 0 120 120">
                    <rect fill="#635BFF" width="120" height="120" rx="15"/>
                    <path fill="white" d="M35 45c0-3 2-5 5-5h40c3 0 5 2 5 5v30c0 3-2 5-5 5H40c-3 0-5-2-5-5V45z"/>
                  </svg>
                </label>
              </div>
            </div>

            {/* Features List */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-3">What's included:</h4>
              <ul className="space-y-2">
                {[
                  'Access to all premium features',
                  'Priority customer support',
                  'Advanced analytics dashboard',
                  'Export data functionality',
                  'No advertisements'
                ].map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-gray-700">
                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Pay with ${selectedGateway === 'razorpay' ? 'Razorpay' : 'Stripe'}`}
            </button>

            {/* Security Badge */}
            <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              Secure payment • Your data is encrypted
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelection;