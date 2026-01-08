import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const PaymentSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get product from route state
  const product = location.state?.product;

  const [selectedGateway, setSelectedGateway] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if no product
  if (!product) {
    navigate('/products');
    return null;
  }

  const handleRazorpayPayment = async () => {
    setLoading(true);
    setError('');

    try {
      // Create order with productId
      const { data } = await api.post('/payment/razorpay/create-order', {
        amount: product.price,
        productId: product._id  // ← Pass productId
      });

      // Rest of Razorpay code remains same...
      const options = {
        key: data.order.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'User Management System',
        description: product.description,
        order_id: data.order.id,
        handler: async function (response) {
          try {
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
      const { data } = await api.post('/payment/stripe/create-checkout', {
        amount: product.priceUSD,
        productId: product._id  // ← Pass productId
      });

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
        {/* Product Info Card */}
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

            {/* Payment Gateway Selection - same as before */}
            {/* ... rest of the payment selection UI ... */}

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : `Pay with ${selectedGateway === 'razorpay' ? 'Razorpay' : 'Stripe'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelection;