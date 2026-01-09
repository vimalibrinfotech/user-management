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
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Redirect if product missing or validate product exists
  useEffect(() => {
    if (!product?._id) {
      navigate('/products');
      return;
    }
    verifyProduct();
  }, []);

  // Load Razorpay script on mount
  useEffect(() => {
    loadRazorpayScript();
  }, []);

  const verifyProduct = async () => {
    try {
      await api.get(`/products/${product._id}`);
    } catch (error) {
      console.error('Product verification failed:', error);
      navigate('/products');
    }
  };

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      // Check if already loaded
      if (window.Razorpay) {
        setScriptLoaded(true);
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        setScriptLoaded(true);
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('Failed to load Razorpay script');
        setScriptLoaded(false);
        resolve(false);
      };

      document.body.appendChild(script);
    });
  };

  if (!product) return null;

  // ---------------- RAZORPAY ----------------
  const handleRazorpayPayment = async () => {
    if (processing) return;
    
    setProcessing(true);
    setError('');

    try {
      // Ensure script is loaded
      if (!scriptLoaded || !window.Razorpay) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setError('Failed to load payment gateway. Please refresh and try again.');
          setProcessing(false);
          return;
        }
      }

      // Create order
      const { data } = await api.post('/payment/razorpay/create-order', {
        amount: product.price,
        productId: product._id
      });

      const options = {
        key: data.order.key, // Public key - safe to expose
        amount: data.order.amount,
        currency: data.order.currency,
        name: 'User Management System',
        description: product.description,
        order_id: data.order.id,

        handler: async (response) => {
          try {
            setProcessing(true);
            
            const verifyRes = await api.post('/payment/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              dbOrderId: data.dbOrderId
            });

            if (verifyRes.data.success) {
              navigate('/payment/success', { 
                state: { 
                  orderId: data.dbOrderId,
                  productName: product.name 
                } 
              });
            } else {
              setError('Payment verification failed. Please contact support.');
              setProcessing(false);
            }
          } catch (err) {
            console.error('Verification error:', err);
            setError(err.response?.data?.message || 'Payment verification failed');
            setProcessing(false);
          }
        },

        prefill: {
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          contact: user?.phones?.[0] || ''
        },

        theme: { 
          color: '#3B82F6',
          backdrop_color: 'rgba(0, 0, 0, 0.5)'
        },

        modal: {
          ondismiss: () => {
            setProcessing(false);
            // Delay error message to avoid showing it if accidentally dismissed
            setTimeout(() => {
              if (!processing) {
                setError('Payment cancelled. You can try again when ready.');
              }
            }, 300);
          },
          escape: true,
          animation: true
        }
      };

      const rzp = new window.Razorpay(options);
      
      rzp.on('payment.failed', function (response) {
        setError('Payment failed: ' + response.error.description);
        setProcessing(false);
      });

      rzp.open();
      setProcessing(false);

    } catch (err) {
      console.error('Payment error:', err);
      setError(err.response?.data?.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  // ---------------- STRIPE ----------------
  const handleStripePayment = async () => {
    if (processing) return;
    
    setProcessing(true);
    setError('');

    try {
      const { data } = await api.post('/payment/stripe/create-checkout', {
        amount: product.priceUSD,
        productId: product._id
      });

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error('Stripe error:', err);
      setError(err.response?.data?.message || 'Failed to initiate payment');
      setProcessing(false);
    }
  };

  const handlePayment = async () => {
    if (processing) return;

    // Clear previous errors
    setError('');

    if (selectedGateway === 'razorpay') {
      await handleRazorpayPayment();
    } else {
      await handleStripePayment();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {/* Product Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-8">
            {product.image && (
              <img 
                src={product.image} 
                alt={product.name}
                loading="lazy"
                className="w-full h-48 object-cover rounded-lg mb-4"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            )}
            <h2 className="text-3xl font-bold text-white">{product.name}</h2>
            <p className="text-blue-100 mt-2">{product.description}</p>
          </div>

          <div className="p-6">
            {/* Error Alert */}
            {error && (
              <div 
                role="alert"
                className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex items-start"
              >
                <svg className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Price Display */}
            <div className="text-center mb-6">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Razorpay Option */}
                <button
                  onClick={() => setSelectedGateway('razorpay')}
                  disabled={processing}
                  role="radio"
                  aria-checked={selectedGateway === 'razorpay'}
                  aria-label="Select Razorpay payment method"
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    selectedGateway === 'razorpay'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Razorpay</span>
                    {selectedGateway === 'razorpay' && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    UPI • Cards • Net Banking
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Best for Indian payments
                  </p>
                </button>

                {/* Stripe Option */}
                <button
                  onClick={() => setSelectedGateway('stripe')}
                  disabled={processing}
                  role="radio"
                  aria-checked={selectedGateway === 'stripe'}
                  aria-label="Select Stripe payment method"
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    selectedGateway === 'stripe'
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-gray-900">Stripe</span>
                    {selectedGateway === 'stripe' && (
                      <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    International Cards
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Secure worldwide payments
                  </p>
                </button>
              </div>
            </div>

            {/* Features Preview */}
            {product.features && product.features.length > 0 && (
              <div className="mb-6 bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">What's included:</h4>
                <ul className="space-y-2">
                  {product.features.slice(0, 5).map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-700">
                      <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={processing}
              aria-busy={processing}
              className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                `Pay ${selectedGateway === 'razorpay' ? '₹' + product.price : '$' + product.priceUSD} with ${selectedGateway === 'razorpay' ? 'Razorpay' : 'Stripe'}`
              )}
            </button>

            {/* Security Badge */}
            <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              256-bit SSL encrypted • Your data is secure
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelection;