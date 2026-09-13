export type TransportVehicleStatus = 'Moving' | 'Arrived';

export type TransportPosition = {
  lat: number;
  lng: number;
  title: string;
  coordinateSource?: 'api' | 'facility' | 'fallback';
};

export type TransportVehicleRecord = {
  id: string;
  vehicleNo: string;
  driver: string;
  startPos: TransportPosition;
  destPos: TransportPosition;
  totalDistanceKm: number;
  baseDurationSec: number;
  startTime: number;
  status: TransportVehicleStatus;
  cargo: string;
  temp: string;
  dailyTripCount: number;
  isDistanceEstimated?: boolean;
  isDurationEstimated?: boolean;
};

export type TransportVehicle = TransportVehicleRecord & {
  progress: number;
  remainingSeconds: number;
};
