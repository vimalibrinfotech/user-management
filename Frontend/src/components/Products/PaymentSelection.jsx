import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
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
      if (!scriptLoaded || !window.Razorpay) {
        const loaded = await loadRazorpayScript();
        if (!loaded) {
          setError('Failed to load payment gateway. Please refresh and try again.');
          setProcessing(false);
          return;
        }
      }

      const { data } = await api.post('/payment/razorpay/create-order', {
        amount: product.price,
        productId: product._id
      });

      const options = {
        key: data.order.key,
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
    setError('');

    if (selectedGateway === 'razorpay') {
      await handleRazorpayPayment();
    } else {
      await handleStripePayment();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Back Button */}
        <Link 
          to="/products"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6 group"
        >
          <svg className="w-5 h-5 mr-2 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Products
        </Link>

        {/* Main Card */}
        <div className="bg-white shadow-2xl rounded-2xl overflow-hidden">
          
          {/* Product Header - Gradient Background */}
          <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-purple-600 px-8 py-10">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-10 rounded-full -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-10 rounded-full -ml-16 -mb-16"></div>
            
            <div className="relative z-10">
              {product.image && (
                <div className="mb-6">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    loading="lazy"
                    className="w-full max-h-64 object-contain rounded-xl shadow-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <h1 className="text-4xl font-bold text-white mb-3">{product.name}</h1>
              <p className="text-blue-100 text-lg leading-relaxed">{product.description}</p>
            </div>
          </div>

          <div className="p-8 md:p-10">
            {/* Error Alert */}
            {error && (
              <div 
                role="alert"
                className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-r-lg flex items-start animate-fadeIn"
              >
                <svg className="w-6 h-6 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-semibold">Payment Error</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Price Display */}
            <div className="text-center mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100">
              <p className="text-sm text-gray-600 mb-2">Total Amount</p>
              <div className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {selectedGateway === 'razorpay' ? '₹' : '$'}
                {selectedGateway === 'razorpay' ? product.price : product.priceUSD}
              </div>
              <p className="text-gray-500 mt-2">One-time payment • No hidden fees</p>
            </div>

            {/* Payment Gateway Selection */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Choose Payment Method
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Razorpay Option */}
                <button
                  onClick={() => setSelectedGateway('razorpay')}
                  disabled={processing}
                  className={`relative p-6 rounded-xl border-2 text-left transition-all duration-300 transform hover:scale-105 ${
                    selectedGateway === 'razorpay'
                      ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg'
                      : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {selectedGateway === 'razorpay' && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-blue-500 text-white rounded-full p-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900">Razorpay</p>
                      <p className="text-sm text-blue-600">Recommended for India</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2 py-1 text-xs bg-white rounded-full border border-gray-200">UPI</span>
                    <span className="px-2 py-1 text-xs bg-white rounded-full border border-gray-200">Cards</span>
                    <span className="px-2 py-1 text-xs bg-white rounded-full border border-gray-200">Net Banking</span>
                    <span className="px-2 py-1 text-xs bg-white rounded-full border border-gray-200">Wallet</span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mt-2">
                    ⚡ Instant payment • Trusted by millions
                  </p>
                </button>

                {/* Stripe Option */}
                <button
                  onClick={() => setSelectedGateway('stripe')}
                  disabled={processing}
                  className={`relative p-6 rounded-xl border-2 text-left transition-all duration-300 transform hover:scale-105 ${
                    selectedGateway === 'stripe'
                      ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300 hover:shadow-md'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {selectedGateway === 'stripe' && (
                    <div className="absolute top-3 right-3">
                      <div className="bg-purple-500 text-white rounded-full p-1">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center mb-3">
                    <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zm0 2v12h16V6H4zm2 2h8v2H6V8zm0 4h5v2H6v-2z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900">Stripe</p>
                      <p className="text-sm text-purple-600">International Payments</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="px-2 py-1 text-xs bg-white rounded-full border border-gray-200">Visa</span>
                    <span className="px-2 py-1 text-xs bg-white rounded-full border border-gray-200">Mastercard</span>
                    <span className="px-2 py-1 text-xs bg-white rounded-full border border-gray-200">Amex</span>
                  </div>
                  
                  <p className="text-xs text-gray-600 mt-2">
                    🌍 Secure worldwide payments
                  </p>
                </button>
              </div>
            </div>

            {/* Features Preview */}
            {product.features && product.features.length > 0 && (
              <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-100">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  What you'll get:
                </h4>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {product.features.slice(0, 6).map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-lg font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing Payment...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Proceed to Pay {selectedGateway === 'razorpay' ? '₹' + product.price : '$' + product.priceUSD}
                </>
              )}
            </button>

            {/* Trust Badges */}
            <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-1 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                256-bit SSL
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-1 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Secure Payment
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-1 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                </svg>
                Fast Delivery
              </div>
            </div>
          </div>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center px-6 py-3 bg-white rounded-full shadow-md">
            <svg className="w-6 h-6 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-gray-700 font-medium">30-Day Money Back Guarantee</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSelection;