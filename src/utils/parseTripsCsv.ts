import { type Trip, Hotel, LatLng } from "../types/trip";

const __COMMA__ = '__COMMA__';
const __SEPARATOR__ = '__SEPARATOR__';
const AIR_PORT_DATA: Record<string, { latLng: LatLng }> = {
  // ヒースロー
  LHR: {
    latLng: [ 51.4775, -0.46139 ],
  },
  SFO: {
    latLng: [37.62131, -122.37896],
  },
  TSA: {
    latLng: [25.077731, 121.232822],
  },
  TPE: {
    latLng: [25.077731, 121.232822],
  },
  // チャンギ
  SIN: {
    latLng: [ 1.36442, 103.99153 ],
  },
  KUL: {
    latLng: [ 2.745578, 101.707222 ],
  },
  // 香港国際空港
  HKG: {
    latLng: [ 22.3088889, 113.914722 ],
  },
  // ホノルル国際空港
  HNL: {
    latLng: [ 21.3245132, -157.9250736 ],
  },
};

export function parseTripsCsv( csv: string ): Trip[] {

  // 1. 「"」内の「,」は__COMMA__に置換する
  // 2. 「"」内の改行は__SEPARATOR__に置換する
  const replacedCsv = csv.replace( /"(.*?)"/gs, ( _, p1 ) => {
    return `${ p1.replaceAll( ',', __COMMA__ ).replace( /\r?\n/g, __SEPARATOR__ ) }`;
  } );

  const lines = replacedCsv.trim().split( /\r?\n/ );
  const trips: Trip[] = [];

  for ( const line of lines.slice( 1 ) ) {

    const cols = line.split( ',' );
    const regionName = cols[ 0 ].replaceAll( __COMMA__, ',' );
    const photoUrl = cols[ 1 ].replaceAll( __COMMA__, ',' );
    const members = cols[ 2 ].split( __SEPARATOR__ ).map( s => s.replaceAll( __COMMA__, ',' ).trim() );
    const startDate = cols[ 3 ];
    const hotelNames = cols[ 4 ].split( __SEPARATOR__ ).map( s => s.replaceAll( __COMMA__, ',' ).trim() );
    const hotelNights = cols[ 5 ].split( __SEPARATOR__ ).map( s => parseInt( s.trim(), 10 ) );

    const hotels: Hotel[] = hotelNames.map( ( name, idx ) => ( {
      name,
      nights: hotelNights[idx] || 1,
    } ) );

    const airportCode = cols[ 6 ].trim();
    const latLng = AIR_PORT_DATA[ airportCode ]?.latLng || [ 0, 0 ];
    const trip: Trip = {
      regionName,
      photoUrl,
      members,
      startDate,
      hotels: hotels.length > 0 ? hotels : undefined,
      latLng,
    };
    trips.push( trip );

  }

  return trips;

}
