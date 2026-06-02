import React from 'react';
import PaymentReminderPage from './PaymentReminderPage';
import { PaymentFloor } from '../types';

const PaymentReminderGroundFloorPage: React.FC = () => {
  return <PaymentReminderPage floor={PaymentFloor.GROUND_FLOOR} />;
};

export default PaymentReminderGroundFloorPage;
