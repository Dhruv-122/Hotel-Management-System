import React, { useEffect, useState } from "react";
import { Invoice } from "../types";
import { FileText, Printer, Search, IndianRupee, Calendar, ClipboardCheck, ArrowUpRight, Download } from "lucide-react";
import { jsPDF } from "jspdf";

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Invoice Modal
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/invoices");
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      } else {
        throw new Error("API unavailable");
      }
    } catch (err) {
      try {
        const fallbackRes = await fetch("/data/invoices.json");
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          setInvoices(data);
          setError("Unable to reach API backend; loaded offline invoice records.");
        } else {
          setError("Failed to fetch historical invoice records");
        }
      } catch (fallbackErr) {
        setError("Network error fetching invoices");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInvoice = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsModalOpen(true);
  };

  const handlePrint = () => {
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

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      inv.id.toLowerCase().includes(q) ||
      inv.guestName.toLowerCase().includes(q) ||
      inv.roomNumber.toLowerCase().includes(q)
    );
  });

  // Calculate cumulative stats
  const totalRevenueCollected = invoices.reduce((sum, current) => sum + current.totalAmount, 0);
  const totalTaxesPaid = invoices.reduce((sum, current) => sum + current.taxAmount, 0);
  const totalRoomBillings = invoices.reduce((sum, current) => sum + current.roomCharges, 0);
  const totalDiningBillings = invoices.reduce((sum, current) => sum + current.diningCharges, 0);

  return (
    <div className="space-y-6 animate-fade-in" id="invoices-view">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-800">Billing & Invoices</h2>
        <p className="text-slate-500 text-sm">Review settlement records, collected taxes, and print invoice statements</p>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="block text-[10px] text-slate-400 font-extrabold uppercase">Collected Revenue</span>
          <h3 className="text-xl font-bold text-slate-800 mt-1">₹{totalRevenueCollected.toLocaleString("en-IN")}</h3>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5 mt-1">
            <ArrowUpRight className="h-3 w-3" />
            100% Settled
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="block text-[10px] text-slate-400 font-extrabold uppercase">Taxes Collected (GST)</span>
          <h3 className="text-xl font-bold text-slate-800 mt-1">₹{totalTaxesPaid.toLocaleString("en-IN")}</h3>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">At 18% slab rate</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="block text-[10px] text-slate-400 font-extrabold uppercase">Room Billable Revenue</span>
          <h3 className="text-xl font-bold text-slate-800 mt-1">₹{totalRoomBillings.toLocaleString("en-IN")}</h3>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Tariff settlements</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <span className="block text-[10px] text-slate-400 font-extrabold uppercase">Dining Billable Revenue</span>
          <h3 className="text-xl font-bold text-slate-800 mt-1">₹{totalDiningBillings.toLocaleString("en-IN")}</h3>
          <span className="text-[10px] text-slate-400 font-semibold mt-1 block">Room service catering</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs flex items-center gap-3">
        <Search className="h-5 w-5 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settled accounts by invoice ID, guest name, or room number..."
          className="w-full text-sm border-none focus:outline-hidden font-medium text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Invoices List table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-500"></div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700">No invoices recorded</h3>
          <p className="text-xs text-slate-400 mt-1">Settled check-outs will populate this historical ledger.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Guest</th>
                  <th className="px-6 py-4">Room Settled</th>
                  <th className="px-6 py-4">Stay Duration</th>
                  <th className="px-6 py-4 text-right">Settled Total</th>
                  <th className="px-6 py-4 text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-800 text-xs">{inv.id}</td>
                    <td className="px-6 py-4 font-semibold text-slate-700">{inv.guestName}</td>
                    <td className="px-6 py-4 text-slate-600 font-mono">Room {inv.roomNumber} ({inv.roomType})</td>
                    <td className="px-6 py-4 text-slate-500 font-medium">{inv.durationOfStay} Day{inv.durationOfStay > 1 ? "s" : ""}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">₹{inv.totalAmount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleOpenInvoice(inv)}
                        className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Invoice Bill
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {isModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scale-up my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Historical Settled Receipt
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-950 font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print
                </button>
                <button
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 font-bold text-white px-3 py-1 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Printable Area */}
            <div className="p-8 space-y-6 print-card" id="invoice-bill-print">
              <div className="flex justify-between items-start border-b border-slate-100 pb-6">
                <div>
                  <h1 className="text-2xl font-black text-teal-800 font-sans tracking-tight">KODEMELON HOTEL</h1>
                  <p className="text-xs text-slate-400 mt-1">Sector V, Salt Lake Bypass, Kolkata, West Bengal 700091</p>
                  <p className="text-xs text-slate-400">GSTIN: 19AAACK3009M1ZX</p>
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">TAX INVOICE</h3>
                  <p className="text-sm font-extrabold text-slate-800 mt-1 font-mono">{selectedInvoice.id}</p>
                  <p className="text-xs text-slate-400">{new Date(selectedInvoice.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-sm text-slate-600">
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Billed To:</p>
                  <p className="font-bold text-slate-800 text-base">{selectedInvoice.guestName}</p>
                  <p className="text-xs mt-1">Settle payment upon checkout departure.</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mb-1.5">Stay Specifications:</p>
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-slate-800">Room No. {selectedInvoice.roomNumber} ({selectedInvoice.roomType})</p>
                    <p>Tariff Rate: ₹{selectedInvoice.roomRate} / Night</p>
                    <p>Schedule: {selectedInvoice.checkInDate} to {selectedInvoice.checkOutDate} ({selectedInvoice.durationOfStay} stay days)</p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider pb-2">
                      <th className="pb-3">Description of Services</th>
                      <th className="pb-3 text-center">Stay Duration</th>
                      <th className="pb-3 text-right">Unit Rate</th>
                      <th className="pb-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-3 font-medium text-slate-800">
                        Room Accommodation Tariff ({selectedInvoice.roomType})
                      </td>
                      <td className="py-3 text-center text-slate-600">
                        {selectedInvoice.durationOfStay} Days
                      </td>
                      <td className="py-3 text-right text-slate-600">
                        ₹{selectedInvoice.roomRate}
                      </td>
                      <td className="py-3 text-right font-bold text-slate-800">
                        ₹{selectedInvoice.roomCharges}
                      </td>
                    </tr>

                    {selectedInvoice.diningCharges > 0 && (
                      <tr>
                        <td className="py-3 font-medium text-slate-800">
                          Room Service Dining & Catering Settlements
                        </td>
                        <td className="py-3 text-center text-slate-600">-</td>
                        <td className="py-3 text-right text-slate-600">-</td>
                        <td className="py-3 text-right font-bold text-slate-800">
                          ₹{selectedInvoice.diningCharges}
                        </td>
                      </tr>
                    )}

                    {selectedInvoice.additionalCharges > 0 && (
                      <tr>
                        <td className="py-3 font-medium text-slate-800">
                          Custom Additional Services (Laundry / Travel / Porter)
                        </td>
                        <td className="py-3 text-center text-slate-600">-</td>
                        <td className="py-3 text-right text-slate-600">-</td>
                        <td className="py-3 text-right font-bold text-slate-800">
                          ₹{selectedInvoice.additionalCharges}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col items-end pt-4 border-t border-slate-200 space-y-2 text-sm">
                <div className="flex justify-between w-64 text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-bold text-slate-800">₹{(selectedInvoice.roomCharges + selectedInvoice.diningCharges + selectedInvoice.additionalCharges).toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-64 text-slate-500">
                  <span>GST Tax Rate:</span>
                  <span>18%</span>
                </div>
                <div className="flex justify-between w-64 text-slate-500">
                  <span>GST Tax Amount:</span>
                  <span className="font-bold text-slate-800">₹{selectedInvoice.taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between w-64 text-base font-extrabold text-teal-800 pt-2 border-t border-slate-100">
                  <span>Settled Amount Paid:</span>
                  <span className="text-lg">₹{selectedInvoice.totalAmount.toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-6 text-center text-slate-400 text-xs">
                <p className="font-semibold text-slate-500">Thank you for staying at Kodemelon Hotel!</p>
                <p className="mt-0.5">Payment settlement was completed. No pending balances remain.</p>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100 no-print">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
