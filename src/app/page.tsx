import BuyerMapApp from './components/BuyerMapApp';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      {/* Demo Navigation */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          <Link 
            href="/demo-upload" 
            className="block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium text-sm transition-colors"
          >
            🎨 Demo Upload Design
          </Link>
          <Link 
            href="/demo-confidence" 
            className="block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium text-sm transition-colors"
          >
            📊 Demo Confidence
          </Link>
        </div>
      )}
      
      <BuyerMapApp />
    </>
  );
}