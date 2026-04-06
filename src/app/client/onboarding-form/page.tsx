"use client";

import { useState, useRef, ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Building, Link, ScrollText } from "lucide-react";
import { toast } from "react-hot-toast";

type Step = "company" | "contact" | "social" | "agreement";

const steps: { id: Step; label: string; icon: ReactNode }[] = [
  { id: "company", label: "Company Details", icon: <Building className="w-4 h-4" /> },
  { id: "contact", label: "Primary Contact", icon: <User className="w-4 h-4" /> },
  { id: "social", label: "Social & Login", icon: <Link className="w-4 h-4" /> },
  { id: "agreement", label: "Agreement", icon: <ScrollText className="w-4 h-4" /> },
];

const inputClass =
  "w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm text-[#0F172A] bg-white placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent transition-all";

const labelClass = "block text-xs font-semibold text-[#64748B] mb-1.5 tracking-wide uppercase";

export default function ClientOnboardingForm() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("company");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Company
    legalName: "",
    registeredAddress: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    taxId: "",
    vatNumber: "",
    companyEmail: "",
    companyPhone: "",
    website: "",
    // SPOC
    spocName: "",
    spocEmail: "",
    spocPhone: "",
    spocTitle: "",
    // Social
    linkedinUrl: "",
    twitterHandle: "",
    facebookUrl: "",
    instagramHandle: "",
    loginEmail: "",
    loginPassword: "",
    // Agreement
    agreedToTerms: false,
    signature: "",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/client/profile");
        if (res.ok) {
          const data = await res.json();
          // Merge data into form state, but keep defaults for missing fields
          setForm((prev) => ({
            ...prev,
            ...data,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const set = (key: string, val: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const stepIndex = steps.findIndex((s) => s.id === currentStep);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === steps.length - 1;

  const handleNext = async () => {
    if (!isLast) {
      setCurrentStep(steps[stepIndex + 1].id);
    } else {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/client/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.message || "Failed to save profile");
        }

        toast.success("Profile saved successfully");
        router.push("/client/dashboard");
      } catch (err: any) {
        setError(err.message);
        console.error("Save error:", err);
      } finally {
        setSaving(false);
      }
    }
  };
  const handleBack = () => {
    if (!isFirst) setCurrentStep(steps[stepIndex - 1].id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#64748B] font-medium text-sm">Loading your profile...</p>
        </div>
      </div>
    );
  }



  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[#E2E8F0] min-h-screen flex flex-col py-8 px-5 fixed left-0 top-0 bottom-0 shadow-sm z-20">
        {/* Brand */}
        <div className="flex items-center gap-3 px-2 mb-6">
          <div className="w-9 h-9 bg-[#3B82F6] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <p className="text-white font-black text-xs tracking-tighter">VUI</p>
          </div>
          <span className="text-[#0F172A] font-bold text-base tracking-tight">VUI Dashboard</span>
        </div>

        <nav className="space-y-1">
          {steps.map((step, i) => {
            const active = step.id === currentStep;
            return (
              <button
                key={step.id}
                onClick={() => i <= stepIndex && setCurrentStep(step.id)}
                disabled={i > stepIndex}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${active
                  ? "bg-[#EFF6FF] text-[#3B82F6]"
                  : i < stepIndex
                    ? "text-[#64748B] hover:bg-[#F8FAFC]"
                    : "text-[#CBD5E1] cursor-not-allowed"
                  }`}
              >
                <span className="text-lg opacity-80">{step.icon}</span>
                {step.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#F1F5F9] pt-6 px-3">
          <p className="text-[#94A3B8] text-[10px] font-semibold uppercase tracking-wider mb-2">Need help?</p>
          <p className="text-[#64748B] text-xs font-medium">support@vuilive.com</p>
          <div className="mt-4 p-3 bg-[#F8FAFC] rounded-lg border border-[#F1F5F9]">
            <p className="text-[10px] text-[#94A3B8] leading-tight">Your data is secured with end-to-end encryption.</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 flex-1 p-10 bg-[#F8FAFC] min-h-screen">
        {/* Horizontal Progress bar for mobile/compact view (hidden on desktop) */}

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#0F172A]">Welcome to VUI Onboarding</h1>
              <p className="text-[#64748B] text-sm mt-1">Please complete the following details to set up your account.</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="px-8 py-6 border-b border-[#F1F5F9] flex items-center justify-between bg-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#F8FAFC] rounded-2xl border border-[#F1F5F9] flex items-center justify-center text-2xl shadow-sm">
                  {steps[stepIndex].icon}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0F172A]">{steps[stepIndex].label}</h2>
                  <p className="text-xs text-[#64748B] font-medium">
                    {currentStep === "company" && "Legal company information and contact details"}
                    {currentStep === "contact" && "Single Point of Contact (SPOC) details"}
                    {currentStep === "social" && "Social media profiles and platform credentials"}
                    {currentStep === "agreement" && "Review and sign the client agreement"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">Step</p>
                <p className="text-sm font-bold text-[#3B82F6]">{stepIndex + 1} of {steps.length}</p>
              </div>
            </div>

            <div className="p-8">
              {/* STEP 1: Company Details */}
              {currentStep === "company" && (
                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Legal Company Name *</label>
                    <input className={inputClass} placeholder="Acme Corporation Ltd." value={form.legalName} onChange={e => set("legalName", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Registered Address *</label>
                    <input className={inputClass} placeholder="123 Business Park, Suite 400" value={form.registeredAddress} onChange={e => set("registeredAddress", e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>City</label>
                      <input className={inputClass} placeholder="New York" value={form.city} onChange={e => set("city", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>State / Province</label>
                      <input className={inputClass} placeholder="NY" value={form.state} onChange={e => set("state", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>Postal Code</label>
                      <input className={inputClass} placeholder="10001" value={form.postalCode} onChange={e => set("postalCode", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Country</label>
                      <div className="relative">
                        <select className={inputClass} value={form.country} onChange={e => set("country", e.target.value)}>
                          <option value="">Select country</option>
                          <option>United States</option>
                          <option>United Kingdom</option>
                          <option>India</option>
                          <option>Canada</option>
                          <option>Australia</option>
                          <option>Germany</option>
                          <option>Singapore</option>
                          <option>Other</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5 border-t border-[#F1F5F9] pt-6">
                    <div>
                      <label className={labelClass}>Tax Identification Number (TIN) *</label>
                      <input className={inputClass} placeholder="12-3456789" value={form.taxId} onChange={e => set("taxId", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>VAT / GST Number</label>
                      <input className={inputClass} placeholder="GB123456789" value={form.vatNumber} onChange={e => set("vatNumber", e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>Company Email</label>
                      <input type="email" className={inputClass} placeholder="info@company.com" value={form.companyEmail} onChange={e => set("companyEmail", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Company Phone</label>
                      <input className={inputClass} placeholder="+1 (212) 555-0100" value={form.companyPhone} onChange={e => set("companyPhone", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Company Website</label>
                    <input className={inputClass} placeholder="https://www.company.com" value={form.website} onChange={e => set("website", e.target.value)} />
                  </div>
                </div>
              )}

              {/* STEP 2: SPOC */}
              {currentStep === "contact" && (
                <div className="space-y-6">
                  <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl px-5 py-4 flex gap-4">
                    <span className="text-xl">ℹ️</span>
                    <p className="text-sm text-[#3B82F6] font-medium leading-relaxed">
                      Please provide details of the <strong>Single Point of Contact (SPOC)</strong> — the main person we will coordinate with for this project.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className={labelClass}>Full Name *</label>
                      <input className={inputClass} placeholder="Jane Smith" value={form.spocName} onChange={e => set("spocName", e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Job Title *</label>
                      <input className={inputClass} placeholder="Project Manager" value={form.spocTitle} onChange={e => set("spocTitle", e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Work Email *</label>
                    <input type="email" className={inputClass} placeholder="jane.smith@company.com" value={form.spocEmail} onChange={e => set("spocEmail", e.target.value)} />
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number *</label>
                    <input className={inputClass} placeholder="+1 (555) 234-5678" value={form.spocPhone} onChange={e => set("spocPhone", e.target.value)} />
                  </div>

                  {/* Preview card */}
                  {(form.spocName || form.spocEmail) && (
                    <div className="mt-8 p-6 bg-white border border-[#E2E8F0] shadow-sm rounded-2xl">
                      <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4">Contact Preview</p>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#3B82F6] font-bold text-lg shadow-sm">
                          {form.spocName ? form.spocName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
                        </div>
                        <div>
                          <p className="font-bold text-[#0F172A] text-base">{form.spocName || "Not Set"}</p>
                          <p className="text-xs text-[#64748B] font-medium">{form.spocTitle || "Title"} · {form.spocEmail || "Email Address"}</p>
                        </div>
                        <div className="ml-auto flex flex-col items-end gap-1">
                          <span className="px-3 py-1 rounded-full bg-[#DCFCE7] text-[#16A34A] text-[10px] font-bold border border-[#BBF7D0] uppercase tracking-tight">Active SPOC</span>
                          <span className="text-[10px] text-[#94A3B8] font-medium italic">Verified identification</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Social & Login */}
              {currentStep === "social" && (
                <div className="space-y-7">
                  <div>
                    <p className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-4 flex items-center gap-2">
                      Social Media Profiles
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { key: "linkedinUrl", label: "LinkedIn", placeholder: "linkedin.com/company/acme", icon: "in" },
                        { key: "twitterHandle", label: "X / Twitter", placeholder: "@acmecorp", icon: "𝕏" },
                        { key: "facebookUrl", label: "Facebook", placeholder: "fb.com/acmecorp", icon: "f" },
                        { key: "instagramHandle", label: "Instagram", placeholder: "@acmecorp", icon: "📷" },
                      ].map(({ key, label, placeholder, icon }) => (
                        <div key={key} className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#F1F5F9]">
                          <div className="w-10 h-10 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-sm font-black text-[#64748B] flex-shrink-0 shadow-sm">
                            {icon}
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-0.5">{label}</label>
                            <input
                              className="w-full bg-transparent text-sm text-[#0F172A] placeholder:text-[#CBD5E1] focus:outline-none transition-all"
                              placeholder={placeholder}
                              value={(form as any)[key]}
                              onChange={e => set(key, e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-[#F1F5F9] pt-8">
                    <p className="text-xs font-bold text-[#0F172A] uppercase tracking-widest mb-4 flex items-center gap-2">
                      Portal Security
                    </p>
                    <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl px-5 py-4 flex gap-4 mb-6 shadow-sm">
                      <span className="text-xl">🛡️</span>
                      <p className="text-xs text-[#B45309] font-medium leading-relaxed">
                        Setting up your initial dashboard credentials. These will be required for your first login. You will be prompted to change your password immediately.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <div>
                        <label className={labelClass}>Login Email / Username</label>
                        <input type="email" className={inputClass} placeholder="admin@company.com" value={form.loginEmail} onChange={e => set("loginEmail", e.target.value)} />
                      </div>
                      <div>
                        <label className={labelClass}>Temporary Password</label>
                        <input type="password" className={inputClass} placeholder="••••••••••" value={form.loginPassword} onChange={e => set("loginPassword", e.target.value)} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Agreement */}
              {currentStep === "agreement" && (
                <div className="space-y-7">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl p-6 max-h-64 overflow-y-auto text-sm text-[#475569] leading-relaxed space-y-4 shadow-inner">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4 mb-2">
                      <h3 className="font-bold text-[#0F172A] text-lg">Terms of Service</h3>
                      <span className="text-[10px] font-bold text-[#94A3B8] uppercase border border-[#E2E8F0] px-2 py-1 rounded-md">Version 2024.1</span>
                    </div>
                    <p>This Client Service Agreement ("Agreement") is entered into as of the date of submission between VUI Dashboard ("Service Provider") and the client identified in this form ("Client").</p>
                    <p><strong>1. Services.</strong> Service Provider agrees to provide dashboard, analytics, and related services as outlined in the project scope document. All deliverables will be specified in separate Statements of Work.</p>
                    <p><strong>2. Payment Terms.</strong> Client agrees to pay all invoices within 30 days of receipt. Late payments are subject to a 1.5% monthly interest charge.</p>
                    <p><strong>3. Confidentiality.</strong> Both parties agree to keep all proprietary information confidential during and after the term of this Agreement.</p>
                    <p><strong>4. Intellectual Property.</strong> All work product created under this Agreement shall remain the property of Service Provider until full payment is received.</p>
                    <p><strong>5. Termination.</strong> Either party may terminate this Agreement with 30 days written notice. Outstanding payments become immediately due upon termination.</p>
                    <p><strong>6. Governing Law.</strong> This Agreement shall be governed by applicable law. Any disputes shall be resolved through binding arbitration.</p>
                  </div>

                  <div className="border-t border-[#F1F5F9] pt-7">
                    <label className={labelClass}>Upload Signed Document</label>
                    <div
                      className="group border-2 border-dashed border-[#E2E8F0] rounded-2xl p-8 text-center cursor-pointer hover:border-[#3B82F6] hover:bg-[#EFF6FF] transition-all bg-[#F8FAFC]/50"
                      onClick={() => fileRef.current?.click()}
                    >
                      <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="hidden"
                        onChange={e => setFileName(e.target.files?.[0]?.name || null)}
                      />
                      {fileName ? (
                        <div className="flex flex-col items-center gap-2 text-[#3B82F6]">
                          <span className="text-3xl">📄</span>
                          <span className="text-sm font-bold tracking-tight">{fileName}</span>
                          <span className="text-[10px] text-[#94A3B8] font-bold uppercase cursor-pointer hover:text-red-500 transition-colors" onClick={(e) => { e.stopPropagation(); setFileName(null); }}>Remove file</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-md border border-[#E2E8F0] group-hover:scale-110 transition-transform">
                            <span className="text-xl">📁</span>
                          </div>
                          <p className="text-sm text-[#0F172A] font-bold">Select document to upload</p>
                          <p className="text-xs text-[#64748B] mt-1 font-medium">PDF, Word, or Scanned Document (Max 10MB)</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={labelClass}>Digital Signature (Full legal Name)</label>
                      <input
                        className={`${inputClass} italic font-serif text-lg tracking-wide`}
                        placeholder="Type your full name as signature"
                        value={form.signature}
                        onChange={e => set("signature", e.target.value)}
                      />
                    </div>

                    <label className="flex items-start gap-4 cursor-pointer group bg-[#F8FAFC] p-4 rounded-xl border border-[#F1F5F9] hover:bg-white hover:border-[#BFDBFE] transition-all">
                      <input
                        type="checkbox"
                        checked={form.agreedToTerms}
                        onChange={e => set("agreedToTerms", e.target.checked)}
                        className="mt-1 w-5 h-5 rounded border-[#E2E8F0] text-[#3B82F6] focus:ring-[#3B82F6] cursor-pointer"
                      />
                      <span className="text-sm text-[#64748B] font-medium leading-relaxed group-hover:text-[#0F172A] transition-colors">
                        I confirm that I have read, understood, and agree to the{" "}
                        <span className="text-[#3B82F6] font-bold hover:underline">Client Service Agreement</span> and{" "}
                        <span className="text-[#3B82F6] font-bold hover:underline">Privacy Policy</span>. This digital signature is legally binding.
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-8 py-6 border-t border-[#F1F5F9] flex items-center justify-between bg-[#F8FAFC]/50">
              <button
                onClick={handleBack}
                disabled={isFirst}
                className="px-6 py-2.5 text-sm font-bold text-[#64748B] bg-white border border-[#E2E8F0] rounded-xl hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-all shadow-sm active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ← Previous Step
              </button>

              <div className="hidden sm:flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === stepIndex ? "w-6 bg-[#3B82F6]" : i < stepIndex ? "bg-[#3B82F6]/40" : "bg-[#E2E8F0]"}`} />
                ))}
              </div>

              <button
                onClick={handleNext}
                disabled={saving || (isLast && (!form.agreedToTerms || !form.signature))}
                className="px-8 py-2.5 text-sm font-bold text-white bg-[#0F172A] hover:bg-black rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:shadow-none flex items-center gap-2 group"
              >
                {saving ? "Saving..." : (isLast ? "Complete Setup ✓" : "Continue")}
                {!isLast && !saving && <span className="group-hover:translate-x-1 transition-transform">→</span>}
              </button>
            </div>
          </div>

          {/* <div className="flex items-center justify-center gap-6 pt-4">
            <div className="flex items-center gap-2 grayscale opacity-50">
              <div className="w-5 h-5 bg-[#0F172A] rounded-full flex items-center justify-center text-[8px] text-white font-bold">256</div>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-tighter">AES Encrypted</span>
            </div>
            <div className="flex items-center gap-2 grayscale opacity-50">
              <span className="text-sm">🛡️</span>
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest">ISO 27001 Certified</span>
            </div>
          </div> */}
        </div>
      </main>
    </div>
  );
}
