'use client';
import { useState, useEffect } from 'react';
import { X, Save, Trash2, Image as ImageIcon, RefreshCcw } from 'lucide-react';

export default function BillDetail({ id, onClose, onUpdated }: { id: number, onClose: () => void, onUpdated: () => void }) {
  const [data, setData] = useState<{bill: any, items: any[]}>({ bill: {}, items: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [retryProcessing, setRetryProcessing] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/bills/${id}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/bills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    try {
      const res = await fetch(`/api/bills/${id}`, { method: 'DELETE' });
      if (res.ok) {
        onUpdated();
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRetry = async () => {
    setRetryProcessing(true);
    try {
      const formData = new FormData();
      formData.append('billId', id.toString());
      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        await fetchDetail();
        onUpdated();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRetryProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-center bg-white h-full flex items-center justify-center rounded-lg shadow-sm">Loading details...</div>;

  const { bill, items } = data;
  const imageUrl = bill.image_path ? `/api/uploads/${bill.image_path.replace(/\\/g, '/').split('/').pop()}` : '';

  return (
    <div className="flex flex-col lg:flex-row h-full bg-white border rounded-lg shadow-sm overflow-hidden relative">
      <div className="lg:w-1/2 bg-gray-900 flex items-center justify-center p-4 relative h-64 lg:h-auto overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="Bill" className="max-h-full max-w-full object-contain" />
        ) : (
          <div className="text-gray-500 flex flex-col items-center">
            <ImageIcon className="h-12 w-12 mb-2" />
            <p>No image available</p>
          </div>
        )}
        <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 z-10">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="lg:w-1/2 flex flex-col h-full bg-white">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 z-10">
          <h2 className="text-lg font-semibold text-gray-900">Edit Bill Details</h2>
          <div className="flex space-x-2">
            {bill.status === 'failed' && (
              <button onClick={handleRetry} disabled={retryProcessing} className="flex items-center px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium">
                <RefreshCcw className={`w-4 h-4 mr-1 ${retryProcessing ? 'animate-spin' : ''}`} /> Retry Extract
              </button>
            )}
            <button onClick={handleDelete} className="flex items-center px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium">
              <Trash2 className="w-4 h-4 mr-1" /> Delete
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              <Save className="w-4 h-4 mr-1" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                value={bill.status}
                onChange={e => setData(p => ({ ...p, bill: { ...p.bill, status: e.target.value } }))}
              >
                <option value="OK">OK</option>
                <option value="needs_review">Needs Review</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={bill.bill_date || ''} onChange={e => setData(p => ({ ...p, bill: { ...p.bill, bill_date: e.target.value } }))} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Merchant Name (Top)</label>
              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={bill.merchant_name || ''} onChange={e => setData(p => ({ ...p, bill: { ...p.bill, merchant_name: e.target.value } }))} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={bill.buyer_name || ''} onChange={e => setData(p => ({ ...p, bill: { ...p.bill, buyer_name: e.target.value } }))} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Broker Name</label>
              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={bill.broker_name || ''} onChange={e => setData(p => ({ ...p, bill: { ...p.bill, broker_name: e.target.value } }))} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
              <input type="number" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={bill.total_amount || ''} onChange={e => setData(p => ({ ...p, bill: { ...p.bill, total_amount: parseFloat(e.target.value) || null } }))} 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Weight</label>
              <input type="text" className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                value={bill.total_weight || ''} onChange={e => setData(p => ({ ...p, bill: { ...p.bill, total_weight: e.target.value } }))} 
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-medium text-gray-900">Line Items</h3>
              <button 
                onClick={() => setData(p => ({ ...p, items: [...p.items, { product_name: '', bags: '', weight: '', unit_price: 0, line_price: 0, location: '' }] }))}
                className="text-xs text-blue-600 font-medium hover:underline"
              >
                + Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-lg border flex flex-col gap-2 relative">
                  <button 
                    onClick={() => setData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
                    className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <input placeholder="Product Name" className="w-full border rounded px-2 py-1 text-sm bg-white" 
                    value={item.product_name || ''} onChange={e => {
                      const newItems = [...items]; newItems[idx].product_name = e.target.value; setData(p => ({ ...p, items: newItems }));
                    }} 
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Bags" className="border rounded px-2 py-1 text-sm bg-white" 
                      value={item.bags || ''} onChange={e => {
                        const newItems = [...items]; newItems[idx].bags = e.target.value; setData(p => ({ ...p, items: newItems }));
                      }} 
                    />
                    <input placeholder="Weight" className="border rounded px-2 py-1 text-sm bg-white" 
                      value={item.weight || ''} onChange={e => {
                        const newItems = [...items]; newItems[idx].weight = e.target.value; setData(p => ({ ...p, items: newItems }));
                      }} 
                    />
                    <input placeholder="Unit Price" type="number" className="border rounded px-2 py-1 text-sm bg-white" 
                      value={item.unit_price || ''} onChange={e => {
                        const newItems = [...items]; newItems[idx].unit_price = parseFloat(e.target.value) || null; setData(p => ({ ...p, items: newItems }));
                      }} 
                    />
                    <input placeholder="Line Price" type="number" className="border rounded px-2 py-1 text-sm bg-white" 
                      value={item.line_price || ''} onChange={e => {
                        const newItems = [...items]; newItems[idx].line_price = parseFloat(e.target.value) || null; setData(p => ({ ...p, items: newItems }));
                      }} 
                    />
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-sm text-gray-500 italic">No items extracted.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
