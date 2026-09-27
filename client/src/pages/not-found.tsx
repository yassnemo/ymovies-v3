import { ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-black">
      <div className="w-full max-w-[1400px] px-4 flex flex-col-reverse md:flex-row items-start md:items-center md:justify-between gap-8 md:gap-16">
        <div className="flex flex-col items-start text-left max-w-lg">
          <h1
            className="text-[4rem] md:text-[6rem] text-white tracking-tight leading-none"
            style={{ fontWeight: 900 }}
          >
            404
          </h1>
          <p className="text-gray-500 text-body mt-1">
            Error: redacted
          </p>
          <p className="text-gray-300 text-body leading-relaxed mt-5">
            This page could not be found. It either doesn&apos;t exist or was
            deleted. Or perhaps you don&apos;t exist and this webpage
            couldn&apos;t find you.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-1 text-red-500 hover:text-red-400 font-semibold transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
            Back to homepage
          </Link>
        </div>

        <div className="relative flex-shrink-0 w-full md:w-[580px] md:h-[580px]">
          <img
            src="/notFound.svg"
            alt="Lost in space"
            className="w-full h-full object-contain"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
