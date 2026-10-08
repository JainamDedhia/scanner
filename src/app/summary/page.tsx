'use client';
import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Download, Calendar as CalendarIcon, FileText, ShoppingCart, IndianRupee } from 'lucide-react';
import BillDetail from '@/components/BillDetail';

export default function SummaryPage() {
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [data, setData] = useState<{ bills: any[], items: any[] }>({ bills: [], items: [] });
  const [loading, setLoading] = useState(true);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const fetchSummary = async (selectedDate: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/summary?date=${selectedDate}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(date);
  }, [date]);

  const stats = useMemo(() => {
    const numBills = data.bills.length;
    const totalAmount = data.bills.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
    // Rough calculation for total weight if it has numeric parts
    return { numBills, totalAmount };
  }, [data.bills]);

  const merchantGroup = useMemo(() => {
    const groups: Record<string, { bills: number, amount: number, weight: string[] }> = {};
    for (const b of data.bills) {
      const m = b.merchant_name || 'Unknown';
      if (!groups[m]) groups[m] = { bills: 0, amount: 0, weight: [] };
      groups[m].bills++;
      groups[m].amount += (Number(b.total_amount) || 0);
      if (b.total_weight) groups[m].weight.push(b.total_weight);
    }
    return Object.entries(groups).map(([name, g]) => ({ name, ...g })).sort((a, b) => b.amount - a.amount);
  }, [data.bills]);

  const productGroup = useMemo(() => {
    const groups: Record<string, { quantity: number, weight: string[], value: number }> = {};
    for (const i of data.items) {
      const p = i.product_name || 'Unknown Item';
      if (!groups[p]) groups[p] = { quantity: 0, weight: [], value: 0 };
      groups[p].quantity += 1;
      groups[p].value += (Number(i.line_price) || 0);
      if (i.weight) groups[p].weight.push(i.weight);
    }
    return Object.entries(groups).map(([name, g]) => ({ name, ...g })).sort((a, b) => b.value - a.value);
  }, [data.items]);

  const downloadCSV = async (all = false) => {
    try {
      const res = await fetch(all ? `/api/summary?all=true` : `/api/summary?date=${date}`);
      const json = await res.json();
      
      const rows = [['Bill ID', 'Date', 'Merchant', 'Buyer', 'Broker', 'Total Amount', 'Product', 'Bags', 'Weight', 'Line Price']];
      
      json.bills.forEach((b: any) => {
        const billItems = json.items.filter((i: any) => i.bill_id === b.id);
        if (billItems.length === 0) {
          rows.push([b.id, b.bill_date || b.created_at, b.merchant_name, b.buyer_name, b.broker_name, b.total_amount, '', '', '', '']);
        } else {
          billItems.forEach((i: any) => {
            rows.push([b.id, b.bill_date || b.created_at, b.merchant_name, b.buyer_name, b.broker_name, b.total_amount, i.product_name, i.bags, i.weight, i.line_price]);
          });
        }
      });
      
      const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.map(cell => `"${(cell||'').toString().replace(/"/g, '""')}"`).join(",")).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", all ? "billscan_all.csv" : `billscan_${date}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Failed to download CSV', e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Daily Summary</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input 
              type="date" 
              value={date} 
              onChange={e => setDate(e.target.value)}
              className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button onClick={() => downloadCSV(false)} className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium">
            <Download className="w-4 h-4 mr-2" /> Date CSV
          </button>
          <button onClick={() => downloadCSV(true)} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow-sm">
            <Download className="w-4 h-4 mr-2" /> All Data CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 text-center py-10">Loading summary...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Bills</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.numBills}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg"><FileText className="w-6 h-6 text-blue-600" /></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">₹{stats.totalAmount.toFixed(2)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg"><IndianRupee className="w-6 h-6 text-green-600" /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">By Merchant</h3>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Bills</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {merchantGroup.length === 0 ? <tr><td colSpan={3} className="p-4 text-center text-sm text-gray-500">No data</td></tr> : null}
                    {merchantGroup.map((m, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-[200px]">{m.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">{m.bills}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">₹{m.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col h-[400px]">
              <div className="p-4 border-b bg-gray-50">
                <h3 className="font-semibold text-gray-900">By Product</h3>
              </div>
              <div className="overflow-y-auto flex-1 p-0">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Items</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productGroup.length === 0 ? <tr><td colSpan={3} className="p-4 text-center text-sm text-gray-500">No data</td></tr> : null}
                    {productGroup.map((p, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900 truncate max-w-[200px]">{p.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 text-right">{p.quantity}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">₹{p.value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b bg-gray-50">
              <h3 className="font-semibold text-gray-900">Entries for this Date</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.bills.length === 0 ? <tr><td colSpan={5} className="p-4 text-center text-sm text-gray-500">No entries</td></tr> : null}
                  {data.bills.map((bill: any) => (
                    <tr 
                      key={bill.id} 
                      className="hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedBillId(bill.id)}
                    >
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium whitespace-nowrap">
                        {bill.created_at ? format(new Date(bill.created_at), 'HH:mm') : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{bill.merchant_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{bill.buyer_name || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{bill.total_amount ? `₹${bill.total_amount}` : '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          bill.status === 'OK' ? 'bg-green-100 text-green-800' : 
                          bill.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {bill.status === 'needs_review' ? 'Review' : bill.status === 'OK' ? 'OK' : 'Failed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedBillId && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 sm:p-6 lg:p-8 flex justify-center items-center backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl overflow-hidden relative">
            <BillDetail 
              id={selectedBillId} 
              onClose={() => setSelectedBillId(null)} 
              onUpdated={() => fetchSummary(date)} 
            />
          </div>
        </div>
      )}
    </div>
  );
}
