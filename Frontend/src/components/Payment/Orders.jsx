import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import jsPDF from 'jspdf';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await api.get('/payment/orders');
      setOrders(data.orders);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'created':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generateInvoicePDF = (order) => {
    const doc = new jsPDF();
    
    // Colors
    const primaryColor = [37, 99, 235]; // Blue
    const secondaryColor = [107, 114, 128]; // Gray
    const successColor = [16, 185, 129]; // Green
    
    // Page dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header Background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 50, 'F');
    
    // Company Name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('User Management System', 15, 20);
    
    // Invoice Title
    doc.setFontSize(16);
    doc.text('INVOICE', pageWidth - 15, 20, { align: 'right' });
    
    // Date
    doc.setFontSize(10);
    doc.text(`Date: ${formatDate(order.createdAt)}`, pageWidth - 15, 30, { align: 'right' });
    
    // Status Badge
    let yPos = 40;
    const statusText = order.status.toUpperCase();
    if (order.status === 'completed') {
      doc.setFillColor(...successColor);
    } else if (order.status === 'pending') {
      doc.setFillColor(245, 158, 11);
    } else {
      doc.setFillColor(239, 68, 68);
    }
    doc.setTextColor(255, 255, 255);
    doc.roundedRect(pageWidth - 45, 33, 30, 8, 2, 2, 'F');
    doc.setFontSize(9);
    doc.text(statusText, pageWidth - 30, 38.5, { align: 'center' });
    
    yPos = 65;
    
    // Order Information Section
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Information', 15, yPos);
    yPos += 8;
    
    // Underline
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(15, yPos, 80, yPos);
    yPos += 10;
    
    // Order Details
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    
    const addField = (label, value) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(value || 'N/A', 70, yPos);
      yPos += 7;
    };
    
    addField('Order ID', order.orderId);
    addField('Payment ID', order.paymentId);
    addField('Payment Method', order.paymentGateway.toUpperCase());
    
    yPos += 5;
    
    // Product Details Section
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Product Details', 15, yPos);
    yPos += 8;
    
    doc.setDrawColor(...primaryColor);
    doc.line(15, yPos, 80, yPos);
    yPos += 10;
    
    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    
    addField('Product Name', order.productName);
    
    // Description (wrapped)
    if (order.productDescription) {
      doc.setFont('helvetica', 'bold');
      doc.text('Description:', 20, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      const descLines = doc.splitTextToSize(order.productDescription, 170);
      doc.text(descLines, 20, yPos);
      yPos += descLines.length * 5 + 5;
    }
    
    yPos += 5;
    
    // Payment Summary Section
    doc.setFillColor(245, 245, 245);
    doc.rect(15, yPos, pageWidth - 30, 40, 'F');
    
    yPos += 10;
    
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment Summary', 20, yPos);
    yPos += 10;
    
    // Amount Details
    doc.setFontSize(11);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'normal');
    doc.text('Currency:', 20, yPos);
    doc.text(order.currency, pageWidth - 60, yPos);
    yPos += 8;
    
    // Total Amount (highlighted)
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 20, yPos);
    doc.setFontSize(16);
    doc.setTextColor(...primaryColor);
    const currencySymbol = order.currency === 'INR' ? '₹' : '$';
    doc.text(`${currencySymbol}${order.amount.toFixed(2)}`, pageWidth - 60, yPos);
    
    yPos += 20;
    
    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 30;
    
    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(15, footerY, pageWidth - 15, footerY);
    
    // Thank you message
    doc.setFontSize(11);
    doc.setTextColor(...secondaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('Thank you for your purchase!', pageWidth / 2, footerY + 8, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('For support, contact: support@usermanagement.com', pageWidth / 2, footerY + 14, { align: 'center' });
    
    // Border
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(1);
    doc.rect(10, 55, pageWidth - 20, doc.internal.pageSize.getHeight() - 75, 'S');
    
    // Save PDF
    const fileName = `Invoice_${order.orderId}_${Date.now()}.pdf`;
    doc.save(fileName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl text-gray-600">Loading orders...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
          <p className="text-gray-600">View and track your order history</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 mb-4">
              <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Orders Yet</h3>
            <p className="text-gray-600 mb-6">
              You haven't made any purchases yet. Start shopping to see your orders here!
            </p>
            <Link
              to="/products"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <div
                key={order._id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition"
              >
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    {/* Order Info */}
                    <div className="mb-4 md:mb-0">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {order.productName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Order ID: <span className="font-mono">{order.orderId}</span>
                      </p>
                      <p className="text-sm text-gray-500">
                        Placed on: {formatDate(order.createdAt)}
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full capitalize ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Product Description */}
                  {order.productDescription && (
                    <p className="text-gray-600 text-sm mb-4">
                      {order.productDescription}
                    </p>
                  )}

                  {/* Order Details Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-gray-200">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Amount</p>
                      <p className="text-lg font-bold text-gray-900">
                        {order.currency === 'INR' ? '₹' : order.currency === 'USD' ? '$' : ''}
                        {order.amount ? order.amount.toFixed(2) : '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {order.paymentGateway || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Currency</p>
                      <p className="text-sm font-medium text-gray-900">
                        {order.currency || 'INR'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Payment ID</p>
                      <p className="text-sm font-medium text-gray-900 font-mono truncate" title={order.paymentId}>
                        {order.paymentId || 'N/A'}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                    {order.status === 'completed' && (
                      <button 
                        onClick={() => generateInvoicePDF(order)}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download Invoice (PDF)
                      </button>
                    )}
                    {order.status === 'failed' && (
                      <Link
                        to="/products"
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Try Again
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to Products Link */}
        <div className="mt-8 text-center">
          <Link
            to="/products"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Orders;