'use client';
import { useState, useEffect, useMemo } from 'react';
import { format, subDays, subMonths, startOfYear } from 'date-fns';
import { ChevronRight } from 'lucide-react';
import BillDetail from '@/components/BillDetail';

type DateRange = 'today' | '7days' | '30days' | '3months' | 'year' | 'all';

export default function AnalyticsPage() {
  const [range, setRange] = useState<DateRange>('all');
  const [data, setData] = useState<{ bills: any[], items: any[] }>({ bills: [], items: [] });
  const [loading, setLoading] = useState(true);
  
  // Drill-down states
  const [selectedMerchant, setSelectedMerchant] = useState<string | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const fetchAnalytics = async (selectedRange: DateRange) => {
    setLoading(true);
    try {
      let url = '/api/summary?all=true';
      const today = new Date();
      let start = '';
      let end = format(today, 'yyyy-MM-dd');

      if (selectedRange === 'today') start = end;
      else if (selectedRange === '7days') start = format(subDays(today, 7), 'yyyy-MM-dd');
      else if (selectedRange === '30days') start = format(subDays(today, 30), 'yyyy-MM-dd');
      else if (selectedRange === '3months') start = format(subMonths(today, 3), 'yyyy-MM-dd');
      else if (selectedRange === 'year') start = format(startOfYear(today), 'yyyy-MM-dd');

      if (selectedRange !== 'all') {
        url = `/api/summary?start=${start}&end=${end}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(range);
  }, [range]);

  const merchantStats = useMemo(() => {
    const groups: Record<string, { totalBags: number, billIds: number[] }> = {};
    
    // Calculate total bags per bill
    const billBags: Record<number, number> = {};
    data.items.forEach(i => {
      const bags = parseInt(i.bags) || 0;
      billBags[i.bill_id] = (billBags[i.bill_id] || 0) + bags;
    });

    data.bills.forEach(b => {
      const m = b.merchant_name || 'Unknown';
      if (!groups[m]) groups[m] = { totalBags: 0, billIds: [] };
      groups[m].billIds.push(b.id);
      groups[m].totalBags += (billBags[b.id] || 0);
    });

    return Object.entries(groups)
      .map(([name, g]) => ({ name, ...g }))
      .sort((a, b) => b.totalBags - a.totalBags);
  }, [data]);

  const selectedMerchantBills = useMemo(() => {
    if (!selectedMerchant) return [];
    const stat = merchantStats.find(m => m.name === selectedMerchant);
    if (!stat) return [];
    return data.bills.filter(b => stat.billIds.includes(b.id));
  }, [selectedMerchant, merchantStats, data.bills]);

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      {selectedBillId && (
        <div className="fixed inset-0 z-50 p-4 sm:p-10 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] shadow-2xl">
            <BillDetail 
              id={selectedBillId} 
              onClose={() => setSelectedBillId(null)} 
              onUpdated={() => fetchAnalytics(range)} 
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <select 
          className="border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          value={range}
          onChange={e => {
            setRange(e.target.value as DateRange);
            setSelectedMerchant(null);
          }}
        >
          <option value="today">Today</option>
          <option value="7days">Last 7 Days</option>
          <option value="30days">Last 30 Days</option>
          <option value="3months">Last 3 Months</option>
          <option value="year">This Year</option>
          <option value="all">All Time</option>
        </select>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        <div className="w-full lg:w-1/3 bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50 shrink-0">
            <h3 className="font-semibold text-gray-900">Total Bags by Merchant</h3>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            {loading ? (
              <p className="p-4 text-center text-gray-500 text-sm">Loading...</p>
            ) : merchantStats.length === 0 ? (
              <p className="p-4 text-center text-gray-500 text-sm">No data for this range.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {merchantStats.map(m => (
                  <li 
                    key={m.name}
                    className={`flex items-center justify-between p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedMerchant === m.name ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                    onClick={() => setSelectedMerchant(m.name)}
                  >
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{m.name}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                        {m.totalBags} Bags
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="w-full lg:w-2/3 bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b bg-gray-50 shrink-0">
            <h3 className="font-semibold text-gray-900">
              {selectedMerchant ? `Bill Entries for ${selectedMerchant}` : 'Select a merchant to view bills'}
            </h3>
          </div>
          <div className="overflow-y-auto flex-1 p-0">
            {!selectedMerchant ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm p-10 text-center">
                Click on a merchant from the list to see their bills
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Broker</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selectedMerchantBills.length === 0 ? (
                    <tr><td colSpan={4} className="p-4 text-center text-sm text-gray-500">No bills found</td></tr>
                  ) : (
                    selectedMerchantBills.map((bill: any) => (
                      <tr 
                        key={bill.id} 
                        className="hover:bg-blue-50 cursor-pointer transition-colors"
                        onClick={() => setSelectedBillId(bill.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {bill.created_at ? format(new Date(bill.created_at), 'MMM dd, yyyy') : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{bill.buyer_name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bill.broker_name || '-'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {bill.total_amount ? `₹${bill.total_amount}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
