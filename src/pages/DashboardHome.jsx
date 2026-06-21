import React from 'react';
import { useSelector } from 'react-redux';

export default function DashboardHome() {
  const { user } = useSelector((s) => s.auth);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-ink mb-2">
        Xush kelibsiz, {user?.name}!
      </h1>
      <p className="text-ink-secondary">
        CRM Line — mijozlar bilan ishlash tizimi.
      </p>
    </div>
  );
}
