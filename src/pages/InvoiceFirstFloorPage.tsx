import React from 'react';
import InvoicePage from './InvoicePage';
import { InvoiceFloor } from '../types';

const InvoiceFirstFloorPage: React.FC = () => {
  return <InvoicePage floor={InvoiceFloor.FIRST_FLOOR} />;
};

export default InvoiceFirstFloorPage;
