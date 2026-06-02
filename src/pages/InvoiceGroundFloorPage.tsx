import React from 'react';
import InvoicePage from './InvoicePage';
import { InvoiceFloor } from '../types';

const InvoiceGroundFloorPage: React.FC = () => {
  return <InvoicePage floor={InvoiceFloor.GROUND_FLOOR} />;
};

export default InvoiceGroundFloorPage;
