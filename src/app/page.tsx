import Image from "next/image";
import { parseTripsCsv } from "../utils/parseTripsCsv";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSU__UCrHii67L7H1WZYA4wFusCavOcJgyNNF9HsLFzhDAoBDG7Km1YE3qXGUaqHRDklZj63rRMm7yO/pub?output=csv";

// export default function Home() {
export default async function HomePage() {
	const res = await fetch( CSV_URL );
	const csvText = await res.text();
	const trips = parseTripsCsv( csvText );

	return (
		<div className="justify-items-center items-center gap-16 grid grid-rows-[20px_1fr_20px] p-8 sm:p-20 pb-20 min-h-screen font-[family-name:var(--font-geist-sans)]">
			<pre>
				{ JSON.stringify( trips, null, 2 ) }
			</pre>
			<main className="flex flex-col items-center sm:items-start gap-[32px] row-start-2">
				<Image
					className="dark:invert"
					src="/next.svg"
					alt="Next.js logo"
					width={180}
					height={38}
					priority
				/>
				<ol className="font-[family-name:var(--font-geist-mono)] text-sm/6 sm:text-left text-center list-decimal list-inside">
					<li className="mb-2 tracking-[-.01em]">
						Get started by editing{" "}
						<code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
							src/app/page.tsx
						</code>
						.
					</li>
					<li className="tracking-[-.01em]">
						Save and see your changes instantly.
					</li>
				</ol>

				<div className="flex sm:flex-row flex-col items-center gap-4">
					<a
						className="flex justify-center items-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] px-4 sm:px-5 border border-black/[.08] hover:border-transparent dark:border-white/[.145] border-solid rounded-full w-full sm:w-auto md:w-[158px] h-10 sm:h-12 font-medium text-sm sm:text-base transition-colors"
						href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
						target="_blank"
						rel="noopener noreferrer"
					>
						Read our docs
					</a>
				</div>
			</main>
			<footer className="flex flex-wrap justify-center items-center gap-[24px] row-start-3">
				<a
					className="flex items-center gap-2 hover:underline hover:underline-offset-4"
					href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Image
						aria-hidden
						src="/file.svg"
						alt="File icon"
						width={16}
						height={16}
					/>
					Learn
				</a>
				<a
					className="flex items-center gap-2 hover:underline hover:underline-offset-4"
					href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Image
						aria-hidden
						src="/window.svg"
						alt="Window icon"
						width={16}
						height={16}
					/>
					Examples
				</a>
				<a
					className="flex items-center gap-2 hover:underline hover:underline-offset-4"
					href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
					target="_blank"
					rel="noopener noreferrer"
				>
					<Image
						aria-hidden
						src="/globe.svg"
						alt="Globe icon"
						width={16}
						height={16}
					/>
					Go to nextjs.org →
				</a>
			</footer>
		</div>
	);
}
