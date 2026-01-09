import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const PaymentSelection = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Product passed from Product Details page
  const product = location.state?.product;

  const [selectedGateway, setSelectedGateway] = useState('razorpay');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 🚫 Redirect safely if product missing
  useEffect(() => {
    if (!product) {
      navigate('/products');
    }
  }, [product, navigate]);

  if (!product) return null;

  // ---------------- RAZORPAY ----------------
  const handleRazorpayPayment = async () => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/payment/razorpay/create-order', {
        amount: product.price,
        productId: product._id
      });

      if (!window.Razorpay) {
        setError('Razorpay SDK not loaded');
        setLoading(false);
        return;
      }

      const options = {
        key: data.order.key,
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'User Management System',
        description: product.description,
        order_id: data.order.id,

        handler: async (response) => {
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
          }
        },

        prefill: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          contact: user?.phones?.[0] || ''
        },

        theme: { color: '#3B82F6' },

        modal: {
          ondismiss: () => {
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

  // ---------------- STRIPE ----------------
  const handleStripePayment = async () => {
    if (loading) return;
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/payment/stripe/create-checkout', {
        amount: product.priceUSD,
        productId: product._id
      });

      window.location.href = data.url;
    } catch (err) {
      setError(err.response?.data?.message || 'Payment failed');
      setLoading(false);
    }
  };

  const handlePayment = () => {
    if (loading) return;
    selectedGateway === 'razorpay'
      ? handleRazorpayPayment()
      : handleStripePayment();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
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

            {/* Price */}
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-gray-900">
                {selectedGateway === 'razorpay' ? '₹' : '$'}
                {selectedGateway === 'razorpay'
                  ? product.price
                  : product.priceUSD}
              </div>
              <p className="text-gray-500 mt-1">One-time payment</p>
            </div>

            {/* Gateway Switch */}
            <div className="flex justify-center gap-4 mb-6">
              <button
                onClick={() => setSelectedGateway('razorpay')}
                className={`px-4 py-2 rounded-lg ${
                  selectedGateway === 'razorpay'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200'
                }`}
              >
                Razorpay
              </button>

              <button
                onClick={() => setSelectedGateway('stripe')}
                className={`px-4 py-2 rounded-lg ${
                  selectedGateway === 'stripe'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200'
                }`}
              >
                Stripe
              </button>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading
                ? 'Processing...'
                : `Pay with ${selectedGateway === 'razorpay' ? 'Razorpay' : 'Stripe'}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelection;
