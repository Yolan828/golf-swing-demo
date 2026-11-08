import React, { Suspense } from 'react';
import { AnalysisClient } from './AnalysisClient';

export default function SingleAnalysisPage() {
  return (
    <Suspense fallback={null}>
      <AnalysisClient />
    </Suspense>
  );
}
