import { inMemoryDb } from '../../packages/database';

export interface GSTBreakdown {
  taxableValue: number;
  cgst: number;        // 9%
  sgst: number;        // 9%
  igst: number;        // 18% (for inter-state — same as cgst+sgst, choose one)
  totalTax: number;    // cgst + sgst = 18%
  total: number;       // taxableValue + totalTax
}

export interface GeneratedInvoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  // Company / Workspace billing info
  companyLegalName: string;
  companyGstin?: string | null;
  billingAddress?: string | null;
  // Client info
  clientName: string;
  clientEmail: string;
  // Line items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  // GST breakdown
  subtotal: number;         // pre-GST taxable value
  gst: GSTBreakdown;
  total: number;            // subtotal + totalTax
  // Meta
  currency: 'INR';
  taxRatePercent: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  paidAt?: Date | null;
  createdAt: Date;
}

/**
 * Calculate CGST + SGST breakdown (18% GST split)
 * For intra-state: CGST 9% + SGST 9%
 * For inter-state: IGST 18%
 */
function calculateGST(taxableValue: number, ratePercent = 18): GSTBreakdown {
  const totalRate = ratePercent / 100;
  const halfRate = totalRate / 2;
  const cgst = Math.round(taxableValue * halfRate);
  const sgst = Math.round(taxableValue * halfRate);
  const igst = Math.round(taxableValue * totalRate);
  const totalTax = cgst + sgst; // intra-state default
  return {
    taxableValue: Math.round(taxableValue),
    cgst,
    sgst,
    igst,
    totalTax,
    total: Math.round(taxableValue) + totalTax,
  };
}

export class InvoiceGeneratorService {
  /**
   * Generate GST-compliant invoice from billable time entries
   */
  public static async generateInvoiceFromTimeEntries(data: {
    workspaceId: string;
    clientName: string;
    companyName?: string;
    companyGstin?: string | null;
    billingAddress?: string | null;
    clientEmail: string;
    timeEntryIds: string[];
    taxRatePercent?: number;
  }): Promise<GeneratedInvoice> {
    const id = `inv-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
    const taxRate = data.taxRatePercent !== undefined ? data.taxRatePercent : 18;

    const items: GeneratedInvoice['items'] = [];
    let subtotal = 0;

    for (const entryId of data.timeEntryIds) {
      const entry = inMemoryDb.taskTimeEntries.get(entryId);
      if (entry && entry.billable) {
        const durationMin = entry.durationMinutes
          || (entry.endTime ? Math.round((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 60000) : 0);
        const hours = Math.round((durationMin / 60) * 10) / 10;
        const hourlyRate = entry.hourlyRate || 0;
        const amount = Math.round(hours * hourlyRate);
        items.push({
          description: entry.notes || entry.description || 'Professional Services Delivery',
          quantity: hours,
          unitPrice: hourlyRate,
          amount,
        });
        subtotal += amount;
      }
    }

    if (items.length === 0) {
      items.push({
        description: 'Monthly Retainer & Workspace Execution Services',
        quantity: 1,
        unitPrice: 50000,
        amount: 50000,
      });
      subtotal = 50000;
    }

    const gst = calculateGST(subtotal, taxRate);

    // Pull workspace billing profile if available
    const profile = (inMemoryDb as any).workspaceBillingProfiles?.get(data.workspaceId);

    const invoice: GeneratedInvoice = {
      id,
      workspaceId: data.workspaceId,
      invoiceNumber,
      companyLegalName: data.companyName || profile?.companyLegalName || 'Workspace OS Pvt Ltd',
      companyGstin: data.companyGstin || profile?.gstin || null,
      billingAddress: data.billingAddress || profile?.billingAddress || null,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      items,
      subtotal,
      gst,
      total: gst.total,
      currency: 'INR',
      taxRatePercent: taxRate,
      status: 'sent',
      dueDate: new Date(Date.now() + 15 * 86400000), // Net 15
      createdAt: new Date(),
    };

    inMemoryDb.invoices.set(id, invoice);
    return invoice;
  }

  /**
   * Generate a subscription billing invoice (for plan upgrades)
   */
  public static generateSubscriptionInvoice(data: {
    workspaceId: string;
    planName: string;
    baseAmount: number;     // pre-GST
    extraSeats?: number;
    extraSeatCost?: number;
    billingCycle: 'monthly' | 'yearly';
    companyLegalName?: string;
    gstin?: string | null;
    billingAddress?: string | null;
  }): GeneratedInvoice {
    const id = `inv-sub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const invoiceNumber = `INV-SUB-${Date.now().toString().slice(-6)}`;

    const items: GeneratedInvoice['items'] = [
      {
        description: `${data.planName} Plan — ${data.billingCycle === 'yearly' ? 'Annual' : 'Monthly'} Subscription`,
        quantity: 1,
        unitPrice: data.baseAmount,
        amount: data.baseAmount,
      },
    ];

    let subtotal = data.baseAmount;

    if (data.extraSeats && data.extraSeatCost && data.extraSeatCost > 0) {
      const seatLineTotal = data.extraSeatCost;
      items.push({
        description: `Additional Seats (${data.extraSeats} × ₹${Math.round(data.extraSeatCost / data.extraSeats)}/seat)`,
        quantity: data.extraSeats,
        unitPrice: Math.round(data.extraSeatCost / data.extraSeats),
        amount: seatLineTotal,
      });
      subtotal += seatLineTotal;
    }

    const gst = calculateGST(subtotal, 18);

    const invoice: GeneratedInvoice = {
      id,
      workspaceId: data.workspaceId,
      invoiceNumber,
      companyLegalName: data.companyLegalName || 'Workspace OS Pvt Ltd',
      companyGstin: data.gstin || null,
      billingAddress: data.billingAddress || null,
      clientName: data.companyLegalName || 'Customer',
      clientEmail: '',
      items,
      subtotal,
      gst,
      total: gst.total,
      currency: 'INR',
      taxRatePercent: 18,
      status: 'paid',
      dueDate: new Date(),
      paidAt: new Date(),
      createdAt: new Date(),
    };

    inMemoryDb.invoices.set(id, invoice);
    return invoice;
  }
}
