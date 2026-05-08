import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { alertService } from '../../services/alertService';

export default function Layout() {
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    alertService.getCount()
      .then(setAlertCount)
      .catch(() => {});

    const interval = setInterval(() => {
      alertService.getCount().then(setAlertCount).catch(() => {});
    }, 60000); // rafraîchir toutes les minutes

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-layout">
      <Sidebar alertCount={alertCount} />
      <div className="main-content">
        <div className="page-body">
          <Outlet context={{ refreshAlerts: () => alertService.getCount().then(setAlertCount) }} />
        </div>
      </div>
    </div>
  );
}
