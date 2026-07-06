import React, { useEffect, useState } from "react";
import { Booking, Room, Guest, Invoice } from "../types";
import { Calendar, User, Key, Check, LogOut, Plus, IndianRupee, Printer, Clock, FileText, ShoppingBag, ShieldAlert, Download } from "lucide-react";
import { z } from "zod";
import { jsPDF } from "jspdf";

const bookingSchema = z.object({
  guestId: z.string().min(1, "Please select a guest"),
  roomId: z.string().min(1, "Please select a room"),
  checkInDate: z.string().min(1, "Check-in date is required"),
  checkOutDate: z.string().min(1, "Check-out date is required"),
  totalGuests: z.number().min(1, "Must have at least 1 guest"),
  specialRequests: z.string().optional(),
}).refine((data) => {
  const inDate = new Date(data.checkInDate);
  const outDate = new Date(data.checkOutDate);
  return outDate > inDate;
}, {
  message: "Check-out date must be after check-in date",
  path: ["checkOutDate"],
});

export default function Bookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");

  // New Booking states
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [totalGuests, setTotalGuests] = useState(1);
  const [specialRequests, setSpecialRequests] = useState("");

  // Checkout states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutBooking, setCheckoutBooking] = useState<any | null>(null);
  const [additionalCharges, setAdditionalCharges] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [checkoutPreCalculation, setCheckoutPreCalculation] = useState<any | null>(null);

  // Invoice display modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [finalInvoice, setFinalInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [bookingsRes, roomsRes, guestsRes] = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/rooms"),
        fetch("/api/guests"),
      ]);

      if (bookingsRes.ok && roomsRes.ok && guestsRes.ok) {
        setBookings(await bookingsRes.json());
        setRooms(await roomsRes.json());
        setGuests(await guestsRes.json());
      } else {
        setError("Failed to load reservation registry");
      }
    } catch (err) {
      setError("Network error loading bookings");
    } finally {
      setLoading(false);
    }
  };

  // Open the create booking form
  const handleOpenBookModal = () => {
    setError(null);
    setSuccess(null);
    setSelectedGuestId(guests[0]?.id || "");
    setSelectedRoomId(rooms.find(r => r.status === "Available")?.id || "");
    
    // Set sensible default dates (today to tomorrow)
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000).toISOString().split("T")[0];
    setCheckInDate(today);
    setCheckOutDate(tomorrow);
    setTotalGuests(1);
    setSpecialRequests("");
    setIsBookModalOpen(true);
  };

  // Create booking submit
  const handleCreateBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const validation = bookingSchema.safeParse({
      guestId: selectedGuestId,
      roomId: selectedRoomId,
      checkInDate,
      checkOutDate,
      totalGuests: Number(totalGuests),
      specialRequests: specialRequests.trim(),
    });

    if (!validation.success) {
      const errorMsg = validation.error.issues.map(err => err.message).join(", ");
      setError(errorMsg);
      return;
    }

    const payload = validation.data;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess("Room successfully reserved!");
        fetchInitialData();
        setTimeout(() => {
          setIsBookModalOpen(false);
        }, 1200);
      } else {
        setError(data.error || "Overlapping booking or criteria mismatch.");
      }
    } catch (err) {
      setError("Connection failure to booking API");
    }
  };

  // Check in booking
  const handleCheckIn = async (bookingId: string) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/checkin`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Guest successfully checked-in!`);
        fetchInitialData();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error || "Failed to check-in");
      }
    } catch (err) {
      setError("Network error check-in action");
    }
  };

  // Open checkout modal & pre-calculate some parameters
  const handleOpenCheckoutModal = async (booking: any) => {
    setCheckoutBooking(booking);
    setAdditionalCharges(0);
    setDiscountAmount(0);

    // Dynamic pre-calculation helper for display
    const checkInMills = new Date(booking.checkInDate).getTime();
    const checkOutMills = new Date(booking.checkOutDate).getTime();
    const stayDurationDays = Math.max(
      1,
      Math.ceil((checkOutMills - checkInMills) / (1000 * 60 * 60 * 24))
    );

    const roomCharges = stayDurationDays * (booking.room?.price || 0);

    // Fetch orders to calculate dining
    try {
      const ordersRes = await fetch("/api/dining/orders");
      if (ordersRes.ok) {
        const orders = await ordersRes.json();
        const activeOrders = orders.filter((o: any) => o.bookingId === booking.id && o.status === "Served");
        const diningCharges = activeOrders.reduce((sum: number, ord: any) => sum + ord.totalAmount, 0);

        setCheckoutPreCalculation({
          stayDurationDays,
          roomCharges,
          diningCharges,
        });
      }
    } catch (err) {
      console.error(err);
    }

    setIsCheckoutModalOpen(true);
  };

  // Perform actual checkout POST
  const handleConfirmCheckout = async () => {
    if (!checkoutBooking) return;

    try {
      const res = await fetch(`/api/bookings/${checkoutBooking.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalCharges: Number(additionalCharges),
          discountAmount: Number(discountAmount),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsCheckoutModalOpen(false);
        setFinalInvoice(data.invoice);
        setIsInvoiceModalOpen(true);
        fetchInitialData();
      } else {
        alert(data.error || "Failed to process checkout");
      }
    } catch (err) {
      alert("Network error processing checkout");
    }
  };

  // Print invoice helper
  const handlePrintInvoice = () => {
    window.print();
  };

  const handleDownloadPDF = (inv: Invoice) => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const primaryColor = [15, 118, 110]; // #0f766e
    const darkColor = [30, 41, 59];     // #1e293b
    const lightColor = [100, 116, 139];  // #64748b

    doc.setFont("helvetica", "bold");
    
    // Header Banner Background
    doc.setFillColor(15, 118, 110);
    doc.rect(0, 0, 210, 40, "F");

    // Hotel Name (White text on teal header)
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("KODEMELON HOTEL", 15, 18);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Sector V, Salt Lake Bypass, Kolkata, West Bengal 700091", 15, 25);
    doc.text("GSTIN: 19AAACK3009M1ZX  |  Email: billing@kodemelon.com", 15, 30);

    // TAX INVOICE label on header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("TAX INVOICE", 150, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Invoice ID: ${inv.id}`, 150, 25);
    doc.text(`Date: ${new Date(inv.createdAt).toLocaleDateString()}`, 150, 30);

    // Reset text color to slate
    doc.setTextColor(30, 41, 59);

    // Bill To & Stay Specs Grid
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("BILLED TO:", 15, 55);
    
    doc.setFont("helvetica", "bold");
    doc.text(inv.guestName, 15, 62);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Hotel Guest Profile", 15, 67);
    doc.text("Kodemelon Customer Registry", 15, 71);

    // Specs
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.text("STAY SPECIFICATIONS:", 120, 55);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Room No: ${inv.roomNumber} (${inv.roomType})`, 120, 62);
    doc.text(`Daily Tariff: INR ${inv.roomRate.toLocaleString()}`, 120, 67);
    doc.text(`Stay Duration: ${inv.durationOfStay} Nights`, 120, 72);
    doc.text(`Schedule: ${inv.checkInDate} to ${inv.checkOutDate}`, 120, 77);

    // Draw Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(15, 87, 195, 87);

    // Table Header
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 95, 180, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("DESCRIPTION OF SERVICES", 18, 100);
    doc.text("DURATION / QTY", 100, 100);
    doc.text("UNIT RATE", 140, 100);
    doc.text("AMOUNT", 175, 100);

    // Table Content
    let y = 112;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Row 1: Room Tariff
    doc.text(`Room Accommodation Tariff - ${inv.roomType}`, 18, y);
    doc.text(`${inv.durationOfStay} Day(s)`, 100, y);
    doc.text(`INR ${inv.roomRate.toLocaleString()}`, 140, y);
    doc.text(`INR ${inv.roomCharges.toLocaleString()}`, 175, y);
    y += 10;

    // Row 2: Dining Charges
    if (inv.diningCharges > 0) {
      doc.text("Room Service Dining & Catering", 18, y);
      doc.text("-", 100, y);
      doc.text("-", 140, y);
      doc.text(`INR ${inv.diningCharges.toLocaleString()}`, 175, y);
      y += 10;
    }

    // Row 3: Additional Charges
    if (inv.additionalCharges > 0) {
      doc.text("Custom Additional Services (Laundry, Porter, etc.)", 18, y);
      doc.text("-", 100, y);
      doc.text("-", 140, y);
      doc.text(`INR ${inv.additionalCharges.toLocaleString()}`, 175, y);
      y += 10;
    }

    // Divider
    doc.line(15, y, 195, y);
    y += 10;

    // Calculations block
    const rightAlignX = 135;
    const valueAlignX = 175;
    
    doc.setFontSize(10);
    doc.text("Subtotal:", rightAlignX, y);
    doc.text(`INR ${(inv.roomCharges + inv.diningCharges + inv.additionalCharges).toLocaleString()}`, valueAlignX, y);
    y += 6;

    doc.text("GST Tax Rate:", rightAlignX, y);
    doc.text("18%", valueAlignX, y);
    y += 6;

    doc.text("GST Tax Amount:", rightAlignX, y);
    doc.text(`INR ${inv.taxAmount.toLocaleString()}`, valueAlignX, y);
    y += 8;

    // Grand Total Divider and Text
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 118, 110);
    doc.text("Grand Total Payable:", rightAlignX, y);
    doc.text(`INR ${inv.totalAmount.toLocaleString()}`, valueAlignX, y);

    // Footer greeting
    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for staying at Kodemelon Hotel!", 105, 265, { align: "center" });
    doc.text("Payment completed. No outstanding balances remain.", 105, 270, { align: "center" });
    doc.text("Please share feedback at support@kodemelon.com", 105, 274, { align: "center" });

    // Save PDF
    doc.save(`invoice_${inv.id}.pdf`);
  };

  // Pre-calculate subtotal, tax, and total inside checkout modal
  const getModalSubtotal = () => {
    if (!checkoutPreCalculation) return 0;
    const { roomCharges, diningCharges } = checkoutPreCalculation;
    return Math.max(0, roomCharges + diningCharges + Number(additionalCharges) - Number(discountAmount));
  };

  const getModalTax = () => {
    return Math.round(getModalSubtotal() * 0.18 * 100) / 100;
  };

  const getModalTotal = () => {
    return getModalSubtotal() + getModalTax();
  };

  const filteredBookings = bookings.filter((b) => {
    const guestName = b.guest?.name || "";
    const phone = b.guest?.phone || "";
    const roomNumber = b.room?.roomNumber || "";
    const matchesSearch = guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          phone.includes(searchQuery) ||
                          roomNumber.toLowerCase().includes(searchQuery.toLowerCase());
                          
    const matchesStatus = statusFilter === "All" || b.status === statusFilter;
    
    const matchesDate = !dateFilter || b.checkInDate === dateFilter || b.checkOutDate === dateFilter;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <div className="space-y-6 animate-fade-in" id="bookings-view">
      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">Booking Desk</h2>
          <p className="text-slate-500 text-sm">Register reservations, process check-ins, and manage final checkout billings</p>
        </div>
        <button
          onClick={handleOpenBookModal}
          id="new-booking-btn"
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white rounded-xl font-semibold text-sm shadow-sm hover:bg-teal-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Booking
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}
      {error && !isBookModalOpen && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {/* Filters and Search toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Search Bookings</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by guest name, phone, or room number..."
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
          />
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Date (In / Out)</label>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
          />
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase">Status Filter</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Confirmed">Confirmed</option>
            <option value="CheckedIn">Checked In</option>
            <option value="CheckedOut">Checked Out</option>
          </select>
        </div>
      </div>

      {/* Bookings Table/Card Layout */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No bookings match search filters</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the filters or register a new room reservation.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Guest</th>
                  <th className="px-6 py-4">Room Specs</th>
                  <th className="px-6 py-4">Stay Schedule</th>
                  <th className="px-6 py-4">Guests</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Guest Col */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 bg-teal-50 rounded-lg flex items-center justify-center font-bold text-xs text-teal-800">
                          {booking.guest?.name ? booking.guest.name[0].toUpperCase() : "G"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{booking.guest?.name || "Deleted Guest"}</p>
                          <p className="text-xs text-slate-400 font-medium">{booking.guest?.phone}</p>
                        </div>
                      </div>
                    </td>

                    {/* Room Col */}
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-700">Room {booking.room?.roomNumber || "N/A"}</p>
                        <p className="text-xs text-slate-400 font-medium">{booking.room?.type} · ₹{booking.room?.price}/night</p>
                      </div>
                    </td>

                    {/* Stay Dates */}
                    <td className="px-6 py-4">
                      <div className="text-slate-600 font-medium space-y-0.5">
                        <p className="text-xs flex items-center gap-1">
                          <span className="font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded text-[9px]">IN</span>
                          {booking.checkInDate}
                        </p>
                        <p className="text-xs flex items-center gap-1">
                          <span className="font-bold text-slate-600 bg-slate-100 px-1 py-0.5 rounded text-[9px]">OUT</span>
                          {booking.checkOutDate}
                        </p>
                      </div>
                    </td>

                    {/* Total Guests count */}
                    <td className="px-6 py-4 font-bold text-slate-700">
                      {booking.totalGuests} / {booking.room?.capacity || 2}
                    </td>

                    {/* Status badges */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                          booking.status === "CheckedIn"
                            ? "bg-teal-50 text-teal-700"
                            : booking.status === "Confirmed"
                            ? "bg-blue-50 text-blue-700"
                            : booking.status === "CheckedOut"
                            ? "bg-slate-100 text-slate-600"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {booking.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-right">
                      {booking.status === "Confirmed" && (
                        <button
                          onClick={() => handleCheckIn(booking.id)}
                          className="px-3.5 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-semibold text-xs transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Check-In
                        </button>
                      )}

                      {booking.status === "CheckedIn" && (
                        <button
                          onClick={() => handleOpenCheckoutModal(booking)}
                          className="px-3.5 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-semibold text-xs transition-colors flex items-center gap-1 ml-auto"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Check-Out & Invoice
                        </button>
                      )}

                      {booking.status === "CheckedOut" && (
                        <span className="text-xs font-semibold text-slate-400">Checkout Finalized</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Book Room Modal */}
      {isBookModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="bg-teal-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">New Room Reservation</h3>
              <button onClick={() => setIsBookModalOpen(false)} className="text-teal-200 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <form onSubmit={handleCreateBookingSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Guest Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Guest *</label>
                <select
                  value={selectedGuestId}
                  onChange={(e) => setSelectedGuestId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
                  required
                >
                  <option value="" disabled>-- Select Guest File --</option>
                  {guests.map((g) => (
                    <option key={g.id} value={g.id}>{g.name} ({g.phone})</option>
                  ))}
                </select>
                {guests.length === 0 && (
                  <p className="text-[10px] text-amber-600 font-medium mt-1">No registered guests found. Please register guests in the Guest Directory tab first.</p>
                )}
              </div>

              {/* Room Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Room *</label>
                <select
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 bg-white font-medium"
                  required
                >
                  <option value="" disabled>-- Choose Available Room --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id} disabled={r.status === "Maintenance"}>
                      Room {r.roomNumber} ({r.type} · Max {r.capacity} Pax · ₹{r.price}/N) {r.status === "Maintenance" ? " - Maintenance" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date ranges */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Check-In Date *</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => setCheckInDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Check-Out Date *</label>
                  <input
                    type="date"
                    value={checkOutDate}
                    onChange={(e) => setCheckOutDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                    required
                  />
                </div>
              </div>

              {/* Occupants count */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Total Occupants *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={totalGuests}
                  onChange={(e) => setTotalGuests(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                  required
                />
              </div>

              {/* Special Requests */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Special Requests / Notes</label>
                <textarea
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="e.g. Extra pillows, smoking room preference, early morning airport transit"
                  rows={2}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:outline-hidden focus:border-teal-500 font-medium"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBookModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Reserve Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Checkout Parameters & Billing Modal */}
      {isCheckoutModalOpen && checkoutBooking && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-up">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Check-Out Guest & Bill</h3>
                <p className="text-xs text-slate-400 mt-0.5">Guest: {checkoutBooking.guest?.name}</p>
              </div>
              <button onClick={() => setIsCheckoutModalOpen(false)} className="text-slate-400 hover:text-white text-xl font-bold">&times;</button>
            </div>

            <div className="p-6 space-y-6">
              {/* Calculations Summary Panel */}
              {checkoutPreCalculation && (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3.5 text-sm text-slate-600">
                  <div className="flex justify-between font-medium">
                    <span>Room Tariff ({checkoutPreCalculation.stayDurationDays} Day{checkoutPreCalculation.stayDurationDays > 1 ? "s" : ""})</span>
                    <span className="font-bold text-slate-800">₹{checkoutPreCalculation.roomCharges}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Room Service & Dining Charges</span>
                    <span className="font-bold text-slate-800">₹{checkoutPreCalculation.diningCharges}</span>
                  </div>

                  <div className="border-t border-dashed border-slate-200 my-2 pt-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Additional Charges (laundry, etc)</label>
                      <input
                        type="number"
                        min="0"
                        value={additionalCharges}
                        onChange={(e) => setAdditionalCharges(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Loyalty Discount (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-500 bg-white font-bold"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-200 pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>₹{getModalSubtotal().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>18% CGST + SGST</span>
                      <span>₹{getModalTax().toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-base font-extrabold text-slate-800 pt-1">
                      <span>Total Invoice Payable</span>
                      <span className="text-teal-600">₹{getModalTotal().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCheckout}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  Generate Invoice & Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Display (PRINTABLE!) Modal */}
      {isInvoiceModalOpen && finalInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scale-up my-8">
            
            {/* Header banner */}
            <div className="bg-teal-900 text-white px-6 py-4 flex items-center justify-between no-print">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Checkout Invoice Generated
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="flex items-center gap-1 bg-white hover:bg-teal-50 text-teal-950 font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
                <button
                  onClick={() => handleDownloadPDF(finalInvoice)}
                  className="flex items-center gap-1 bg-teal-600 hover:bg-teal-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="bg-teal-800 hover:bg-teal-700 font-bold text-white px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Invoice body */}
            <div className="p-8 space-y-6 print-card" id="invoice-bill-print">
              {/* Hotel branding header */}
              <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                <div>
                  <h1 className="text-2xl font-black text-teal-800 font-sans tracking-tight">KODEMELON HOTEL</h1>
                  <p className="text-xs text-slate-400 mt-1">Sector V, Salt Lake Bypass, Kolkata, West Bengal 700091</p>
                  <p className="text-xs text-slate-400">GSTIN: 19AAACK3009M1ZX</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">TAX INVOICE</h3>
                  <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">{finalInvoice.id}</p>
                  <p className="text-xs text-slate-400">{new Date(finalInvoice.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Guest & Room Grid */}
              <div className="grid grid-cols-2 gap-8 text-sm text-slate-600">
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Billed To:</p>
                  <p className="font-bold text-slate-800 text-base">{finalInvoice.guestName}</p>
                  <p className="text-xs mt-1">Room booked for guest profile.</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Stay Specifications:</p>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-800">Room No. {finalInvoice.roomNumber} ({finalInvoice.roomType})</p>
                    <p>Tariff: ₹{finalInvoice.roomRate} / Night</p>
                    <p>Schedule: {finalInvoice.checkInDate} to {finalInvoice.checkOutDate} ({finalInvoice.durationOfStay} Stay Days)</p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="pt-4">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2">
                      <th className="pb-3">Description of Services</th>
                      <th className="pb-3 text-center">Qty / Days</th>
                      <th className="pb-3 text-right">Unit Rate</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {/* Room tariff row */}
                    <tr>
                      <td className="py-3 font-medium text-slate-800">
                        Room Accommodation Tariff ({finalInvoice.roomType})
                      </td>
                      <td className="py-3 text-center text-slate-600">
                        {finalInvoice.durationOfStay} Days
                      </td>
                      <td className="py-3 text-right text-slate-600">
                        ₹{finalInvoice.roomRate}
                      </td>
                      <td className="py-3 text-right font-bold text-slate-800">
                        ₹{finalInvoice.roomCharges}
                      </td>
                    </tr>

                    {/* Dining services row */}
                    {finalInvoice.diningCharges > 0 && (
                      <tr>
                        <td className="py-3 font-medium text-slate-800">
                          Room Service Dining & Catering Orders
                        </td>
                        <td className="py-3 text-center text-slate-600">
                          -
                        </td>
                        <td className="py-3 text-right text-slate-600">
                          -
                        </td>
                        <td className="py-3 text-right font-bold text-slate-800">
                          ₹{finalInvoice.diningCharges}
                        </td>
                      </tr>
                    )}

                    {/* Additional charges row */}
                    {finalInvoice.additionalCharges > 0 && (
                      <tr>
                        <td className="py-3 font-medium text-slate-800">
                          Custom Additional Services (Laundry / Travel / Porter)
                        </td>
                        <td className="py-3 text-center text-slate-600">
                          -
                        </td>
                        <td className="py-3 text-right text-slate-600">
                          -
                        </td>
                        <td className="py-3 text-right font-bold text-slate-800">
                          ₹{finalInvoice.additionalCharges}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Invoice Calculations section */}
              <div className="flex flex-col items-end pt-4 border-t border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between w-64 text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800">₹{(finalInvoice.roomCharges + finalInvoice.diningCharges + finalInvoice.additionalCharges).toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-64 text-slate-500">
                  <span>GST Tax Rate:</span>
                  <span>18%</span>
                </div>
                <div className="flex justify-between w-64 text-slate-500">
                  <span>GST Tax Amount:</span>
                  <span className="font-bold text-slate-800">₹{finalInvoice.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-64 text-base font-extrabold text-teal-800 pt-2 border-t border-slate-100">
                  <span>Grand Total Payable:</span>
                  <span className="text-lg">₹{finalInvoice.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Thank you greeting footer */}
              <div className="border-t border-slate-100 pt-6 text-center text-slate-400 text-xs">
                <p className="font-semibold text-slate-500">Thank you for staying at Kodemelon Hotel!</p>
                <p className="mt-0.5">Please share feedback or reach out with billing questions at support@kodemelon.com</p>
              </div>

            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-2 border-t border-slate-100 no-print">
              <button
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
