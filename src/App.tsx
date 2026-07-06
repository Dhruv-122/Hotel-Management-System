import React, { useState } from "react";
import Dashboard from "./components/Dashboard";
import Rooms from "./components/Rooms";
import Guests from "./components/Guests";
import Bookings from "./components/Bookings";
import Dining from "./components/Dining";
import Invoices from "./components/Invoices";

import {
  LayoutDashboard,
  BedDouble,
  Users,
  CalendarCheck,
  Utensils,
  Receipt,
  Hotel,
  Menu,
  X,
  Sparkles
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Define tabs configuration
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "bookings", label: "Bookings Desk", icon: CalendarCheck },
    { id: "rooms", label: "Room Directory", icon: BedDouble },
    { id: "guests", label: "Guest Directory", icon: Users },
    { id: "dining", label: "Dining & F&B", icon: Utensils },
    { id: "invoices", label: "Billing & Invoices", icon: Receipt },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  const ActiveComponent = () => {
    switch (activeTab) {
      case "dashboard":
        return <Dashboard onNavigate={handleTabChange} />;
      case "rooms":
        return <Rooms />;
      case "guests":
        return <Guests />;
      case "bookings":
        return <Bookings />;
      case "dining":
        return <Dining />;
      case "invoices":
        return <Invoices />;
      default:
        return <Dashboard onNavigate={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row">
      {/* Sidebar - Desktop Layout (hidden in print) */}
      <aside className="no-print hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 shadow-lg border-r border-slate-800">
        {/* Branding header */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="p-2 bg-teal-600 rounded-xl">
            <Hotel className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-wide text-white uppercase font-sans">Hotel Management System</h1>
          </div>
        </div>

        {/* Sidebar Tabs Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`sidebar-tab-${tab.id}`}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-teal-600 text-white shadow-md shadow-teal-900/30"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Developer Credit footer */}
        <div className="p-4 border-t border-slate-800/50 bg-slate-950/20 text-center">
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-extrabold text-slate-500 uppercase tracking-widest">
            <Sparkles className="h-3 w-3 text-teal-500 animate-pulse" />
            MERN Assessment System
          </div>
        </div>
      </aside>

      {/* Mobile Top Navigation Header (hidden in print) */}
      <header className="no-print md:hidden bg-slate-900 text-white p-4 flex items-center justify-between shadow-md shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-teal-600 rounded-lg">
            <Hotel className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-sm tracking-wide uppercase">Hotel Management System</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Sidebar Navigation Drawer (hidden in print) */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <aside className="w-64 max-w-xs h-full bg-slate-900 text-white p-6 flex flex-col justify-between animate-slide-right" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                <div className="p-2 bg-teal-600 rounded-xl">
                  <Hotel className="h-5 w-5 text-white" />
                </div>
                <h1 className="font-extrabold text-sm tracking-wider uppercase">Hotel Management System</h1>
              </div>

              <nav className="space-y-1.5">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                        isActive
                          ? "bg-teal-600 text-white shadow-md shadow-teal-900/30"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="text-center text-[9px] font-bold text-slate-500 uppercase tracking-widest pt-4 border-t border-slate-800/50">
              Kodemelon Tech Assessment
            </div>
          </aside>
        </div>
      )}

      {/* Main App Container */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 p-4 md:p-8 overflow-y-auto print:p-0">
          <ActiveComponent />
        </div>
      </main>
    </div>
  );
}
