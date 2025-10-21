"use client";
import { type Trip } from "../types/trip";

interface Props {
	trips: Trip[];
	onSelectTrip?: ( index: number ) => void;
};

export const RegionPane = ( { onSelectTrip, trips }: Props ) => {

	return (
		<div className="p-4">
			<h2 className="mb-4 font-bold text-xl">旅行先リスト</h2>
			<ul className="space-y-5">
				{trips.map( ( trip, i ) => (
					<li key={ i } className="relative pb-3 border-gray-200 border-b">
						<button
							type="button"
							className="flex hover:bg-gray-100 px-2 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 w-full text-left transition"
							onClick={ () => onSelectTrip && onSelectTrip( i ) }
						>
							<span className="flex-grow">
								<span className="block font-semibold text-gray-900 text-base">{ trip.regionName }</span>
								<span className="block text-gray-400 text-xs">旅行日: { trip.startDate }</span>
								<span className="block text-gray-400 text-xs">参加: { trip.members.join(' ') }</span>
							</span>
							{ trip.photoUrl && (
								<span className="block ml-2 w-16 aspect-square shrink-0">
									<img
										className="rounded w-full h-full object-cover"
										src={ trip.photoUrl }
										alt=""
										loading="lazy"
									/>
								</span>
							) }
						</button>
					</li>
				) ) }
			</ul>
		</div>
	);
}
