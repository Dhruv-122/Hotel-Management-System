import React, { useEffect, useState } from "react";
import { MenuItem, MenuCategory, DiningOrder, Booking } from "../types";
import { Plus, Trash2, Edit2, ShoppingCart, Loader2, Utensils, CheckCircle, Clock, ShoppingBag, XCircle, Search, Info } from "lucide-react";

export default function Dining() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activeBookings, setActiveBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Active view tab inside Dining: "Orders" or "MenuEditor"
  const [activeSubTab, setActiveSubTab] = useState<"orders" | "menu">("orders");

  // Place Order States
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState("");
  const [orderItems, setOrderItems] = useState<{ menuItemId: string; quantity: number }[]>([]);

  // Menu Editor Form States
  const [isMenuModalOpen, setIsMenuModalOpen] = useState(false);
  const [isEditingMenu, setIsEditingMenu] = useState(false);
  const [currentMenuItemId, setCurrentMenuItemId] = useState<string | null>(null);
  const [menuName, setMenuName] = useState("");
  const [menuCategory, setMenuCategory] = useState<MenuCategory>("Breakfast");
  const [menuPrice, setMenuPrice] = useState(100);
  const [menuDescription, setMenuDescription] = useState("");
  const [menuAvailable, setMenuAvailable] = useState(true);

  useEffect(() => {
    fetchDiningData();
  }, []);

  async function fetchWithFallback<T>(apiUrl: string, fallbackUrl: string) {
    const res = await fetch(apiUrl);
    if (res.ok) return res.json() as Promise<T>;
    const fallbackRes = await fetch(fallbackUrl);
    if (!fallbackRes.ok) throw new Error("Failed to load fallback data");
    return fallbackRes.json() as Promise<T>;
  }

  const fetchDiningData = async () => {
    try {
      setLoading(true);
      const [menuData, ordersData, bookingsData] = await Promise.all([
        fetchWithFallback<MenuItem[]>("/api/dining/menu", "/data/menu.json"),
        fetchWithFallback<any[]>("/api/dining/orders", "/data/orders.json"),
        fetchWithFallback<any[]>("/api/bookings", "/data/bookings.json"),
      ]);

      setMenu(menuData);
      setOrders(ordersData);
      const activeOnly = bookingsData.filter((b: any) => b.status === "CheckedIn");
      setActiveBookings(activeOnly);
    } catch (err) {
      setError("Unable to load dining details; using offline backup data.");
    } finally {
      setLoading(false);
    }
  };

  // Open place order modal
  const handleOpenOrderModal = () => {
    if (activeBookings.length === 0) {
      alert("No currently checked-in guests to place dining orders for!");
      return;
    }
    setError(null);
    setSuccess(null);
    setSelectedBookingId(activeBookings[0]?.id || "");
    setOrderItems([{ menuItemId: menu[0]?.id || "", quantity: 1 }]);
    setIsOrderModalOpen(true);
  };

  const handleAddOrderItemLine = () => {
    const nextAvailableItem = menu.find(item => item.isAvailable)?.id || "";
    setOrderItems([...orderItems, { menuItemId: nextAvailableItem, quantity: 1 }]);
  };

  const handleRemoveOrderItemLine = (index: number) => {
    const updated = orderItems.filter((_, idx) => idx !== index);
    setOrderItems(updated);
  };

  const handleOrderItemChange = (index: number, field: string, value: any) => {
    const updated = [...orderItems];
    if (field === "menuItemId") updated[index].menuItemId = value;
    if (field === "quantity") updated[index].quantity = Math.max(1, Number(value));
    setOrderItems(updated);
  };

  // Submit dynamic dining order
  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate if any duplicates or missing items exist
    const payloadItems = orderItems.filter(item => item.menuItemId);
    if (payloadItems.length === 0) {
      setError("Please add at least one item to the kitchen order list");
      return;
    }

    try {
      const res = await fetch("/api/dining/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBookingId,
          items: payloadItems,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Kitchen order successfully dispatched!");
        fetchDiningData();
        setTimeout(() => {
          setIsOrderModalOpen(false);
          setSuccess(null);
        }, 1200);
      } else {
        setError(data.error || "Order dispatch failure");
      }
    } catch (err) {
      setError("Network error placing order");
    }
  };

  // Toggle order status (e.g., Pending -> Served)
  const handleUpdateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/dining/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setSuccess("Order status successfully updated!");
        fetchDiningData();
        setTimeout(() => setSuccess(null), 2500);
      } else {
        setError("Failed to update kitchen order status");
      }
    } catch (err) {
      setError("Network error updating order");
    }
  };

  // Open menu modal
  const handleOpenMenuAddModal = () => {
    setIsEditingMenu(false);
    setCurrentMenuItemId(null);
    setMenuName("");
    setMenuCategory("Breakfast");
    setMenuPrice(100);
    setMenuDescription("");
    setMenuAvailable(true);
    setIsMenuModalOpen(true);
  };

  const handleOpenMenuEditModal = (item: MenuItem) => {
    setIsEditingMenu(true);
    setCurrentMenuItemId(item.id);
    setMenuName(item.name);
    setMenuCategory(item.category);
    setMenuPrice(item.price);
    setMenuDescription(item.description);
    setMenuAvailable(item.isAvailable);
    setIsMenuModalOpen(true);
  };

  // Save/Update Menu Item
  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: menuName.trim(),
      category: menuCategory,
      price: Number(menuPrice),
      description: menuDescription.trim(),
      isAvailable: menuAvailable,
    };

    try {
      let res;
      if (isEditingMenu && currentMenuItemId) {
        res = await fetch(`/api/dining/menu/${currentMenuItemId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/dining/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        setSuccess(isEditingMenu ? "Menu item saved" : "New menu item added");
        fetchDiningData();
        setTimeout(() => setIsMenuModalOpen(false), 1000);
      } else {
        const data = await res.json();
        setError(data.error || "Menu update failed");
      }
    } catch (err) {
      setError("Network error processing menu updates");
    }
  };

  // Delete menu item
  const handleDeleteMenuItem = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete ${name}?`)) return;

    try {
      const res = await fetch(`/api/dining/menu/${id}`, { method: "DELETE" });
      if (res.ok) {
        setSuccess(`Menu item ${name} deleted successfully`);
        fetchDiningData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(`Failed to delete menu item ${name}`);
      }
    } catch (err) {
      setError("Network error deleting item");
    }
  };

  // Helper to calculate pricing sum of current booking order modal in real-time
  const getOrderModalSubtotal = () => {
    return orderItems.reduce((sum, currentLine) => {
      const item = menu.find(m => m.id === currentLine.menuItemId);
      const price = item ? item.price : 0;
      return sum + (price * currentLine.quantity);
    }, 0);
  };

  return (
    <div className="space-y-6 animate-fade-in" id="dining-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Dining & Room Service</h2>
          <p className="text-slate-500 text-sm">Dispatched meals associated with checked-in occupancy cards</p>
        </div>
        
        {/* Sub-tab navigation */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab("orders")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === "orders" ? "bg-white text-teal-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Kitchen Orders
          </button>
          <button
            onClick={() => setActiveSubTab("menu")}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeSubTab === "menu" ? "bg-white text-teal-800 shadow-xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Food Menu Editor
          </button>
        </div>
      </div>

      {success && !isOrderModalOpen && !isMenuModalOpen && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      {/* ========================================================
          SUB-TAB: ACTIVE ROOM ORDERS
         ======================================================== */}
      {activeSubTab === "orders" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700 text-base">Active Orders</h3>
            <button
              onClick={handleOpenOrderModal}
              id="place-order-btn"
              className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <ShoppingCart className="h-4 w-4" />
              Place Dining Order
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-100">
              <ShoppingBag className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">No dining orders recorded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {orders.map((ord) => (
                <div key={ord.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between border-b border-slate-50 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-400 font-mono">{ord.id}</span>
                      <h4 className="font-bold text-slate-800 text-sm mt-1">Room {ord.roomNumber} ({ord.guestName})</h4>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      ord.status === "Served" ? "bg-emerald-50 text-emerald-700" :
                      ord.status === "Pending" ? "bg-amber-50 text-amber-700" :
                      "bg-rose-50 text-rose-700"
                    }`}>
                      {ord.status === "Pending" ? <Clock className="h-3 w-3" /> : ord.status === "Served" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {ord.status}
                    </span>
                  </div>

                  {/* Items list */}
                  <div className="space-y-2 py-2">
                    {ord.items.map((line: any, index: number) => (
                      <div key={index} className="flex justify-between text-xs text-slate-600 font-medium">
                        <span>{line.name} <strong className="text-slate-400">x{line.quantity}</strong></span>
                        <span className="font-mono text-slate-700">₹{line.price * line.quantity}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-50 pt-3 mt-3">
                    <span className="text-xs font-semibold text-slate-400">Order Placed: {new Date(ord.orderTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-bold text-slate-800 text-sm">Total: ₹{ord.totalAmount}</span>
                  </div>

                  {/* Operational status action buttons */}
                  {ord.status === "Pending" && (
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-50/50">
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, "Cancelled")}
                        className="px-2.5 py-1 text-[10px] font-extrabold text-rose-600 border border-rose-100 hover:bg-rose-50 rounded bg-white transition-colors uppercase tracking-wider"
                      >
                        Cancel Order
                      </button>
                      <button
                        onClick={() => handleUpdateOrderStatus(ord.id, "Served")}
                        className="px-2.5 py-1 text-[10px] font-extrabold text-white bg-teal-600 hover:bg-teal-700 rounded transition-colors uppercase tracking-wider"
                      >
                        Mark Served
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SUB-TAB: FOOD MENU MANAGER
         ======================================================== */}
      {activeSubTab === "menu" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-slate-700 text-base font-sans">Hotel Food & Beverage Menu</h3>
            <button
              onClick={handleOpenMenuAddModal}
              id="add-menu-item-btn"
              className="flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
            >
              <Plus className="h-4 w-4" />
              Add Menu Item
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
          ) : menu.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-slate-100">
              <Utensils className="h-10 w-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-500">Food menu catalog is empty.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menu.map((item) => (
                <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-extrabold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md uppercase tracking-wider">{item.category}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${item.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                        {item.isAvailable ? 'Available' : 'Sold Out'}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">{item.name}</h4>
                    <p className="text-slate-400 text-xs mt-1.5 leading-relaxed truncate-2-lines">{item.description || "No description provided."}</p>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-50 pt-4 mt-4">
                    <span className="font-black text-slate-800 text-sm">₹{item.price}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenMenuEditModal(item)} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-50 rounded" title="Edit Item"><Edit2 className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDeleteMenuItem(item.id, item.name)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded" title="Delete Item"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Place Dining Order Modal */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-up max-h-[85vh] flex flex-col">
            <div className="bg-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">Create Room Dining Order</h3>
              <button onClick={() => setIsOrderModalOpen(false)} className="text-teal-200 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handlePlaceOrderSubmit} className="overflow-y-auto flex-1 p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              {/* Selector for checkedIn booking card */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Occupied Booking *</label>
                <select
                  value={selectedBookingId}
                  onChange={(e) => setSelectedBookingId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
                  required
                >
                  {activeBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      Room {b.room?.roomNumber} - {b.guest?.name} ({b.guest?.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic lines */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Menu Items *</span>
                  <button
                    type="button"
                    onClick={handleAddOrderItemLine}
                    className="text-xs font-extrabold text-teal-600 hover:text-teal-700"
                  >
                    + Add Item Line
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {orderItems.map((line, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <select
                        value={line.menuItemId}
                        onChange={(e) => handleOrderItemChange(index, "menuItemId", e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white font-medium"
                        required
                      >
                        <option value="" disabled>-- Select Food Item --</option>
                        {menu.filter(m => m.isAvailable).map((item) => (
                          <option key={item.id} value={item.id}>{item.name} (₹{item.price})</option>
                        ))}
                      </select>
                      
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={line.quantity}
                        onChange={(e) => handleOrderItemChange(index, "quantity", e.target.value)}
                        className="w-16 px-2 py-1.5 text-xs border border-slate-200 rounded-lg text-center focus:outline-hidden focus:border-teal-500 font-bold"
                        required
                      />

                      <button
                        type="button"
                        onClick={() => handleRemoveOrderItemLine(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                        disabled={orderItems.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic summary total calculations */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estimated Service Total:</span>
                <span className="font-black text-slate-800 text-lg">₹{getOrderModalSubtotal()}</span>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors animate-fade-in"
                >
                  Dispatch to Kitchen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Menu Item Modal */}
      {isMenuModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{isEditingMenu ? "Modify Menu Item" : "Create F&B Menu Item"}</h3>
              <button onClick={() => setIsMenuModalOpen(false)} className="text-teal-200 hover:text-white transition-colors text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleMenuSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Item Name *</label>
                <input
                  type="text"
                  value={menuName}
                  onChange={(e) => setMenuName(e.target.value)}
                  placeholder="e.g. Garlic Toast, Fresh Orange Juice"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Category *</label>
                  <select
                    value={menuCategory}
                    onChange={(e) => setMenuCategory(e.target.value as MenuCategory)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Beverage">Beverage</option>
                    <option value="Dessert">Dessert</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    value={menuPrice}
                    onChange={(e) => setMenuPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Item Description</label>
                <textarea
                  value={menuDescription}
                  onChange={(e) => setMenuDescription(e.target.value)}
                  placeholder="e.g. Fragrant whole grains infused with custom slow spices"
                  rows={2}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="menuAvailable"
                  checked={menuAvailable}
                  onChange={(e) => setMenuAvailable(e.target.checked)}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                />
                <label htmlFor="menuAvailable" className="text-xs font-semibold text-slate-600 uppercase">Item is currently available</label>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsMenuModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
