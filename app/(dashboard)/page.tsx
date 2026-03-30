import { UserButton } from '@clerk/nextjs';

export default function Home() {
  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Finance Tracker</h1>
          <UserButton afterSignOutUrl="/" />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Welcome to your Dashboard!</h2>
          <p className="text-gray-600 mb-4">
            Your finance tracker is ready. Here are some features you can add:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>Add and track transactions</li>
            <li>Create budget categories</li>
            <li>View spending analytics</li>
            <li>Generate financial reports</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
