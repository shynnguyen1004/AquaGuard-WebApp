import ReportIssueForm from "../components/reports/ReportIssueForm";
import FloodNewsFeed from "../components/reports/FloodNewsFeed";

export default function ReportsPage() {
  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-3">
            Reports & News
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl">
            Stay updated with the latest flood warnings from authorities and submit bug reports or feature suggestions to improve the application.
          </p>
        </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Left Column: News Feed (Takes up more space 7/12) */}
          <div className="lg:col-span-7 xl:col-span-8 order-2 lg:order-1">
            <FloodNewsFeed />
          </div>

          {/* Right Column: Report Form (Takes up less space 5/12) */}
          <div className="lg:col-span-5 xl:col-span-4 order-1 lg:order-2 sticky top-8">
            <ReportIssueForm />
          </div>

        </div>
      </div>
    </div>
  );
}
