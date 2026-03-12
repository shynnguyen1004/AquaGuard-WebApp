import ReportIssueForm from "../components/reports/ReportIssueForm";
import FloodNewsFeed from "../components/reports/FloodNewsFeed";

export default function ReportsPage() {
  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
            Reports & News
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Stay updated with the latest flood warnings from authorities and submit bug reports or feature suggestions to improve the application.
          </p>
        </div>

        {/* On mobile: stacked vertically (form first, then news). On desktop: 2-column. */}
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Report Form — on top on mobile, right side on desktop */}
          <div className="lg:col-span-5 xl:col-span-4 lg:order-2 lg:sticky lg:top-8">
            <ReportIssueForm />
          </div>

          {/* News Feed — below form on mobile, left side on desktop */}
          <div className="lg:col-span-7 xl:col-span-8 lg:order-1">
            <FloodNewsFeed />
          </div>

        </div>
      </div>
    </div>
  );
}
