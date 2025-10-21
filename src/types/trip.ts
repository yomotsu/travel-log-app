export type LatLng = [ number, number ];

export type Hotel = {
  name?: string;
  nights: number;
};

export type Trip = {
  regionName: string;
  photoUrl: string;
  members: string[];
  startDate: string; // ISO形式
  cost?: number;
  hotels?: Hotel[];
  latLng: LatLng;
};
