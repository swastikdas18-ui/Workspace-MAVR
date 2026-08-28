import React, { useState } from 'react';
import { 
  Building2, Users, Globe, Mail, Phone, Wrench, AlertTriangle, 
  Sparkles, Award, ArrowRight, CheckCircle2, Shield, Layers,
  Check, ChevronRight
} from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { api } from '../../lib/api';

interface FoundingPartnerFormProps {
  onSuccess?: () => void;
}

export const FoundingPartnerForm: React.FC<FoundingPartnerFormProps> = ({ onSuccess }) => {
  const { addToast } = useWorkspace();

  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('Agency');
  const [website, setWebsite] = useState('');
  const [teamSize, setTeamSize] = useState('5-15');
  const [location, setLocation] = useState('');

  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [currentTools, setCurrentTools] = useState('');
  const [biggestChallenge, setBiggestChallenge] = useState('');
  const [whyInterested, setWhyInterested] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [slotsStatus, setSlotsStatus] = useState<string>('2 / 3 Filled (1 Slot Remaining)');
  const [isProgramFull, setIsProgramFull] = useState(false);

  React.useEffect(() => {
    api.getFoundingPartnerMetrics()
      .then((data) => {
        if (data?.metrics) {
          setSlotsStatus(data.metrics.slotsStatus);
          setIsProgramFull(data.metrics.isProgramFull);
        }
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const data = await api.applyFoundingPartner({
        businessName,
        industry,
        website,
        teamSize,
        location,
        ownerName,
        email,
        phone,
        currentTools,
        biggestChallenge,
        whyInterested,
      });

      setIsSubmitted(true);
      addToast({
        type: 'success',
        title: 'Application Submitted!',
        message: data?.message || 'Our founder team will review your application within 24 hours.',
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Submission Failed',
        message: err.message || 'Please check your inputs and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-emerald-500/40 text-center space-y-4 max-w-xl mx-auto shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-bold text-white">Application Received!</h3>
        <p className="text-sm text-slate-300 leading-relaxed">
          Thank you for applying to the <strong>Workspace OS Founding Partner Program</strong>. 
          We have created your priority discovery record in our CRM pipeline.
        </p>
        <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400 text-left space-y-1.5">
          <div className="font-semibold text-slate-200">What Happens Next:</div>
          <div>1. Review of your business workflow requirements (within 24 hrs)</div>
          <div>2. Direct 20-minute onboarding & architecture discovery call with the founding team</div>
          <div>3. 12-Month Business Pro Plan activation with white-glove setup</div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-slate-900/90 border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl backdrop-blur-xl">
      <div className="border-b border-slate-800 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Only 3 MSME Organizations Selected</span>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-amber-300 font-bold">
            {slotsStatus}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white">Apply For Founding Partner Program</h3>
        <p className="text-xs text-slate-400 mt-1">Get 12 Months of Workspace OS Business Pro (₹17,988 Value) 100% Free.</p>
      </div>

      {isProgramFull && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Notice: All 3 Founding Partner Program slots are currently filled. New applications are placed on the waitlist.</span>
        </div>
      )}

      {/* Part 1: Business Information */}
      <div className="space-y-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5" />
          <span>1. Business Information</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Business / Company Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Digital Solutions"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Industry / Domain *</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white outline-none"
            >
              <option value="Agency">Digital / Creative Agency</option>
              <option value="Software">Software / Tech Company</option>
              <option value="Consulting">Consulting & Advisory</option>
              <option value="Training">Training Institute / EdTech</option>
              <option value="Fitness">Fitness / Sports Academy</option>
              <option value="Services">Professional Services / Legal / CA</option>
              <option value="Other">Other MSME</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Website / Portfolio</label>
            <input
              type="text"
              placeholder="https://company.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Team Size *</label>
            <select
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white outline-none"
            >
              <option value="3-5">3 - 5 Members</option>
              <option value="5-15">5 - 15 Members (Recommended)</option>
              <option value="15-50">15 - 50 Members</option>
              <option value="50+">50+ Members</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">City / Location *</label>
          <input
            type="text"
            required
            placeholder="e.g. Bangalore, India"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none"
          />
        </div>
      </div>

      {/* Part 2: Owner Information */}
      <div className="space-y-4 pt-2 border-t border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5" />
          <span>2. Founder / Owner Information</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Your Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Swastik Das"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Work Email *</label>
            <input
              type="email"
              required
              placeholder="founder@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Phone / WhatsApp *</label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Part 3: Operational Information */}
      <div className="space-y-4 pt-2 border-t border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
          <Wrench className="w-3.5 h-3.5" />
          <span>3. Operational Workflow</span>
        </h4>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Current Tools Used</label>
          <input
            type="text"
            placeholder="e.g. WhatsApp, Google Sheets, Trello, Notion, HubSpot"
            value={currentTools}
            onChange={(e) => setCurrentTools(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Biggest Operational Challenge</label>
          <textarea
            rows={2}
            placeholder="e.g. Tasks get lost in WhatsApp chats, no visibility into sales pipeline, new employees take weeks to onboard."
            value={biggestChallenge}
            onChange={(e) => setBiggestChallenge(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Why Interested in Workspace OS?</label>
          <input
            type="text"
            placeholder="e.g. Want a single operating system to run our team and customer execution."
            value={whyInterested}
            onChange={(e) => setWhyInterested(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-xs text-white placeholder:text-slate-600 outline-none"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs shadow-xl shadow-blue-600/30 transition-all flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-50"
      >
        <span>{isSubmitting ? 'Submitting Application...' : 'Submit Founding Partner Application'}</span>
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </button>

      <div className="text-center text-[10px] text-slate-500">
        By applying, you agree to participate in one 20-min monthly feedback call during the 12-month free program.
      </div>
    </form>
  );
};
