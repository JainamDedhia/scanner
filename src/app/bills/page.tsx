'use client';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { X, Search, Filter, Save, Trash2, Image as ImageIcon, RefreshCcw } from 'lucide-react';
import { useSearchParams, useRouter } from 'next/navigation';
import BillDetail from '@/components/BillDetail';
import { Suspense } from 'react';

function BillsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(
    searchParams.get('id') ? parseInt(searchParams.get('id')!, 10) : null
  );

  const [filterNeedsReview, setFilterNeedsReview] = useState(false);
  const [search, setSearch] = useState('');

  const fetchBills = async () => {
    try {
      const res = await fetch('/api/bills');
      const data = await res.json();
      if (data.bills) setBills(data.bills);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      if (filterNeedsReview && b.status !== 'needs_review') return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          (b.merchant_name || '').toLowerCase().includes(q) ||
          (b.buyer_name || '').toLowerCase().includes(q) ||
          (b.broker_name || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bills, filterNeedsReview, search]);

  useEffect(() => {
    if (selectedBillId) {
      router.replace(`/bills?id=${selectedBillId}`);
    } else {
      router.replace(`/bills`);
    }
  }, [selectedBillId, router]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {selectedBillId ? (
        <BillDetail 
          id={selectedBillId} 
          onClose={() => setSelectedBillId(null)} 
          onUpdated={fetchBills} 
        />
      ) : (
        <div className="flex flex-col h-full space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-900">Bills</h1>
            <div className="flex gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search merchant/buyer..."
                  className="pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-blue-600 focus:ring-blue-500"
                  checked={filterNeedsReview}
                  onChange={e => setFilterNeedsReview(e.target.checked)}
                />
                <span>Needs Review</span>
              </label>
            </div>
          </div>

          <div className="flex-1 bg-white border rounded-lg shadow-sm overflow-hidden overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Broker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                ) : filteredBills.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-4 text-center text-gray-500">No bills found.</td></tr>
                ) : (
                  filteredBills.map(bill => (
                    <tr 
                      key={bill.id} 
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedBillId(bill.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {bill.created_at ? format(new Date(bill.created_at), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.merchant_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.buyer_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.broker_name || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{bill.total_amount ? `₹${bill.total_amount}` : '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bill.status === 'OK' ? 'bg-green-100 text-green-800' : 
                          bill.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {bill.status === 'needs_review' ? 'Needs Review' : bill.status === 'OK' ? 'OK' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BillsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading bills...</div>}>
      <BillsContent />
    </Suspense>
  );
}
