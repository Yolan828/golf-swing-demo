export interface Point2D {
  x: number; // Normalized 0.0 ~ 1.0
  y: number;
}

export interface PoseLandmarks {
  head?: Point2D;
  leftShoulder?: Point2D;
  rightShoulder?: Point2D;
  leftElbow?: Point2D;
  rightElbow?: Point2D;
  leftWrist?: Point2D;
  rightWrist?: Point2D;
  leftHip?: Point2D;
  rightHip?: Point2D;
  leftKnee?: Point2D;
  rightKnee?: Point2D;
  leftAnkle?: Point2D;
  rightAnkle?: Point2D;
}

export interface SwingPoseFrame {
  timestamp: number;
  landmarks: PoseLandmarks;
  metrics?: {
    shoulderRotationAngle?: number;
    hipRotationAngle?: number;
    headDriftX?: number;
    headDriftY?: number;
  };
}

export interface DrawingLine {
  id: string;
  color: string;
  points: Point2D[];
}
