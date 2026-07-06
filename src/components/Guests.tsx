import React, { useEffect, useState } from "react";
import { Guest } from "../types";
import { Plus, Search, User, Mail, Phone, ShieldCheck, History, Calendar, Award, Receipt } from "lucide-react";

export default function Guests() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form & Modals states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentGuestId, setCurrentGuestId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [idProof, setIdProof] = useState("");

  // Search/Filters
  const [searchQuery, setSearchQuery] = useState("");

  // History state
  const [selectedGuestName, setSelectedGuestName] = useState("");
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    fetchGuests();
  }, []);

  const fetchGuests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/guests");
      if (res.ok) {
        const data = await res.json();
        setGuests(data);
      } else {
        setError("Failed to fetch guest list");
      }
    } catch (err) {
      setError("Network error fetching guest details");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setCurrentGuestId(null);
    setName("");
    setEmail("");
    setPhone("");
    setIdProof("");
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (g: Guest) => {
    setIsEditing(true);
    setCurrentGuestId(g.id);
    setName(g.name);
    setEmail(g.email);
    setPhone(g.phone);
    setIdProof(g.idProof);
    setError(null);
    setSuccess(null);
    setIsModalOpen(true);
  };

  const handleOpenHistoryModal = async (g: Guest) => {
    setSelectedGuestName(g.name);
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    setHistoryList([]);
    try {
      const res = await fetch(`/api/guests/${g.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistoryList(data);
      }
    } catch (err) {
      console.error("Error loading guest history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim() || !email.trim() || !phone.trim() || !idProof.trim()) {
      setError("All fields are required");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      idProof: idProof.trim(),
    };

    try {
      let res;
      if (isEditing && currentGuestId) {
        res = await fetch(`/api/guests/${currentGuestId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/guests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok) {
        setSuccess(isEditing ? "Guest details updated" : "Guest profile created!");
        fetchGuests();
        setTimeout(() => setIsModalOpen(false), 1000);
      } else {
        setError(data.error || "An error occurred");
      }
    } catch (err) {
      setError("Network or server connection issue");
    }
  };

  const filteredGuests = guests.filter((g) => {
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.email.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      g.idProof.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in" id="guests-view">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Guest Directory</h2>
          <p className="text-slate-500 text-sm">Manage guest files, contact cards, and search booking history</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          id="add-guest-btn"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Register New Guest
        </button>
      </div>

      {success && !isModalOpen && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      {/* Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, email, phone, or identification ID..."
          className="w-full text-sm border-none focus:outline-hidden font-medium text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Guest Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      ) : filteredGuests.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <User className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No guests found</h3>
          <p className="text-xs text-slate-400 mt-1">Refine your search or create a new guest registry.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGuests.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header Icon + Name */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl font-bold font-mono text-sm">
                    {g.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 hover:text-teal-600 cursor-pointer text-base" onClick={() => handleOpenHistoryModal(g)}>
                      {g.name}
                    </h3>
                    <span className="text-[10px] text-teal-600 font-bold bg-teal-50 px-2 py-0.5 rounded-sm">ID: {g.id}</span>
                  </div>
                </div>

                {/* Info Lines */}
                <div className="space-y-2 text-sm text-slate-600 pt-1">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="truncate">{g.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{g.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-xs bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md text-slate-500 font-mono">
                      {g.idProof}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between border-t border-slate-50 mt-5 pt-4">
                <button
                  onClick={() => handleOpenHistoryModal(g)}
                  className="flex items-center gap-1.5 text-xs font-bold text-teal-600 hover:text-teal-700 hover:underline"
                >
                  <History className="h-3.5 w-3.5" />
                  View Booking History
                </button>
                <button
                  onClick={() => handleOpenEditModal(g)}
                  className="px-3 py-1.5 text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Guest Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="bg-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">{isEditing ? "Modify Guest Profile" : "Register New Guest"}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-teal-200 hover:text-white transition-colors text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-xs font-semibold">
                  {success}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  ID Proof (Aadhaar / Passport / DL) *
                </label>
                <input
                  type="text"
                  value={idProof}
                  onChange={(e) => setIdProof(e.target.value)}
                  placeholder="e.g. Aadhaar 1234-5678-9012"
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                  required
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  {isEditing ? "Save Changes" : "Register Guest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scale-up max-h-[85vh] flex flex-col">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Booking History</h3>
                <p className="text-xs text-slate-400 mt-0.5">Guest Name: <span className="text-white font-semibold">{selectedGuestName}</span></p>
              </div>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-white transition-colors text-2xl font-bold">&times;</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {loadingHistory ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  No historic stay records found for this guest profile.
                </div>
              ) : (
                <div className="space-y-4">
                  {historyList.map((hist) => (
                    <div key={hist.id} className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                        <div>
                          <span className="text-xs text-slate-400 font-bold uppercase">Room {hist.roomNumber}</span>
                          <h4 className="font-bold text-slate-800 text-sm">{hist.roomType} Room</h4>
                        </div>
                        <span className={`self-start sm:self-auto px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          hist.status === "CheckedIn" ? "bg-teal-50 text-teal-700" :
                          hist.status === "Confirmed" ? "bg-blue-50 text-blue-700" :
                          hist.status === "CheckedOut" ? "bg-slate-100 text-slate-600" :
                          "bg-rose-50 text-rose-700"
                        }`}>
                          {hist.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                        <div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Schedule Dates</p>
                          <p className="font-medium mt-0.5">{hist.checkInDate} to {hist.checkOutDate}</p>
                        </div>
                        {hist.actualCheckIn && (
                          <div>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">Actual Checked-In</p>
                            <p className="font-medium mt-0.5">{new Date(hist.actualCheckIn).toLocaleString()}</p>
                          </div>
                        )}
                      </div>

                      {hist.invoice && (
                        <div className="bg-teal-50/50 border border-teal-100 rounded-lg p-3 mt-4 flex items-center justify-between text-xs text-teal-950">
                          <div>
                            <span className="block text-[9px] text-teal-700 font-bold uppercase">Final Billing Invoice</span>
                            <span className="font-bold">Total Bill: ₹{hist.invoice.totalAmount}</span>
                          </div>
                          <span className="text-[10px] font-medium bg-white px-2 py-1 rounded-md border border-teal-100 flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            Paid
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
              <button onClick={() => setIsHistoryModalOpen(false)} className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl">
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
