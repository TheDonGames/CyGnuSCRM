import type { ReactNode } from 'react';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      </div>
      <div className="card p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 mb-4">
            {icon || <Construction className="h-8 w-8" />}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Module Ready for Implementation</h2>
          <p className="text-sm text-gray-500 max-w-md">
            This workspace has been scaffolded as part of the application shell. The layout, routing,
            and permission guards are fully wired. Business logic will be populated in an upcoming phase.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 justify-center">
            <span className="badge bg-gray-100 text-gray-600">Route Guarded</span>
            <span className="badge bg-gray-100 text-gray-600">Sidebar Wired</span>
            <span className="badge bg-gray-100 text-gray-600">Preview Anchor Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
}
