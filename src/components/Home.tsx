"use client";
import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useMemo, useState } from "react";
import type { Trip } from "../types/trip";
// import { Globe3D } from "../components/Globe3D";
import { RegionPane } from "../components/RegionPane";

const Globe3D = dynamic( () => import( '../components/Globe3D' ).then( ( module ) => module.Globe3D ), {
	ssr: false,
} );

interface Props {
	trips: Trip[];
}

export const Home = ( { trips }: Props ) => {

	const [ selectedTripIndex, setSelectedTripIndex ] = useState<number | null>( null );

	const handleSelectTrip = ( index: number ) => {
		setSelectedTripIndex( index );
	};

	const selectedDestination = useMemo( () => {
		if ( selectedTripIndex === null ) return;

		const trip = trips[ selectedTripIndex ];
		if ( ! trip ) return;
		return trip.latLng;

	}, [ selectedTripIndex, trips ] );

	return (
		<div className="flex w-screen h-screen">
			<div className="flex-1 bg-neutral-900 min-w-0">
				{/*
					Globe3Dの再描画でContext LostするためSuspenseで囲む
					https://github.com/pmndrs/react-three-fiber/issues/3492#issuecomment-3276735439
				*/}
				<Suspense fallback={ null }>
					<Globe3D dest={ selectedDestination } />
				</Suspense>
			</div>
			<div className="bg-white border-gray-200 border-l w-64 overflow-y-auto region-pane shrink-0">
				<RegionPane trips={ trips } onSelectTrip={ handleSelectTrip } />
			</div>
		</div>
	);
}
