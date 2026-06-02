import React from 'react';
import PaymentReminderPage from './PaymentReminderPage';
import { PaymentFloor } from '../types';

const PaymentReminderFirstFloorPage: React.FC = () => {
  return <PaymentReminderPage floor={PaymentFloor.FIRST_FLOOR} />;
};

export default PaymentReminderFirstFloorPage;
