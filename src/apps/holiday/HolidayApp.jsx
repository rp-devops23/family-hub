import { useState } from 'react';
import HolidayListPage from './HolidayListPage';
import HolidayPage from './HolidayPage';

export default function HolidayApp({ onHome }) {
  const [selectedTrip, setSelectedTrip] = useState(null);

  if (selectedTrip) {
    return (
      <HolidayPage
        trip={selectedTrip}
        onBack={() => setSelectedTrip(null)}
        onHome={onHome}
      />
    );
  }

  return <HolidayListPage onSelectTrip={setSelectedTrip} onHome={onHome} />;
}
