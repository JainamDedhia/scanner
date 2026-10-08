'use client';
import { useState, useEffect } from 'react';
import UploadZone from '@/components/UploadZone';
import Link from 'next/link';
import { format } from 'date-fns';
import BillDetail from '@/components/BillDetail';

export default function Home() {
  const [recentBills, setRecentBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const fetchRecent = async () => {
    try {
      const res = await fetch('/api/bills?limit=10');
      const data = await res.json();
      if (data.bills) setRecentBills(data.bills);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecent();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Digitize New Bills</h1>
        <UploadZone onUploadComplete={fetchRecent} />
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Uploads</h2>
        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : recentBills.length === 0 ? (
          <p className="text-gray-500">No bills uploaded yet.</p>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentBills.map(bill => (
                  <tr 
                    key={bill.id} 
                    className="hover:bg-blue-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedBillId(bill.id)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium text-blue-600">
                      {bill.created_at ? format(new Date(bill.created_at), 'MMM dd, HH:mm') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.merchant_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.buyer_name || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.total_amount ? `₹${bill.total_amount}` : '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        bill.status === 'OK' ? 'bg-green-100 text-green-800' : 
                        bill.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {bill.status === 'needs_review' ? 'Needs Review' : bill.status === 'OK' ? 'OK' : 'Failed'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedBillId && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 sm:p-6 lg:p-8 flex justify-center items-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl overflow-hidden relative">
            <BillDetail 
              id={selectedBillId} 
              onClose={() => setSelectedBillId(null)} 
              onUpdated={fetchRecent} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
