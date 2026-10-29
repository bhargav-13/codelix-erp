/** CRM sample module: leads moving through a sales pipeline. Browser-only data. */
import { collection } from './demoStore';
import { iso } from './hr';

export const STAGES = ['New enquiry', 'Quotation sent', 'Negotiation', 'Follow-up', 'Won', 'Lost'] as const;
export type Stage = (typeof STAGES)[number];

export interface Lead {
  id: number;
  name: string;
  company: string;
  phone: string;
  product: string;
  value: number;
  stage: Stage;
  owner: string;
  nextFollowUp?: string;
  lastContact: string;
  notes: string;
}

export const OWNERS = ['Anil Sharma', 'Priya Desai', 'Rahul Verma'];

const day = (offset: number) => { const d = new Date(); d.setDate(d.getDate() + offset); return iso(d); };

export const leads = collection<Lead>('crm.leads', () => [
  { id: 1, name: 'Rajesh Kumar', company: 'Bharat Auto Parts', phone: '98201 44312', product: 'Forged flanges', value: 420000, stage: 'Negotiation', owner: 'Anil Sharma', nextFollowUp: day(0), lastContact: day(-2), notes: 'Wants 5% off on 2 t monthly volume.' },
  { id: 2, name: 'Priya Mehta', company: 'Shree Industries', phone: '97334 21098', product: 'Brass castings', value: 185000, stage: 'Quotation sent', owner: 'Priya Desai', nextFollowUp: day(1), lastContact: day(0), notes: '' },
  { id: 3, name: 'Suresh Patil', company: 'Maharashtra Engineering Works', phone: '99880 56712', product: 'Electrical fittings', value: 260000, stage: 'New enquiry', owner: 'Anil Sharma', nextFollowUp: day(2), lastContact: day(-4), notes: 'Sent catalogue on WhatsApp.' },
  { id: 4, name: 'Amit Joshi', company: 'Tata Component Supplies', phone: '98765 43210', product: 'Forging + casting', value: 675000, stage: 'Won', owner: 'Rahul Verma', lastContact: day(-1), notes: 'PO received.' },
  { id: 5, name: 'Neha Singh', company: 'Precision Castings', phone: '93456 78901', product: 'Chrome-plated parts', value: 310000, stage: 'Follow-up', owner: 'Priya Desai', nextFollowUp: day(-1), lastContact: day(-7), notes: 'Waiting for sample approval.' },
  { id: 6, name: 'Vikram Reddy', company: 'Lakshmi Forgings', phone: '91234 56789', product: 'Forged parts', value: 540000, stage: 'Quotation sent', owner: 'Rahul Verma', nextFollowUp: day(3), lastContact: day(-3), notes: '' },
  { id: 7, name: 'Manish Gupta', company: 'Star Electricals', phone: '87654 32109', product: 'Brass terminals', value: 120000, stage: 'New enquiry', owner: 'Anil Sharma', nextFollowUp: day(1), lastContact: day(0), notes: '' },
  { id: 8, name: 'Sunita Rao', company: 'KNR Industries', phone: '96321 45678', product: 'Bulk forging order', value: 890000, stage: 'Negotiation', owner: 'Priya Desai', nextFollowUp: day(0), lastContact: day(-1), notes: 'Decision by month end.' },
  { id: 9, name: 'Dinesh Agarwal', company: 'Apex Metal Works', phone: '94501 23456', product: 'Machined inserts', value: 330000, stage: 'Won', owner: 'Rahul Verma', lastContact: day(-5), notes: '' },
  { id: 10, name: 'Kavita Nair', company: 'Southern Auto Components', phone: '98112 34567', product: 'Castings', value: 200000, stage: 'Lost', owner: 'Anil Sharma', lastContact: day(-14), notes: 'Went with a cheaper supplier.' },
]);
