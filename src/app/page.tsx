import { parseTripsCsv } from "../utils/parseTripsCsv";
import { Home } from "../components/Home";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSU__UCrHii67L7H1WZYA4wFusCavOcJgyNNF9HsLFzhDAoBDG7Km1YE3qXGUaqHRDklZj63rRMm7yO/pub?output=csv";

export default async function HomePage() {
	const res = await fetch( CSV_URL );
	const csvText = await res.text();
	const trips = parseTripsCsv( csvText ).reverse();

	return (
		<Home trips={ Array.isArray( trips ) ? trips : [] } />
	);
}
