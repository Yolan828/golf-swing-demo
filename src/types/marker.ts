export type SwingPhase = 
  | 'Address' 
  | 'TakeAway' 
  | 'Top' 
  | 'Downswing' 
  | 'Impact' 
  | 'FollowThrough';

export const SWING_PHASES: { key: SwingPhase; label: string; shortLabel: string; color: string }[] = [
  { key: 'Address', label: '1. Address (準備站姿)', shortLabel: 'Address', color: 'var(--phase-address)' },
  { key: 'TakeAway', label: '2. Take Away (起桿)', shortLabel: 'Take Away', color: 'var(--phase-takeaway)' },
  { key: 'Top', label: '3. Top (上桿頂點)', shortLabel: 'Top', color: 'var(--phase-top)' },
  { key: 'Downswing', label: '4. Downswing (下桿)', shortLabel: 'Downswing', color: 'var(--phase-downswing)' },
  { key: 'Impact', label: '5. Impact (擊球瞬間)', shortLabel: 'Impact', color: 'var(--phase-impact)' },
  { key: 'FollowThrough', label: '6. Follow Through (送桿收桿)', shortLabel: 'Follow', color: 'var(--phase-follow)' },
];

export interface SwingMarker {
  id: string;
  videoId: string;        // ID of user video or pro video
  phase: SwingPhase;
  timestamp: number;      // Seconds (e.g. 2.435)
  createdAt: number;
}
